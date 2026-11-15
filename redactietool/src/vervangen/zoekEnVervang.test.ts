import { describe, expect, it } from 'vitest';
import type { VersInhoud } from '../bewerken/types';
import { knipVers } from '../bewerken/versknip';
import { leesBijbelbestanden } from '../formaat/bijbelbestanden.testhulp';
import { parseerHoofdstuk } from '../formaat/parseer';
import type { Tekststuk } from '../formaat/types';
import type { HoofdstukVerzen } from './types';
import { vervangInVers, zoekVondsten } from './zoekEnVervang';

const tekst = (tekst: string, opmaak: Tekststuk['opmaak'] = []): Tekststuk => ({ soort: 'tekst', tekst, opmaak });

function vers(...stukken: Tekststuk[]): VersInhoud {
	return { delen: [{ stijl: null, stukken }] };
}

function hoofdstuk(inhoud: VersInhoud[], goedgekeurd = false, nummer = 1): HoofdstukVerzen {
	return { hoofdstuk: nummer, goedgekeurd, verzen: inhoud.map((versInhoud, index) => ({ vers: index + 1, inhoud: versInhoud, repo: versInhoud })) };
}

function zoek(inhoud: VersInhoud, zoekterm: string) {
	return zoekVondsten([hoofdstuk([inhoud])], zoekterm);
}

describe('zoekVondsten', () => {
	it('vindt de zoekterm hoofdletterongevoelig en geeft de tekst zoals hij er staat', () => {
		const vondsten = zoek(vers(tekst('De Mensenzoon kwam. Toen kwam de mensenzoon weer.')), 'de mensenzoon');
		expect(vondsten.map((vondst) => [vondst.van, vondst.tot, vondst.gevonden])).toEqual([
			[0, 13, 'De Mensenzoon'],
			[30, 43, 'de mensenzoon'],
		]);
	});

	it('telt een letter voor of na de vondst als geen woordgrens', () => {
		const inhoud = vers(tekst('Zoon, zoons, bezoon, zoon.'));
		expect(zoek(inhoud, 'zoon').map((vondst) => vondst.van)).toEqual([0, 21]);
	});

	it('telt een letter met accent als letter', () => {
		const inhoud = vers(tekst('Zij gaven geen reden, ook geen redenë en één reden.'));
		expect(zoek(inhoud, 'reden').map((vondst) => vondst.van)).toEqual([15, 45]);
		expect(zoek(vers(tekst('één')), 'en')).toEqual([]);
		expect(zoek(vers(tekst('ëen en')), 'en').map((vondst) => vondst.van)).toEqual([4]);
	});

	it('vindt een zoekterm met tekens die in een patroon iets bijzonders zijn', () => {
		expect(zoek(vers(tekst('Wat (denk je)? Ja.')), '(denk je)?').map((vondst) => vondst.gevonden)).toEqual(['(denk je)?']);
	});

	it('vindt niets bij een lege zoekterm of een zoekterm van alleen witruimte', () => {
		const inhoud = vers(tekst('Een tekst met spaties.'));
		expect(zoek(inhoud, 'tekst')).toHaveLength(1);
		expect(zoek(inhoud, '')).toEqual([]);
		expect(zoek(inhoud, '  ')).toEqual([]);
	});

	it('geeft maximaal 40 tekens context voor en na de vondst, binnen het deel', () => {
		const lang = `${'a'.repeat(30)} ${'b'.repeat(30)} doel ${'c'.repeat(30)} ${'d'.repeat(30)}`;
		const [vondst] = zoek(vers(tekst(lang)), 'doel');
		expect(vondst?.ervoor).toBe(`${'a'.repeat(8)} ${'b'.repeat(30)} `);
		expect(vondst?.erna).toBe(` ${'c'.repeat(30)} ${'d'.repeat(8)}`);
		const [kort] = zoek(vers(tekst('Voor doel na')), 'doel');
		expect([kort?.ervoor, kort?.erna]).toEqual(['Voor ', ' na']);
	});

	it('zoekt in de platte tekst van het deel, over de stukken heen', () => {
		const [vondst] = zoek(vers(tekst('Hij zag de '), tekst('Mensen', ['cursief']), tekst('zoon komen')), 'mensenzoon');
		expect([vondst?.van, vondst?.tot]).toEqual([11, 21]);
	});

	it('zet de plek in een stuk zonder opmaak op vervangbaar', () => {
		const [vondst] = zoek(vers(tekst('Hij zag de Mensenzoon komen.')), 'de Mensenzoon');
		expect(vondst?.vervangbaar).toBe(true);
	});

	it('zet een vondst over een stukgrens op niet vervangbaar', () => {
		const [vondst] = zoek(vers(tekst('Hij zag de '), tekst('Mensenzoon', ['vet']), tekst(' komen.')), 'de Mensenzoon');
		expect(vondst).toMatchObject({ gevonden: 'de Mensenzoon', vervangbaar: false });
	});

	it('zet een vondst die precies een heel gemarkeerd stuk beslaat op niet vervangbaar', () => {
		const [vondst] = zoek(vers(tekst('Hij zag '), tekst('de Mensenzoon', ['vet']), tekst(' komen.')), 'de Mensenzoon');
		expect(vondst?.vervangbaar).toBe(false);
	});

	it('houdt een vondst binnen een gemarkeerd stuk vervangbaar als er meer van het stuk overblijft', () => {
		const [vondst] = zoek(vers(tekst('Hij zag '), tekst('de Mensenzoon zelf', ['vet']), tekst(' komen.')), 'de Mensenzoon');
		expect(vondst?.vervangbaar).toBe(true);
	});

	it('houdt een heel stuk zonder opmaak vervangbaar', () => {
		const [vondst] = zoek(vers(tekst('de Mensenzoon')), 'de Mensenzoon');
		expect(vondst?.vervangbaar).toBe(true);
	});

	it('zet hoofdstuk, vers, deel en goedgekeurd uit de invoer en sorteert op hoofdstuk, vers, deel en positie', () => {
		const tweeDelen: VersInhoud = {
			delen: [
				{ stijl: null, stukken: [tekst('x zoon x zoon')] },
				{ stijl: 'jezus', stukken: [tekst('zoon')] },
			],
		};
		const vondsten = zoekVondsten(
			[hoofdstuk([vers(tekst('Geen.')), tweeDelen], true, 4), hoofdstuk([vers(tekst('zoon'))], false, 7)],
			'zoon',
		);
		expect(vondsten.map(({ hoofdstuk, vers, deel, van, goedgekeurd }) => [hoofdstuk, vers, deel, van, goedgekeurd])).toEqual([
			[4, 2, 0, 2, true],
			[4, 2, 0, 9, true],
			[4, 2, 1, 0, true],
			[7, 1, 0, 0, false],
		]);
	});
});

describe('vervangInVers', () => {
	it('vervangt de vondst en laat de rest van het vers gelijk', () => {
		const inhoud = vers(tekst('Hij zag '), tekst('de genade', ['genade']), tekst(' en de Mensenzoon komen.'));
		const vondsten = zoek(inhoud, 'de Mensenzoon');
		expect(vondsten).toHaveLength(1);
		expect(vervangInVers(inhoud, vondsten, 'de Zoon van de mens')).toEqual(
			vers(tekst('Hij zag '), tekst('de genade', ['genade']), tekst(' en de Zoon van de mens komen.')),
		);
	});

	it('geeft de nieuwe tekst de opmaak van het stuk waarin de vondst stond', () => {
		const inhoud = vers(tekst('Hij zei: '), tekst('Wie is de Mensenzoon zelf?', ['vet', 'cursief']), tekst(' Niemand.'));
		const vondsten = zoek(inhoud, 'de Mensenzoon');
		expect(vervangInVers(inhoud, vondsten, 'de Zoon van de mens')).toEqual(
			vers(tekst('Hij zei: '), tekst('Wie is de Zoon van de mens zelf?', ['vet', 'cursief']), tekst(' Niemand.')),
		);
	});

	it('vervangt meerdere vondsten in één deel, van achter naar voren', () => {
		const inhoud = vers(tekst('Zoon en zoon. '), tekst('Nog een Zoon.', ['vet']));
		const vondsten = zoek(inhoud, 'zoon');
		expect(vondsten).toHaveLength(3);
		expect(vervangInVers(inhoud, vondsten, 'kind van God')).toEqual(
			vers(tekst('Kind van God en kind van God. '), tekst('Nog een kind van God.', ['vet'])),
		);
	});

	it('vervangt in elk deel van het vers en houdt de alineastijl', () => {
		const inhoud: VersInhoud = {
			delen: [
				{ stijl: null, stukken: [tekst('Een zoon.')] },
				{ stijl: 'jezus', stukken: [tekst('Nog een zoon.')] },
			],
		};
		expect(vervangInVers(inhoud, zoek(inhoud, 'zoon'), 'dochter')).toEqual({
			delen: [
				{ stijl: null, stukken: [tekst('Een dochter.')] },
				{ stijl: 'jezus', stukken: [tekst('Nog een dochter.')] },
			],
		});
	});

	it('geeft de nieuwe tekst een hoofdletter aan het begin van een zin, en laat hem verder letterlijk', () => {
		const inhoud = vers(tekst('De Mensenzoon kwam. Zo kwam de Mensenzoon. “De Mensenzoon!”'));
		expect(vervangInVers(inhoud, zoek(inhoud, 'de mensenzoon'), 'de Zoon van de mens')).toEqual(
			vers(tekst('De Zoon van de mens kwam. Zo kwam de Zoon van de mens. “De Zoon van de mens!”')),
		);
	});

	it('houdt de kleine letter van de nieuwe tekst midden in een zin, ook als de vondst een hoofdletter had', () => {
		const inhoud = vers(tekst('Zij dankten God voor alles.'));
		expect(vervangInVers(inhoud, zoek(inhoud, 'god'), 'de Heer')).toEqual(vers(tekst('Zij dankten de Heer voor alles.')));
	});

	it('laat vondsten die niet vervangbaar zijn staan', () => {
		const inhoud = vers(
			tekst('Hij zag de '),
			tekst('Mensenzoon', ['vet']),
			tekst(' en '),
			tekst('de Mensenzoon', ['vet']),
			tekst(' en de Mensenzoon.'),
		);
		const vondsten = zoek(inhoud, 'de Mensenzoon');
		expect(vondsten.map((vondst) => vondst.vervangbaar)).toEqual([false, false, true]);
		expect(vervangInVers(inhoud, vondsten, 'X')).toEqual(
			vers(tekst('Hij zag de '), tekst('Mensenzoon', ['vet']), tekst(' en '), tekst('de Mensenzoon', ['vet']), tekst(' en X.')),
		);
	});

	it('negeert vondsten met een plek of tekst die niet in dit vers staat', () => {
		const inhoud = vers(tekst('Een zoon.'));
		const [vondst] = zoek(vers(tekst('Een zoon hier.')), 'zoon');
		if (vondst === undefined) throw new Error('Geen vondst om mee te testen.');
		const buitenDeel = { ...vondst, deel: 1 };
		const anderePlek = { ...vondst, van: 5, tot: 9 };
		const anderTekst = { ...vondst, gevonden: 'zoontje' };
		expect(vervangInVers(inhoud, [buitenDeel, anderePlek, anderTekst], 'dochter')).toEqual(inhoud);
	});

	it('wijzigt de invoer niet', () => {
		const inhoud = vers(tekst('Een zoon.'));
		const uitkomst = vervangInVers(inhoud, zoek(inhoud, 'zoon'), 'dochter');
		expect(uitkomst).toEqual(vers(tekst('Een dochter.')));
		expect(inhoud).toEqual(vers(tekst('Een zoon.')));
	});
});

describe('op de vereenvoudiging van Lukas', () => {
	/** Telt in de ruwe bestandstekst, per regel: opmaaktags weg, titelregels niet. */
	function tellingInRuweTekst(bestandstekst: string): number {
		return bestandstekst
			.split('\n')
			.filter((regel) => !regel.startsWith('#'))
			.map((regel) => regel.replace(/\{\/?[a-z-]+\}|==/gu, ''))
			.reduce((totaal, regel) => totaal + (regel.match(/(?<!\p{L})de Mensenzoon(?!\p{L})/giu)?.length ?? 0), 0);
	}

	it('geeft evenveel vondsten voor "de Mensenzoon" als een telling op de ruwe tekst', () => {
		const bestanden = leesBijbelbestanden().filter((bestand) => bestand.naam.startsWith('vereenvoudigd/'));
		const verwacht = bestanden.reduce((totaal, bestand) => totaal + tellingInRuweTekst(bestand.tekst), 0);
		expect(verwacht).toBeGreaterThan(10);

		const hoofdstukken = bestanden.map((bestand): HoofdstukVerzen => {
			const geparseerd = parseerHoofdstuk(bestand.tekst);
			const nummers = geparseerd.alineas.flatMap((alinea) =>
				alinea.soort === 'tekst' ? alinea.stukken.flatMap((stuk) => (stuk.soort === 'vers' ? [stuk.nummer] : [])) : [],
			);
			const verzen = [...new Set(nummers)].flatMap((nummer) => {
				const inhoud = knipVers(geparseerd, nummer);
				return inhoud === null ? [] : [{ vers: nummer, inhoud, repo: inhoud }];
			});
			return { hoofdstuk: Number(/(\d+)\.md$/u.exec(bestand.naam)?.[1]), goedgekeurd: false, verzen };
		});

		expect(zoekVondsten(hoofdstukken, 'de Mensenzoon')).toHaveLength(verwacht);
	});
});
