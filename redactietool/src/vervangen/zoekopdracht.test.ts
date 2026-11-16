import { describe, expect, it } from 'vitest';
import type { VersInhoud } from '../bewerken/types';
import type { VersRef } from '../data/types';
import type { Domein, Tekststuk } from '../formaat/types';
import { leesVereenvoudigdeHoofdstukken } from './lukasverzen.testhulp';
import type { HoofdstukVerzen } from './types';
import { domeinenOpZoekterm, wijzigVers, zoekPlekken } from './zoekopdracht';
import type { Bereik, Plek, Zoekopdracht } from './zoekopdracht';

const tekst = (tekst: string, opmaak: Tekststuk['opmaak'] = []): Tekststuk => ({ soort: 'tekst', tekst, opmaak });

function vers(...stukken: Tekststuk[]): VersInhoud {
	return { delen: [{ stijl: null, stukken }] };
}

/** Elk vers een eigen nummer (1, 2, ...) in hoofdstuk 1. */
function hoofdstuk(inhoud: VersInhoud[]): HoofdstukVerzen {
	return { hoofdstuk: 1, goedgekeurd: false, verzen: inhoud.map((versInhoud, index) => ({ vers: index + 1, inhoud: versInhoud, repo: versInhoud })) };
}

const HELE_BOEK: Bereik = { soort: 'boek' };

function markering(zoekterm: string, van: Domein, naar: Domein, bereik: Bereik = HELE_BOEK): Zoekopdracht {
	return { soort: 'markering', zoekterm, van, naar, bereik };
}

function tekstopdracht(zoekterm: string, nieuw: string, bereik: Bereik = HELE_BOEK): Zoekopdracht {
	return { soort: 'tekst', zoekterm, nieuw, bereik };
}

function plekkenIn(inhoud: VersInhoud, opdracht: Zoekopdracht): Plek[] {
	return zoekPlekken([hoofdstuk([inhoud])], opdracht);
}

const gevondenEnVariant = (plekken: readonly Plek[]) => plekken.map((plek) => [plek.gevonden, plek.variant]);

const geenVervangingen = new Map<string, string>();

/** Eén teken met zijn opmaak, zodat een test de opmaak los van de verdeling in stukken vergelijkt. */
function opmaakPerTeken(inhoud: VersInhoud): string[][] {
	return inhoud.delen.map((deel) => deel.stukken.flatMap((stuk) => [...stuk.tekst].map((teken) => `${teken}|${stuk.opmaak.join(' ')}`)));
}

const platteTekstVan = (inhoud: VersInhoud) => inhoud.delen.map((deel) => deel.stukken.map((stuk) => stuk.tekst).join(''));

describe('zoekPlekken met een markering', () => {
	const eeuwigNaarGenade = markering('gezegend', 'eeuwigleven', 'genade');

	it('vindt een woord dat precies de markering heeft als vervangbare plek zonder variant', () => {
		const plekken = plekkenIn(vers(tekst('Hij is '), tekst('gezegend', ['eeuwigleven']), tekst('.')), eeuwigNaarGenade);
		expect(plekken).toHaveLength(1);
		expect(plekken[0]).toMatchObject({ gevonden: 'gezegend', vervangbaar: true, variant: null });
	});

	it('laat het woord zonder markering of met een ander domein buiten de plekken', () => {
		const inhoud = vers(tekst('Gezegend '), tekst('gezegend', ['genade']), tekst(' en '), tekst('gezegend', ['onderwijs']));
		expect(plekkenIn(inhoud, eeuwigNaarGenade)).toEqual([]);
	});

	it('houdt een plek vervangbaar als de markering meer dekt dan het woord', () => {
		const [plek] = plekkenIn(vers(tekst('Een '), tekst('gezegend volk', ['eeuwigleven'])), eeuwigNaarGenade);
		expect(plek).toMatchObject({ gevonden: 'gezegend', vervangbaar: true });
	});

	it('zet een plek die maar voor een deel de markering heeft op niet vervangbaar', () => {
		const [plek] = plekkenIn(vers(tekst('r'), tekst('edding', ['eeuwigleven'])), markering('redding', 'eeuwigleven', 'genade'));
		expect(plek).toMatchObject({ gevonden: 'redding', vervangbaar: false });
	});

	it('houdt een plek vervangbaar als de markering over een stukgrens loopt en elk deel de markering heeft', () => {
		const [plek] = plekkenIn(vers(tekst('Geze', ['vet', 'eeuwigleven']), tekst('gend', ['eeuwigleven'])), eeuwigNaarGenade);
		expect(plek).toMatchObject({ gevonden: 'Gezegend', vervangbaar: true });
	});

	it('zet een plek over een stukgrens waarvan één deel de markering mist op niet vervangbaar', () => {
		const [plek] = plekkenIn(vers(tekst('Geze', ['vet']), tekst('gend', ['eeuwigleven'])), eeuwigNaarGenade);
		expect(plek).toMatchObject({ gevonden: 'Gezegend', vervangbaar: false });
	});

	it('houdt de context en de positie van de plek zoals bij zoeken', () => {
		const [plek] = plekkenIn(vers(tekst('Hij is '), tekst('gezegend', ['eeuwigleven']), tekst(' nu.')), eeuwigNaarGenade);
		expect(plek).toMatchObject({ hoofdstuk: 1, vers: 1, deel: 0, van: 7, tot: 15, ervoor: 'Hij is ', erna: ' nu.', goedgekeurd: false });
	});
});

describe('zoekPlekken met een tekstopdracht', () => {
	it('vindt de zoekterm en laat de vervangbaarheid van zoeken en vervangen zoals ze is', () => {
		const inhoud = vers(tekst('Een gezegend '), tekst('gezegend', ['vet']), tekst(' en '), tekst('gezegend', ['genade']), tekst(' en gezegend.'));
		const plekken = plekkenIn(inhoud, tekstopdracht('gezegend', 'gelukkig'));
		expect(plekken.map((plek) => [plek.vervangbaar, plek.variant])).toEqual([
			[true, null],
			[false, null],
			[false, null],
			[true, null],
		]);
	});

	it('geeft de zoekterm met een hoofdletter aan het begin van een zin geen variant', () => {
		const plekken = plekkenIn(vers(tekst('Gezegend zijn zij.')), tekstopdracht('gezegend', 'gelukkig'));
		expect(gevondenEnVariant(plekken)).toEqual([['Gezegend', null]]);
	});
});

describe('zoekPlekken binnen het bereik', () => {
	const hoofdstukken = [
		{ ...hoofdstuk([vers(tekst('gezegend')), vers(tekst('gezegend')), vers(tekst('gezegend'))]), hoofdstuk: 1 },
		{ ...hoofdstuk([vers(tekst('gezegend')), vers(tekst('gezegend'))]), hoofdstuk: 2 },
	];
	const verzen = (...refs: VersRef[]): Bereik => ({ soort: 'verzen', verzen: refs });

	it('zoekt in het hele boek bij het bereik boek', () => {
		expect(zoekPlekken(hoofdstukken, tekstopdracht('gezegend', 'x')).map((plek) => [plek.hoofdstuk, plek.vers])).toEqual([
			[1, 1],
			[1, 2],
			[1, 3],
			[2, 1],
			[2, 2],
		]);
	});

	it('zoekt alleen in de verzen van de vraag', () => {
		const bereik = verzen({ hoofdstuk: 1, vers: 2 }, { hoofdstuk: 2, vers: 1 });
		expect(zoekPlekken(hoofdstukken, tekstopdracht('gezegend', 'x', bereik)).map((plek) => [plek.hoofdstuk, plek.vers])).toEqual([
			[1, 2],
			[2, 1],
		]);
	});

	it('zoekt niets bij een vers dat niet bestaat', () => {
		expect(zoekPlekken(hoofdstukken, tekstopdracht('gezegend', 'x', verzen({ hoofdstuk: 3, vers: 1 })))).toEqual([]);
	});

	it('zoekt ook de varianten alleen binnen het bereik', () => {
		const metVarianten = [hoofdstuk([vers(tekst('de gezegenden')), vers(tekst('de gezegenden'))])];
		const plekken = zoekPlekken(metVarianten, tekstopdracht('gezegend', 'x', verzen({ hoofdstuk: 1, vers: 2 })));
		expect(plekken.map((plek) => [plek.vers, plek.variant])).toEqual([[2, 'de gezegenden']]);
	});
});

describe('zoekPlekken met varianten', () => {
	const variantenVan = (zoekterm: string, tekstVers: string) => gevondenEnVariant(plekkenIn(vers(tekst(tekstVers)), tekstopdracht(zoekterm, 'x')));

	it('vindt een ander, geen of extra lidwoord of bezittelijk woord bij een zoekterm met lidwoord', () => {
		expect(variantenVan('de discipel', 'De discipel kwam. Een discipel, zijn discipel, discipel en onze Discipel.')).toEqual([
			['De discipel', null],
			['Een discipel', 'een discipel'],
			['zijn discipel', 'zijn discipel'],
			['discipel', 'discipel'],
			['onze Discipel', 'onze discipel'],
		]);
	});

	it('laat bij een zoekterm zonder lidwoord het woord met lidwoord bij de hoofdvorm horen', () => {
		expect(variantenVan('discipel', 'De discipel kwam met zijn discipel.')).toEqual([
			['discipel', null],
			['discipel', null],
		]);
	});

	it('vindt het meervoud en andere uitgangen, met of zonder lidwoord', () => {
		expect(variantenVan('discipel', 'Discipelen, de discipelen, discipels en discipeltje.')).toEqual([
			['Discipelen', 'discipelen'],
			['de discipelen', 'de discipelen'],
			['discipels', 'discipels'],
			['discipeltje', 'discipeltje'],
		]);
	});

	it('telt een apostrof als woordgrens: het woord voor de apostrof is de hoofdvorm', () => {
		expect(variantenVan('discipel', 'Discipel’s en discipel\'s.')).toEqual([
			['Discipel', null],
			['discipel', null],
		]);
	});

	it('vindt eër en eën als elkaars vorm', () => {
		expect(variantenVan('Farizeeër', 'De Farizeeën en een Farizeeër.')).toEqual([
			['De Farizeeën', 'de farizeeën'],
			['Farizeeër', null],
		]);
		expect(variantenVan('Farizeeën', 'Een Farizeeër en de Farizeeën.')).toEqual([
			['Een Farizeeër', 'een farizeeër'],
			['Farizeeën', null],
		]);
	});

	it('eist een woordgrens voor en na de variant', () => {
		expect(variantenVan('discipel', 'Ondiscipelen, discipelenkamp, discipelx en xdiscipel.')).toEqual([]);
	});

	it('zoekt geen varianten bij een hoofdwoord van minder dan vier letters', () => {
		expect(variantenVan('God', 'God, de God, Gods, Goden en een God.')).toEqual([
			['God', null],
			['God', null],
			['God', null],
		]);
		expect(variantenVan('de God', 'De God, een God en Gods.')).toEqual([['De God', null]]);
		expect(variantenVan('zoon', 'De zoon, een zoon en zoons.')).toEqual([
			['zoon', null],
			['zoon', null],
			['zoons', 'zoons'],
		]);
	});

	it('zoekt bij een zoekterm van meer woorden alleen varianten met een ander lidwoord', () => {
		expect(variantenVan('de Zoon van God', 'De Zoon van God, een Zoon van God, zoon van God, Zonen van God.')).toEqual([
			['De Zoon van God', null],
			['een Zoon van God', 'een zoon van god'],
			['zoon van God', 'zoon van god'],
		]);
	});

	it('geeft elke plek één keer: nooit een hoofdvorm die ook een variant is', () => {
		const plekken = plekkenIn(vers(tekst('de Mensenzoon, een mensenzoon en Mensenzoons.')), tekstopdracht('de Mensenzoon', 'x'));
		expect(plekken.map((plek) => [plek.van, plek.tot, plek.variant])).toEqual([
			[0, 13, null],
			[15, 29, 'een mensenzoon'],
			[33, 44, 'mensenzoons'],
		]);
	});

	it('vindt varianten ook bij een markering, alleen waar de markering ligt', () => {
		const inhoud = vers(tekst('de ', []), tekst('gezegenden', ['eeuwigleven']), tekst(' en gezegende.'));
		const plekken = plekkenIn(inhoud, markering('gezegend', 'eeuwigleven', 'genade'));
		expect(plekken.map((plek) => [plek.gevonden, plek.variant, plek.vervangbaar])).toEqual([['de gezegenden', 'de gezegenden', false]]);
	});

	it('vindt de variant van een gemarkeerd woord als de markering het hele woord dekt', () => {
		const inhoud = vers(tekst('Zij waren '), tekst('gezegende', ['eeuwigleven']), tekst(' mensen.'));
		const plekken = plekkenIn(inhoud, markering('gezegend', 'eeuwigleven', 'genade'));
		expect(plekken.map((plek) => [plek.gevonden, plek.variant, plek.vervangbaar])).toEqual([['gezegende', 'gezegende', true]]);
	});
});

describe('wijzigVers met tekst', () => {
	const inhoud = vers(tekst('De discipel kwam met een discipel en de discipelen. Discipelen volgden.'));
	const opdracht = tekstopdracht('de discipel', 'de leerling');
	const plekken = plekkenIn(inhoud, opdracht);

	it('vervangt de hoofdvorm door de nieuwe tekst en laat varianten zonder vervanging staan', () => {
		expect(gevondenEnVariant(plekken)).toEqual([
			['De discipel', null],
			['een discipel', 'een discipel'],
			['de discipelen', 'de discipelen'],
			['Discipelen', 'discipelen'],
		]);
		expect(platteTekstVan(wijzigVers(inhoud, plekken, opdracht, geenVervangingen))).toEqual(['De leerling kwam met een discipel en de discipelen. Discipelen volgden.']);
	});

	it('vervangt een variant door de vervanging voor die vorm, met hoofdletter aan het begin van een zin', () => {
		const vervangingen = new Map([
			['een discipel', 'een leerling'],
			['de discipelen', 'de leerlingen'],
			['discipelen', 'leerlingen'],
		]);
		expect(platteTekstVan(wijzigVers(inhoud, plekken, opdracht, vervangingen))).toEqual(['De leerling kwam met een leerling en de leerlingen. Leerlingen volgden.']);
	});

	it('slaat een variant met een lege vervanging over', () => {
		const vervangingen = new Map([
			['een discipel', ''],
			['de discipelen', 'de leerlingen'],
		]);
		expect(platteTekstVan(wijzigVers(inhoud, plekken, opdracht, vervangingen))).toEqual(['De leerling kwam met een discipel en de leerlingen. Discipelen volgden.']);
	});

	it('past alleen vervangbare plekken toe', () => {
		const metVet = vers(tekst('Hij zag '), tekst('Mensenzoon', ['vet']), tekst(' en de Mensenzoon.'));
		const metVetOpdracht = tekstopdracht('de Mensenzoon', 'X');
		const metVetPlekken = plekkenIn(metVet, tekstopdracht('Mensenzoon', 'X'));
		expect(metVetPlekken.map((plek) => plek.vervangbaar)).toEqual([false, true]);
		expect(wijzigVers(metVet, metVetPlekken, metVetOpdracht, geenVervangingen)).toEqual(vers(tekst('Hij zag '), tekst('Mensenzoon', ['vet']), tekst(' en de X.')));
	});

	it('laat het vers ongewijzigd zonder plekken en wijzigt de invoer niet', () => {
		const kopie = structuredClone(inhoud);
		expect(wijzigVers(inhoud, [], opdracht, geenVervangingen)).toEqual(inhoud);
		wijzigVers(inhoud, plekken, opdracht, new Map([['een discipel', 'een leerling']]));
		expect(inhoud).toEqual(kopie);
	});
});

describe('wijzigVers met een markering', () => {
	const eeuwigNaarGenade = markering('gezegend', 'eeuwigleven', 'genade');

	it('zet de markering van de plek om en laat tekst en rest van het vers gelijk', () => {
		const inhoud = vers(tekst('Hij is '), tekst('gezegend', ['eeuwigleven']), tekst(' en blij.'));
		const plekken = plekkenIn(inhoud, eeuwigNaarGenade);
		expect(wijzigVers(inhoud, plekken, eeuwigNaarGenade, geenVervangingen)).toEqual(vers(tekst('Hij is '), tekst('gezegend', ['genade']), tekst(' en blij.')));
	});

	it('knipt een stuk waar de markering meer dekt dan het woord en zet alleen het woord om', () => {
		const inhoud = vers(tekst('Een '), tekst('gezegend volk', ['eeuwigleven']), tekst(' komt.'));
		const resultaat = wijzigVers(inhoud, plekkenIn(inhoud, eeuwigNaarGenade), eeuwigNaarGenade, geenVervangingen);
		expect(resultaat).toEqual(vers(tekst('Een '), tekst('gezegend', ['genade']), tekst(' volk', ['eeuwigleven']), tekst(' komt.')));
	});

	it('laat vet en onderwijs bij het omgezette woord staan, in de volgorde van het formaat', () => {
		const inhoud = vers(tekst('Gezegend', ['onderwijs', 'vet', 'eeuwigleven']), tekst(' zijn zij.', ['onderwijs']));
		const resultaat = wijzigVers(inhoud, plekkenIn(inhoud, eeuwigNaarGenade), eeuwigNaarGenade, geenVervangingen);
		expect(resultaat).toEqual(vers(tekst('Gezegend', ['onderwijs', 'vet', 'genade']), tekst(' zijn zij.', ['onderwijs'])));
	});

	it('zet een plek over een stukgrens in beide delen om en houdt de opmaak van elk deel', () => {
		const inhoud = vers(tekst('Geze', ['vet', 'eeuwigleven']), tekst('gend', ['eeuwigleven']));
		const resultaat = wijzigVers(inhoud, plekkenIn(inhoud, eeuwigNaarGenade), eeuwigNaarGenade, geenVervangingen);
		expect(resultaat).toEqual(vers(tekst('Geze', ['vet', 'genade']), tekst('gend', ['genade'])));
	});

	it('zet ook een variant om zonder eigen invoer', () => {
		const inhoud = vers(tekst('Zij waren '), tekst('gezegende', ['eeuwigleven']), tekst(' mensen.'));
		const resultaat = wijzigVers(inhoud, plekkenIn(inhoud, eeuwigNaarGenade), eeuwigNaarGenade, geenVervangingen);
		expect(resultaat).toEqual(vers(tekst('Zij waren '), tekst('gezegende', ['genade']), tekst(' mensen.')));
	});

	it('laat een plek die maar voor een deel de markering heeft staan', () => {
		const inhoud = vers(tekst('r'), tekst('edding', ['eeuwigleven']));
		const opdracht = markering('redding', 'eeuwigleven', 'genade');
		const plekken = plekkenIn(inhoud, opdracht);
		expect(plekken).toHaveLength(1);
		expect(wijzigVers(inhoud, plekken, opdracht, geenVervangingen)).toEqual(inhoud);
	});

	it('laat een plek staan waarvan de tekst sinds het zoeken veranderd is', () => {
		const gezocht = vers(tekst('gezegend', ['eeuwigleven']));
		const gewijzigd = vers(tekst('gelukkig', ['eeuwigleven']));
		expect(wijzigVers(gewijzigd, plekkenIn(gezocht, eeuwigNaarGenade), eeuwigNaarGenade, geenVervangingen)).toEqual(gewijzigd);
	});

	it('zet meerdere plekken in meerdere delen om en laat de alineastijl staan', () => {
		const inhoud: VersInhoud = {
			delen: [
				{ stijl: 'jezus', stukken: [tekst('Gezegend', ['eeuwigleven']), tekst(' en '), tekst('gezegend', ['eeuwigleven'])] },
				{ stijl: null, stukken: [tekst('gezegend', ['eeuwigleven'])] },
			],
		};
		expect(wijzigVers(inhoud, plekkenIn(inhoud, eeuwigNaarGenade), eeuwigNaarGenade, geenVervangingen)).toEqual({
			delen: [
				{ stijl: 'jezus', stukken: [tekst('Gezegend', ['genade']), tekst(' en '), tekst('gezegend', ['genade'])] },
				{ stijl: null, stukken: [tekst('gezegend', ['genade'])] },
			],
		});
	});
});

describe('domeinenOpZoekterm', () => {
	const hoofdstukken = [
		hoofdstuk([
			vers(tekst('gezegend', ['genade'])),
			vers(tekst('gezegend', ['eeuwigleven'])),
			vers(tekst('gezegend')),
			vers(tekst('gezegend', ['genade'])),
			vers(tekst('gezegend', ['onderwijs'])),
			vers(tekst('Geze', ['geloof']), tekst('gend', ['vet', 'oordeel'])),
		]),
	];

	it('geeft de domeinen op de treffers zonder dubbele, in de volgorde van de domeinen', () => {
		expect(domeinenOpZoekterm(hoofdstukken, 'gezegend', HELE_BOEK)).toEqual(['eeuwigleven', 'genade', 'geloof', 'oordeel']);
	});

	it('kijkt alleen binnen het bereik', () => {
		const bereik: Bereik = { soort: 'verzen', verzen: [{ hoofdstuk: 1, vers: 1 }, { hoofdstuk: 1, vers: 4 }] };
		expect(domeinenOpZoekterm(hoofdstukken, 'gezegend', bereik)).toEqual(['genade']);
	});

	it('geeft niets als de treffers geen domein hebben of er geen treffers zijn', () => {
		expect(domeinenOpZoekterm(hoofdstukken, 'gezegend', { soort: 'verzen', verzen: [{ hoofdstuk: 1, vers: 3 }] })).toEqual([]);
		expect(domeinenOpZoekterm(hoofdstukken, 'onbekend', HELE_BOEK)).toEqual([]);
	});
});

describe('op de vereenvoudiging van Lukas: Gezegend van eeuwigleven naar genade', () => {
	const vragenverzen: VersRef[] = [
		{ hoofdstuk: 1, vers: 45 },
		{ hoofdstuk: 1, vers: 48 },
		...[20, 21, 22].map((vers) => ({ hoofdstuk: 6, vers })),
		{ hoofdstuk: 7, vers: 23 },
		{ hoofdstuk: 11, vers: 27 },
		{ hoofdstuk: 11, vers: 28 },
		{ hoofdstuk: 12, vers: 43 },
		{ hoofdstuk: 14, vers: 14 },
		{ hoofdstuk: 14, vers: 15 },
	];
	const bereik: Bereik = { soort: 'verzen', verzen: vragenverzen };
	const opdracht = markering('Gezegend', 'eeuwigleven', 'genade', bereik);
	const hoofdstukken = leesVereenvoudigdeHoofdstukken();
	const plekken = zoekPlekken(hoofdstukken, opdracht);
	const naam = (plek: Plek) => `${plek.hoofdstuk}:${plek.vers}`;

	it('geeft precies de tien vervangbare plekken met de markering eeuwigleven', () => {
		expect(plekken.map(naam)).toEqual(['6:20', '6:21', '6:21', '6:22', '7:23', '11:27', '11:28', '12:43', '14:14', '14:15']);
		expect(plekken.every((plek) => plek.vervangbaar && plek.variant === null)).toBe(true);
	});

	it('raakt het ongemarkeerde gezegend in 11:27 niet', () => {
		const vers1127 = hoofdstukken.find((hoofdstuk) => hoofdstuk.hoofdstuk === 11)?.verzen.find((vers) => vers.vers === 27);
		const platteTekst = vers1127?.inhoud.delen.map((deel) => deel.stukken.map((stuk) => stuk.tekst).join('')).join('') ?? '';
		expect(platteTekst.match(/gezegend/giu)).toHaveLength(2);
		expect(plekken.filter((plek) => naam(plek) === '11:27')).toHaveLength(1);
	});

	it('geeft genade aan die woorden en verandert verder niets in de verzen', () => {
		const metPlekken = vragenverzen.filter((ref) => plekken.some((plek) => plek.hoofdstuk === ref.hoofdstuk && plek.vers === ref.vers));
		expect(metPlekken).toHaveLength(9);
		for (const ref of metPlekken) {
			const vers = hoofdstukken.find((hoofdstuk) => hoofdstuk.hoofdstuk === ref.hoofdstuk)?.verzen.find((kandidaat) => kandidaat.vers === ref.vers);
			if (vers === undefined) throw new Error(`Vers ${ref.hoofdstuk}:${ref.vers} ontbreekt.`);
			const resultaat = wijzigVers(vers.inhoud, plekken.filter((plek) => plek.hoofdstuk === ref.hoofdstuk && plek.vers === ref.vers), opdracht, geenVervangingen);

			// Verwacht: elk stuk eeuwigleven dat uit alleen "gezegend" bestaat, wordt genade; al het andere is gelijk aan het origineel.
			const verwacht = vers.inhoud.delen.map((deel) =>
				deel.stukken.flatMap((stuk) => {
					const wisselen = stuk.opmaak.includes('eeuwigleven') && stuk.tekst.toLowerCase() === 'gezegend';
					return [...stuk.tekst].map((teken) => `${teken}|${(wisselen ? stuk.opmaak.map((opmaak) => (opmaak === 'eeuwigleven' ? 'genade' : opmaak)) : stuk.opmaak).join(' ')}`);
				}),
			);
			expect(opmaakPerTeken(resultaat)).toEqual(verwacht);
			expect(platteTekstVan(resultaat)).toEqual(platteTekstVan(vers.inhoud));
			expect(resultaat.delen.map((deel) => deel.stijl)).toEqual(vers.inhoud.delen.map((deel) => deel.stijl));
			expect(resultaat.delen.flatMap((deel) => deel.stukken).some((stuk) => stuk.tekst.toLowerCase() === 'gezegend' && stuk.opmaak.includes('genade'))).toBe(true);
		}
	});

	it('geeft Gezegend op de verzen 1:45 en 1:48 de domeinen genade en eeuwigleven in de volgorde van het formaat', () => {
		expect(domeinenOpZoekterm(hoofdstukken, 'Gezegend', bereik)).toEqual(['eeuwigleven', 'genade']);
		expect(domeinenOpZoekterm(hoofdstukken, 'Gezegend', { soort: 'verzen', verzen: vragenverzen.slice(0, 2) })).toEqual(['genade']);
	});
});
