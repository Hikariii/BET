import { describe, expect, it } from 'vitest';
import type { VersInhoud } from '../../bewerken/types';
import { versInhoudNaarDocument } from '../../editor/versDocument';
import { selectieBijPlek } from './klikPlek';

const INHOUD: VersInhoud = {
	delen: [
		{ stijl: null, stukken: [{ soort: 'tekst', tekst: 'Eerste ', opmaak: [] }, { soort: 'tekst', tekst: 'deel.', opmaak: ['onderwijs'] }] },
		{ stijl: 'jezus', stukken: [{ soort: 'tekst', tekst: 'Tweede deel.', opmaak: [] }] },
	],
};

describe('selectieBijPlek', () => {
	const document = versInhoudNaarDocument(INHOUD);

	it('zet de cursor in het gekozen deel op het gekozen teken, ook over een opmaakgrens heen', () => {
		const selectie = selectieBijPlek(document, { alinea: 1, teken: 6 });
		expect(selectie.empty).toBe(true);
		expect(document.textBetween(0, selectie.from, '|')).toBe('Eerste deel.|Tweede');
		expect(selectieBijPlek(document, { alinea: 0, teken: 9 }).from).toBe(1 + 9);
	});

	it('telt vanaf het eerste zichtbare teken als het deel met een spatie begint', () => {
		const metSpatie = versInhoudNaarDocument({ delen: [{ stijl: null, stukken: [{ soort: 'tekst', tekst: ' Toen het uur.', opmaak: [] }] }] });
		const selectie = selectieBijPlek(metSpatie, { alinea: 0, teken: 5 });
		expect(metSpatie.textBetween(0, selectie.from)).toBe(' Toen ');
	});

	it('zet de cursor aan het eind zonder plek', () => {
		expect(selectieBijPlek(document, null).from).toBe(document.content.size - 1);
	});

	it('valt terug op het eind bij een deel dat niet bestaat', () => {
		expect(selectieBijPlek(document, { alinea: 5, teken: 0 }).from).toBe(document.content.size - 1);
	});

	it('houdt de cursor binnen het deel bij een te groot teken', () => {
		const selectie = selectieBijPlek(document, { alinea: 0, teken: 500 });
		expect(document.textBetween(0, selectie.from, '|')).toBe('Eerste deel.');
	});
});
