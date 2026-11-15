import { describe, expect, it } from 'vitest';
import { kolomplaats, leesTabellen, ReferentieFout, splitsTabelregel, type Tabel } from './tabel';

describe('splitsTabelregel', () => {
	it('splitst op de scheidingstekens en haalt de witruimte weg', () => {
		expect(splitsTabelregel('| a |  b  | c |')).toEqual(['a', 'b', 'c']);
	});

	it('laat een lege cel leeg', () => {
		expect(splitsTabelregel('| a | | c |')).toEqual(['a', '', 'c']);
		expect(splitsTabelregel('| a | b | |')).toEqual(['a', 'b', '']);
	});

	it('houdt een pipe binnen backticks in dezelfde cel', () => {
		expect(splitsTabelregel('| `a | b` | c |')).toEqual(['`a | b`', 'c']);
	});

	it('maakt van een geëscapete pipe een gewone pipe in de cel', () => {
		expect(splitsTabelregel('| a \\| b | c |')).toEqual(['a | b', 'c']);
	});

	it('behandelt een backtick zonder sluitende backtick als gewone tekst', () => {
		expect(splitsTabelregel('| het teken ` | c |')).toEqual(['het teken `', 'c']);
	});

	it('werkt ook zonder pipe aan het begin en het eind', () => {
		expect(splitsTabelregel('a | b')).toEqual(['a', 'b']);
	});
});

describe('leesTabellen', () => {
	const tekst = ['# Titel', '', '## Eerste sectie', '', '| A | B |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |', '', 'Tekst ertussen.', '', '## Tweede sectie', '| A | B |', '| :-- | --: |', '| 5 | 6 |'].join('\n');

	it('geeft per tabel de sectie, de kop en de regels met hun regelnummer', () => {
		const tabellen = leesTabellen(tekst);

		expect(tabellen).toEqual([
			{
				sectie: 'Eerste sectie',
				kop: ['A', 'B'],
				kopregelnummer: 5,
				regels: [
					{ regelnummer: 7, cellen: ['1', '2'] },
					{ regelnummer: 8, cellen: ['3', '4'] },
				],
			},
			{ sectie: 'Tweede sectie', kop: ['A', 'B'], kopregelnummer: 13, regels: [{ regelnummer: 15, cellen: ['5', '6'] }] },
		]);
	});

	it('weigert een tabel zonder scheidingsregel, met regelnummer', () => {
		expect(() => leesTabellen('| A | B |\n| 1 | 2 |')).toThrowError(new ReferentieFout(2, 'na de kop van de tabel hoort een scheidingsregel (|---|)'));
	});

	it('weigert een regel met een ander aantal cellen dan de kop, met regelnummer', () => {
		expect(() => leesTabellen('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 |')).toThrowError('regel 4: 1 kolommen, de kop heeft er 2');
	});

	it('weigert een scheidingsregel met een ander aantal kolommen dan de kop', () => {
		expect(() => leesTabellen('| A | B |\n|---|')).toThrowError('regel 2: de scheidingsregel heeft 1 kolommen, de kop 2');
	});

	it('leest CRLF en een BOM als gewone tekst', () => {
		const [tabel] = leesTabellen('﻿| A |\r\n|---|\r\n| 1 |\r\n');

		expect(tabel?.kop).toEqual(['A']);
		expect(tabel?.regels).toEqual([{ regelnummer: 3, cellen: ['1'] }]);
	});
});

function eersteTabel(tekst: string): Tabel {
	const tabel = leesTabellen(tekst)[0];
	if (tabel === undefined) throw new Error('geen tabel in de testtekst');
	return tabel;
}

describe('kolomplaats', () => {
	it('geeft de plek van elke kolom op naam, ook als de volgorde anders is', () => {
		const tabel = eersteTabel('| B | A | C |\n|---|---|---|\n| 1 | 2 | 3 |');

		expect([kolomplaats(tabel, 'A'), kolomplaats(tabel, 'C')]).toEqual([1, 2]);
	});

	it('meldt een ontbrekende kolom bij de kopregel', () => {
		const tabel = eersteTabel('\n| B | A |\n|---|---|');

		expect(() => kolomplaats(tabel, 'Z')).toThrowError("regel 2: kolom 'Z' ontbreekt");
	});
});
