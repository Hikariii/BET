import { describe, expect, it } from 'vitest';
import { parseerHoofdstuk } from '../formaat/parseer';
import type { Alinea, Hoofdstuk } from '../formaat/types';
import { naarProseMirror, vanProseMirror } from './omzetten';
import { schema } from './schema';

function soorten(hoofdstuk: Hoofdstuk): string[] {
	return hoofdstuk.alineas.map((alinea) => alinea.soort);
}

describe('lege regels', () => {
	it('één en twee lege regels achter elkaar blijven verschillend', () => {
		const hoofdstuk = parseerHoofdstuk('# Lukas 1\n\nEen\n\n\nTwee\n');
		expect(soorten(hoofdstuk)).toEqual(['titel', 'leeg', 'tekst', 'leeg', 'leeg', 'tekst']);
		expect(soorten(vanProseMirror(naarProseMirror(hoofdstuk)))).toEqual(soorten(hoofdstuk));
	});

	it('een alinea met alleen een stijl is geen lege regel', () => {
		const hoofdstuk = parseerHoofdstuk('# Lukas 1\n@jezus\n\n');
		expect(vanProseMirror(naarProseMirror(hoofdstuk))).toEqual(hoofdstuk);
	});

	it('meer dan twee lege regels worden twee, zoals FORMAAT.md voorschrijft', () => {
		const leeg: Alinea = { soort: 'leeg' };
		const tekst: Alinea = { soort: 'tekst', stijl: null, stukken: [{ soort: 'tekst', tekst: 'Twee', opmaak: [] }] };
		const document = naarProseMirror({ alineas: [tekst, leeg, leeg, leeg, leeg, tekst] });
		expect(soorten(vanProseMirror(document))).toEqual(['tekst', 'leeg', 'leeg', 'tekst']);
	});
});

describe('wat het schema weigert', () => {
	it('twee domeinen over dezelfde tekst', () => {
		const hoofdstuk: Hoofdstuk = {
			alineas: [{ soort: 'tekst', stijl: null, stukken: [{ soort: 'tekst', tekst: 'genade', opmaak: ['genade', 'zonde'] }] }],
		};
		expect(() => naarProseMirror(hoofdstuk)).toThrow();
	});

	it('een lege titel bij het terugschrijven', () => {
		const document = schema.nodes['doc']!.create(null, schema.nodes['titel']!.create());
		expect(() => vanProseMirror(document)).toThrow('de titel is leeg');
	});
});
