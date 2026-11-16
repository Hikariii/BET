import { describe, expect, it } from 'vitest';
import type { BewaardOverzicht } from '../../bewaren/overzicht';
import { bewaarRegel, bewaarTelling, tijdVan } from './bewaarTekst';

function overzicht(deel: Partial<BewaardOverzicht> & Pick<BewaardOverzicht, 'totaal'>): BewaardOverzicht {
	return { hoofdstukken: [], keuzes: [], verouderdBekend: true, laatstBewaard: null, ...deel };
}

/** Een tijdstip in de lokale tijdzone, zodat de test niet van de tijdzone van de machine afhangt. */
function lokaal(maand: number, dag: number, uur: number, minuut: number): Date {
	return new Date(2026, maand - 1, dag, uur, minuut);
}

describe('tijdVan', () => {
	it('toont alleen de tijd als het vandaag was', () => {
		expect(tijdVan(lokaal(11, 16, 14, 32).toISOString(), lokaal(11, 16, 20, 0))).toBe('14:32');
	});

	it('toont ook de datum als het eerder was', () => {
		const tekst = tijdVan(lokaal(11, 15, 9, 5).toISOString(), lokaal(11, 16, 20, 0));

		expect(tekst).toContain('15');
		expect(tekst).toContain('09:05');
	});
});

describe('bewaarTelling', () => {
	it('telt verzen en hoofdstukken, met enkelvoud waar het kan', () => {
		expect(bewaarTelling(overzicht({ totaal: { verzen: 12, hoofdstukken: 3, verouderd: 0, keuzes: 0 } }))).toBe('12 verzen in 3 hoofdstukken');
		expect(bewaarTelling(overzicht({ totaal: { verzen: 1, hoofdstukken: 1, verouderd: 0, keuzes: 0 } }))).toBe('1 vers in 1 hoofdstuk');
	});

	it('noemt de keuzes erbij, ook als er geen bewerkte verzen zijn', () => {
		expect(bewaarTelling(overzicht({ totaal: { verzen: 2, hoofdstukken: 1, verouderd: 0, keuzes: 2 } }))).toBe('2 verzen in 1 hoofdstuk, 2 keuzes');
		expect(bewaarTelling(overzicht({ totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 1 } }))).toBe('1 keuze');
	});
});

describe('bewaarRegel', () => {
	it('geeft de status met telling en laatste bewaartijd', () => {
		const nu = lokaal(11, 16, 20, 0);
		const regel = bewaarRegel(
			overzicht({ totaal: { verzen: 12, hoofdstukken: 3, verouderd: 0, keuzes: 0 }, laatstBewaard: lokaal(11, 16, 14, 32).toISOString() }),
			nu,
		);

		expect(regel).toBe('Opgeslagen in deze browser · 12 verzen in 3 hoofdstukken · 14:32');
	});

	it('noemt verouderde bewerkingen als die er zijn', () => {
		const regel = bewaarRegel(
			overzicht({ totaal: { verzen: 3, hoofdstukken: 1, verouderd: 2, keuzes: 0 }, laatstBewaard: new Date().toISOString() }),
		);

		expect(regel.endsWith(' · 2 verouderd')).toBe(true);
	});

	it('zegt dat er niets opgeslagen is', () => {
		expect(bewaarRegel(overzicht({ totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 0 } }))).toBe('Nog niets opgeslagen in deze browser');
	});
});
