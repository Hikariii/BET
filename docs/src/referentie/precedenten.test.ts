import { describe, expect, it } from 'vitest';
import { leesRepobestand } from './bestanden.testhulp';
import { leesPrecedenten } from './precedenten';

const PRECEDENTEN = 'bijbel/lukas/referentie/precedenten.md';
const GEDACHTENSTREEP = String.fromCodePoint(0x2014);

/** Telt de gegevensregels op een andere manier dan de parser: alle tabelregels, min kop- en scheidingsregels. */
function telGegevensregels(tekst: string): number {
	return tekst
		.split('\n')
		.filter((regel) => regel.startsWith('|'))
		.filter((regel) => !/^\|[-:| ]+\|$/.test(regel))
		.filter((regel) => !regel.startsWith('| Bron |')).length;
}

describe('leesPrecedenten op precedenten.md', () => {
	const tekst = leesRepobestand(PRECEDENTEN);
	const precedenten = leesPrecedenten(tekst);

	it('geeft elke tabelregel, zonder kop- en scheidingsregels', () => {
		expect(telGegevensregels(tekst)).toBeGreaterThan(400);
		expect(precedenten).toHaveLength(telGegevensregels(tekst));
		expect(precedenten.some((precedent) => precedent.bron === 'Bron' || precedent.bron.startsWith('---'))).toBe(false);
	});

	it('geeft het precedent Zoon des mensen met de kolom Aantal als plaats', () => {
		expect(precedenten.find((precedent) => precedent.bron === 'Zoon des mensen')).toEqual({
			sectie: `Begrippen voor Lukas 4–24 ${GEDACHTENSTREEP} voorlopig (besloten 2026-11-15, vóór Lukas 4)`,
			bron: 'Zoon des mensen',
			vereenvoudigd: 'de Mensenzoon',
			plaats: '26',
			status: 'vast',
			opmerking: 'besloten door gebruiker 2026-11-15; met hoofdletter, zoals andere titels van Jezus',
		});
	});

	it('geeft een regel uit een tabel met de kolom Plaats, met een lege opmerking', () => {
		expect(precedenten.find((precedent) => precedent.bron === 'verschrompeld')).toEqual({
			sectie: `Besluiten na Lukas 6 ${GEDACHTENSTREEP} voorlopig (hoofdsessie)`,
			bron: 'verschrompeld',
			vereenvoudigd: 'verdord',
			plaats: '6:6, 6:8',
			status: 'voorlopig',
			opmerking: '',
		});
	});

	it('kent alleen de statussen voorlopig en vast', () => {
		expect(new Set(precedenten.map((precedent) => precedent.status))).toEqual(new Set(['voorlopig', 'vast']));
	});
});

describe('leesPrecedenten op kleine invoer', () => {
	const tabel = (...regels: string[]): string => ['## Sectie', '', '| Bron | Vereenvoudigd | Plaats | Status | Opmerking |', '|---|---|---|---|---|', ...regels].join('\n');

	it('behandelt een pipe binnen backticks en een geëscapete pipe als tekst in de cel', () => {
		expect(leesPrecedenten(tabel('| `a | b` | c \\| d | 1:1 | voorlopig | x |'))).toEqual([
			{ sectie: 'Sectie', bron: '`a | b`', vereenvoudigd: 'c | d', plaats: '1:1', status: 'voorlopig', opmerking: 'x' },
		]);
	});

	it('geeft elke tabel zijn eigen sectie', () => {
		const tekst = `${tabel('| a | b | 1:1 | vast | |')}\n\n## Andere sectie\n\n| Bron | Vereenvoudigd | Aantal in Lk 4–24 | Status | Opmerking |\n|---|---|---|---|---|\n| c | d | 7 | vast | |`;

		expect(leesPrecedenten(tekst).map(({ sectie, plaats }) => [sectie, plaats])).toEqual([
			['Sectie', '1:1'],
			['Andere sectie', '7'],
		]);
	});

	it('geeft niets voor een bestand zonder tabel', () => {
		expect(leesPrecedenten('## Alleen tekst\n\nGeen tabel.')).toEqual([]);
	});

	it('meldt een regel met te weinig cellen met het regelnummer', () => {
		expect(() => leesPrecedenten(tabel('| a | b | 1:1 | vast |'))).toThrowError('regel 5: 4 kolommen, de kop heeft er 5');
	});

	it('meldt een tabel waarvan de derde kolom niet de plaats of het aantal is', () => {
		expect(() => leesPrecedenten('| Bron | Vereenvoudigd | Iets | Status | Opmerking |\n|---|---|---|---|---|')).toThrowError(
			"regel 1: de derde kolom heet 'Iets', verwacht: Plaats of Aantal in Lk 4–24",
		);
	});
});
