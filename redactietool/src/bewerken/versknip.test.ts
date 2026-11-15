import { describe, expect, it } from 'vitest';
import { leesBijbelbestanden } from '../formaat/bijbelbestanden.testhulp';
import { parseerHoofdstuk } from '../formaat/parseer';
import { serialiseerHoofdstuk } from '../formaat/serialiseer';
import type { Hoofdstuk, Tekststuk } from '../formaat/types';
import type { VersInhoud } from './types';
import { knipVers, vervangVers } from './versknip';

const tekst = (tekst: string, opmaak: Tekststuk['opmaak'] = []): Tekststuk => ({ soort: 'tekst', tekst, opmaak });

function versnummers(hoofdstuk: Hoofdstuk): number[] {
	return hoofdstuk.alineas.flatMap((alinea) =>
		alinea.soort === 'tekst' ? alinea.stukken.flatMap((stuk) => (stuk.soort === 'vers' ? [stuk.nummer] : [])) : [],
	);
}

function alsHoofdstuk(regels: string[]): Hoofdstuk {
	return parseerHoofdstuk(regels.map((regel) => `${regel}\n`).join(''));
}

describe('knipVers', () => {
	it('knipt een vers midden in een alinea, met de spaties zoals ze staan', () => {
		const hoofdstuk = alsHoofdstuk(['# Titel', '', '[1] Eerste zin. [2] Tweede zin. [3] Derde zin.']);
		expect(knipVers(hoofdstuk, 2)).toEqual({ delen: [{ stijl: null, stukken: [tekst(' Tweede zin. ')] }] });
	});

	it("knipt een vers dat over meer alinea's loopt in een deel per alinea, met de stijl van elke alinea", () => {
		const hoofdstuk = alsHoofdstuk([
			'[1] Begin.',
			'@jezus Hij zei: {genade}genade{/genade} voor allen.',
			'@god [2] Volgend vers.',
		]);
		expect(knipVers(hoofdstuk, 1)).toEqual({
			delen: [
				{ stijl: null, stukken: [tekst(' Begin.')] },
				{ stijl: 'jezus', stukken: [tekst('Hij zei: '), tekst('genade', ['genade']), tekst(' voor allen.')] },
			],
		});
	});

	it('knipt twee verzen in één alinea los van elkaar', () => {
		const hoofdstuk = alsHoofdstuk(['@jezus [4] Vier. [5] Vijf.']);
		expect(knipVers(hoofdstuk, 4)?.delen[0]?.stukken).toEqual([tekst(' Vier. ')]);
		expect(knipVers(hoofdstuk, 5)?.delen[0]?.stukken).toEqual([tekst(' Vijf.')]);
	});

	it('geeft een leeg deel voor een alinea die direct na het versnummer eindigt', () => {
		const hoofdstuk = alsHoofdstuk(['[1] Een. [2]']);
		expect(knipVers(hoofdstuk, 2)).toEqual({ delen: [{ stijl: null, stukken: [] }] });
	});

	it('geeft null voor een vers dat niet voorkomt', () => {
		expect(knipVers(alsHoofdstuk(['[1] Een.']), 7)).toBeNull();
	});
});

describe('vervangVers', () => {
	it('verandert alleen het gekozen vers', () => {
		const hoofdstuk = alsHoofdstuk(['# Titel', '', '[1] Een. [2] Twee. [3] Drie.', '@jezus Meer drie.']);
		const nieuw = vervangVers(hoofdstuk, 2, { delen: [{ stijl: null, stukken: [tekst(' Nieuw. ')] }] });
		expect(serialiseerHoofdstuk(nieuw)).toBe('# Titel\n\n[1] Een. [2] Nieuw. [3] Drie.\n@jezus Meer drie.\n');
		expect(serialiseerHoofdstuk(hoofdstuk)).toBe('# Titel\n\n[1] Een. [2] Twee. [3] Drie.\n@jezus Meer drie.\n');
	});

	it("zet de delen van een vers over twee alinea's op hun eigen alinea", () => {
		const hoofdstuk = alsHoofdstuk(['[1] Begin.', '@jezus Vervolg.', '[2] Twee.']);
		const nieuw = vervangVers(hoofdstuk, 1, {
			delen: [
				{ stijl: null, stukken: [tekst(' A.')] },
				{ stijl: 'jezus', stukken: [tekst('B '), tekst('c', ['onderstreept'])] },
			],
		});
		expect(serialiseerHoofdstuk(nieuw)).toBe('[1] A.\n@jezus B {onderstreept}c{/onderstreept}\n[2] Twee.\n');
	});

	it('voegt stukken met gelijke opmaak samen en laat lege stukken weg, zodat het resultaat geldig blijft', () => {
		const hoofdstuk = alsHoofdstuk(['[1] Een. [2] Twee.']);
		const nieuw = vervangVers(hoofdstuk, 1, {
			delen: [{ stijl: null, stukken: [tekst(' ', ['vet']), tekst('Hal', ['vet']), tekst('lo', ['vet']), tekst('', ['cursief']), tekst('.')] }],
		});
		const bestandstekst = serialiseerHoofdstuk(nieuw);
		expect(bestandstekst).toBe('[1]{vet} Hallo{/vet}.[2] Twee.\n');
		expect(parseerHoofdstuk(bestandstekst)).toEqual(nieuw);
	});

	it('gooit een Nederlandse fout bij een ongelijk aantal delen', () => {
		const hoofdstuk = alsHoofdstuk(['[1] Begin.', '@jezus Vervolg.']);
		expect(() => vervangVers(hoofdstuk, 1, { delen: [{ stijl: null, stukken: [tekst(' Alles.')] }] })).toThrow(
			/Vers 1 heeft 2 delen .* de nieuwe inhoud heeft er 1/,
		);
	});

	it('gooit een fout voor een onbekend vers', () => {
		expect(() => vervangVers(alsHoofdstuk(['[1] Een.']), 9, { delen: [] })).toThrow(/Vers 9 komt niet voor/);
	});

	it('weigert een regeleinde in de tekst', () => {
		const hoofdstuk = alsHoofdstuk(['[1] Een.']);
		expect(() => vervangVers(hoofdstuk, 1, { delen: [{ stijl: null, stukken: [tekst(' a\nb')] }] })).toThrow(/regeleinde/);
	});
});

describe('terugzettest op de bijbelbestanden', () => {
	const bestanden = leesBijbelbestanden();

	it('knippen en terugzetten laat elk vers van elk hoofdstuk byte-gelijk', () => {
		let aantalVerzen = 0;
		for (const { naam, tekst: bestandstekst } of bestanden) {
			const hoofdstuk = parseerHoofdstuk(bestandstekst);
			for (const nummer of new Set(versnummers(hoofdstuk))) {
				const inhoud = knipVers(hoofdstuk, nummer);
				if (inhoud === null) throw new Error(`${naam}: vers ${nummer} niet geknipt`);
				const terug = serialiseerHoofdstuk(vervangVers(hoofdstuk, nummer, inhoud));
				if (terug !== bestandstekst) throw new Error(`${naam}: vers ${nummer} komt niet byte-gelijk terug`);
				aantalVerzen++;
			}
		}
		expect(bestanden.length).toBeGreaterThan(40);
		expect(aantalVerzen).toBeGreaterThan(1000);
	});

	it('een bewerkt vers verandert alleen de regels van dat vers en blijft geldig', () => {
		let bewerkt = 0;
		for (const { naam, tekst: bestandstekst } of bestanden) {
			const hoofdstuk = parseerHoofdstuk(bestandstekst);
			const regels = bestandstekst.split('\n');
			for (const nummer of new Set(versnummers(hoofdstuk))) {
				const inhoud = knipVers(hoofdstuk, nummer);
				const eerste = inhoud?.delen[0];
				if (inhoud === null || eerste === undefined) throw new Error(`${naam}: vers ${nummer} niet geknipt`);
				const gewijzigd: VersInhoud = {
					delen: [{ ...eerste, stukken: [...eerste.stukken, tekst('ZZZ')] }, ...inhoud.delen.slice(1)],
				};
				const nieuw = vervangVers(hoofdstuk, nummer, gewijzigd);
				const nieuweTekst = serialiseerHoofdstuk(nieuw);
				expect(parseerHoofdstuk(nieuweTekst)).toEqual(nieuw);
				const nieuweRegels = nieuweTekst.split('\n');
				const veranderd = regels.flatMap((regel, plek) => (regel === nieuweRegels[plek] ? [] : [plek]));
				const alineaMetVers = hoofdstuk.alineas.findIndex(
					(alinea) => alinea.soort === 'tekst' && alinea.stukken.some((stuk) => stuk.soort === 'vers' && stuk.nummer === nummer),
				);
				if (nieuweRegels.length !== regels.length || veranderd.length !== 1 || veranderd[0] !== alineaMetVers) {
					throw new Error(`${naam}: vers ${nummer} wijzigt regels ${veranderd.join(',')} in plaats van alinea ${alineaMetVers}`);
				}
				expect(nieuweRegels[alineaMetVers]).toContain('ZZZ');
				bewerkt++;
			}
		}
		expect(bewerkt).toBeGreaterThan(1000);
	});
});
