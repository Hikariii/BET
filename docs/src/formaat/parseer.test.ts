import { describe, expect, it } from 'vitest';
import { parseerHoofdstuk } from './parseer';
import { FormaatFout, type Alinea } from './types';

function eersteAlinea(tekst: string): Alinea {
	const alinea = parseerHoofdstuk(tekst).alineas[0];
	if (alinea === undefined) throw new Error('geen alinea');
	return alinea;
}

describe('alinea’s', () => {
	it('herkent een kop, een lege regel en een tekstalinea, één per regel', () => {
		const { alineas } = parseerHoofdstuk('# Lukas 3\n\n[1] Tekst\n');
		expect(alineas).toEqual([
			{ soort: 'titel', tekst: 'Lukas 3' },
			{ soort: 'leeg' },
			{
				soort: 'tekst',
				stijl: null,
				stukken: [
					{ soort: 'vers', nummer: 1 },
					{ soort: 'tekst', tekst: ' Tekst', opmaak: [] },
				],
			},
		]);
	});

	it('leest de alineastijl uit het voorvoegsel', () => {
		expect(eersteAlinea('@citaat-ot Er staat geschreven')).toEqual({
			soort: 'tekst',
			stijl: 'citaat-ot',
			stukken: [{ soort: 'tekst', tekst: 'Er staat geschreven', opmaak: [] }],
		});
	});

	it('weigert een onbekende alineastijl', () => {
		expect(() => parseerHoofdstuk('@profeet Tekst\n')).toThrow(new FormaatFout(1, "onbekende alineatag '@profeet'"));
	});

	it('weigert meer dan één spatie na de alineastijl', () => {
		expect(() => parseerHoofdstuk('@jezus  Tekst\n')).toThrow(/regel 1: na '@jezus' hoort precies één spatie/);
	});

	it('weigert een kop die niet "# Titel" is', () => {
		expect(() => parseerHoofdstuk('## Lukas 3\n')).toThrow(/regel 1: alleen '# Titel'/);
	});
});

describe('lege regels', () => {
	it('staat twee lege regels achter elkaar toe', () => {
		expect(parseerHoofdstuk('a\n\n\nb\n').alineas.map((alinea) => alinea.soort)).toEqual(['tekst', 'leeg', 'leeg', 'tekst']);
	});

	it('weigert drie lege regels achter elkaar, met het regelnummer van de derde', () => {
		expect(() => parseerHoofdstuk('a\n\n\n\nb\n')).toThrow(new FormaatFout(4, 'meer dan 2 lege regels achter elkaar'));
	});

	it('weigert een regel met alleen witruimte', () => {
		expect(() => parseerHoofdstuk('a\n \nb\n')).toThrow(/regel 2: regel met alleen witruimte/);
	});
});

describe('opmaak', () => {
	function stukken(regel: string) {
		const alinea = eersteAlinea(`${regel}\n`);
		if (alinea.soort !== 'tekst') throw new Error('geen tekstalinea');
		return alinea.stukken;
	}

	it('geeft elk tekststuk de opmaak van buiten naar binnen', () => {
		expect(stukken('a {onderwijs}b =={vet}c{/vet}== d{/onderwijs}')).toEqual([
			{ soort: 'tekst', tekst: 'a ', opmaak: [] },
			{ soort: 'tekst', tekst: 'b ', opmaak: ['onderwijs'] },
			{ soort: 'tekst', tekst: 'c', opmaak: ['onderwijs', 'highlight', 'vet'] },
			{ soort: 'tekst', tekst: ' d', opmaak: ['onderwijs'] },
		]);
	});

	it('leest een tag midden in een woord', () => {
		expect(stukken('r{eeuwigleven}edding{/eeuwigleven}')).toEqual([
			{ soort: 'tekst', tekst: 'r', opmaak: [] },
			{ soort: 'tekst', tekst: 'edding', opmaak: ['eeuwigleven'] },
		]);
	});

	it('voegt aansluitende stukken met dezelfde opmaak samen', () => {
		expect(stukken('a{vet}{/vet}b')).toEqual([{ soort: 'tekst', tekst: 'ab', opmaak: [] }]);
	});

	it('weigert een versnummer binnen een tag', () => {
		expect(() => parseerHoofdstuk('{vet}Hij [5] zei{/vet}\n')).toThrow(new FormaatFout(1, 'versnummer [5] staat binnen {vet}'));
	});

	it('weigert tags in de verkeerde nestingvolgorde', () => {
		expect(() => parseerHoofdstuk('{vet}{onderwijs}a{/onderwijs}{/vet}\n')).toThrow(
			new FormaatFout(1, '{onderwijs} hoort buiten {vet}'),
		);
	});

	it('weigert tags die elkaar kruisen', () => {
		expect(() => parseerHoofdstuk('{onderwijs}{vet}a{/onderwijs}{/vet}\n')).toThrow(
			new FormaatFout(1, '{/onderwijs} sluit terwijl {vet} nog open staat'),
		);
	});

	it('weigert een tag die niet open staat', () => {
		expect(() => parseerHoofdstuk('a{/vet}\n')).toThrow(new FormaatFout(1, '{/vet} sluit een tag die niet open staat'));
	});

	it('weigert een tag die dubbel open staat', () => {
		expect(() => parseerHoofdstuk('{vet}{vet}a\n')).toThrow(new FormaatFout(1, '{vet} staat al open'));
	});

	it('weigert een onbekende tag, ook de interne naam van highlight', () => {
		expect(() => parseerHoofdstuk('{kleur}a{/kleur}\n')).toThrow(new FormaatFout(1, "onbekende tag '{kleur}'"));
		expect(() => parseerHoofdstuk('{highlight}a{/highlight}\n')).toThrow(new FormaatFout(1, "onbekende tag '{highlight}'"));
	});

	it('weigert een tag die aan het eind van de alinea open staat', () => {
		expect(() => parseerHoofdstuk('a {vet}b\n')).toThrow(new FormaatFout(1, 'tag(s) niet gesloten aan het eind van de alinea: {vet}'));
	});

	it('noemt het regelnummer van de fout in een later deel van het bestand', () => {
		expect(() => parseerHoofdstuk('# Lukas 1\n\n@jezus a\n{vet}b\n')).toThrow(/^regel 4:/);
	});
});
