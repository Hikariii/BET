import { describe, expect, it } from 'vitest';
import type { BewaardOverzicht } from '../../bewaren/overzicht';
import { bewaarRegel, bewaarTelling, tijdVan, verouderdMelding, vervangingRegel } from './bewaarTekst';

function overzicht(deel: Partial<BewaardOverzicht> & Pick<BewaardOverzicht, 'totaal'>): BewaardOverzicht {
	return { hoofdstukken: [], keuzes: [], antwoorden: [], reacties: [], richtlijnReacties: [], verouderdBekend: true, laatstBewaard: null, ...deel };
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
		expect(tijdVan(lokaal(11, 15, 9, 5).toISOString(), lokaal(11, 16, 20, 0))).toBe('15 nov, 09:05');
	});
});

describe('bewaarTelling', () => {
	it('telt verzen en hoofdstukken, met enkelvoud waar het kan', () => {
		expect(bewaarTelling(overzicht({ totaal: { verzen: 12, hoofdstukken: 3, verouderd: 0, keuzes: 0, antwoorden: 0, reacties: 0, richtlijnReacties: 0 } }))).toBe('12 verzen in 3 hoofdstukken');
		expect(bewaarTelling(overzicht({ totaal: { verzen: 1, hoofdstukken: 1, verouderd: 0, keuzes: 0, antwoorden: 0, reacties: 0, richtlijnReacties: 0 } }))).toBe('1 vers in 1 hoofdstuk');
	});

	it('noemt de vervangingen erbij, ook als er geen bewerkte verzen zijn', () => {
		expect(bewaarTelling(overzicht({ totaal: { verzen: 2, hoofdstukken: 1, verouderd: 0, keuzes: 2, antwoorden: 0, reacties: 0, richtlijnReacties: 0 } }))).toBe('2 verzen in 1 hoofdstuk, 2 vervangingen');
		expect(bewaarTelling(overzicht({ totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 1, antwoorden: 0, reacties: 0, richtlijnReacties: 0 } }))).toBe('1 vervanging');
	});
});

describe('bewaarTelling met antwoorden', () => {
	it('telt alleen antwoorden als opgeslagen werk', () => {
		expect(bewaarTelling(overzicht({ totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 0, antwoorden: 1, reacties: 0, richtlijnReacties: 0 } }))).toBe('1 antwoord');
		expect(bewaarTelling(overzicht({ totaal: { verzen: 9, hoofdstukken: 5, verouderd: 0, keuzes: 1, antwoorden: 2, reacties: 0, richtlijnReacties: 0 } }))).toBe(
			'9 verzen in 5 hoofdstukken, 1 vervanging, 2 antwoorden',
		);
	});
});

describe('bewaarTelling met reacties', () => {
	it('telt reacties als opgeslagen werk, ook zonder verzen', () => {
		expect(bewaarTelling(overzicht({ totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 0, antwoorden: 0, reacties: 1, richtlijnReacties: 0 } }))).toBe('1 reactie');
		expect(bewaarTelling(overzicht({ totaal: { verzen: 9, hoofdstukken: 5, verouderd: 0, keuzes: 0, antwoorden: 1, reacties: 3, richtlijnReacties: 0 } }))).toBe('9 verzen in 5 hoofdstukken, 1 antwoord, 3 reacties');
	});
});

describe('bewaarTelling met reacties op de richtlijn', () => {
	it('telt ze apart van de reacties op opmerkingen en noemt ze na de andere delen', () => {
		expect(bewaarTelling(overzicht({ totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 0, antwoorden: 0, reacties: 0, richtlijnReacties: 1 } }))).toBe('1 reactie op de richtlijn');
		expect(bewaarTelling(overzicht({ totaal: { verzen: 9, hoofdstukken: 5, verouderd: 0, keuzes: 0, antwoorden: 1, reacties: 3, richtlijnReacties: 2 } }))).toBe(
			'9 verzen in 5 hoofdstukken, 1 antwoord, 3 reacties, 2 reacties op de richtlijn',
		);
	});
});

describe('bewaarRegel', () => {
	it('geeft de status met telling en laatste bewaartijd', () => {
		const nu = lokaal(11, 16, 20, 0);
		const regel = bewaarRegel(
			overzicht({ totaal: { verzen: 12, hoofdstukken: 3, verouderd: 0, keuzes: 0, antwoorden: 0, reacties: 0, richtlijnReacties: 0 }, laatstBewaard: lokaal(11, 16, 14, 32).toISOString() }),
			nu,
		);

		expect(regel).toBe('Opgeslagen in deze browser · 12 verzen in 3 hoofdstukken · 14:32');
	});

	it('noemt verouderde bewerkingen als die er zijn', () => {
		const regel = bewaarRegel(
			overzicht({ totaal: { verzen: 3, hoofdstukken: 1, verouderd: 2, keuzes: 0, antwoorden: 0, reacties: 0, richtlijnReacties: 0 }, laatstBewaard: new Date().toISOString() }),
		);

		expect(regel.endsWith(' · 2 door Claude veranderd')).toBe(true);
	});

	it('zegt dat er niets opgeslagen is', () => {
		expect(bewaarRegel(overzicht({ totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 0, antwoorden: 0, reacties: 0, richtlijnReacties: 0 } }))).toBe('Nog niets opgeslagen in deze browser');
	});
});

describe('vervangingRegel', () => {
	const nu = lokaal(11, 16, 20, 0);
	const toegepast = lokaal(11, 16, 11, 2).toISOString();

	it('noemt bij een markeringswissel de markeringen, niet een lege nieuwe tekst', () => {
		const regel = vervangingRegel({ id: 'k', soort: 'markering', zoekterm: 'Gezegend', nieuw: '', van: 'eeuwigleven', naar: 'genade', toegepast, aantalVerzen: 9 }, nu);

		expect(regel).toBe('markering van "Gezegend": eeuwigleven wordt genade, 9 verzen, toegepast 11:02.');
	});

	it('noemt bij een tekstvervanging oude en nieuwe tekst', () => {
		const regel = vervangingRegel({ id: 'k', soort: 'tekst', zoekterm: 'Mensenzoon', nieuw: 'de Mensenzoon', van: null, naar: null, toegepast, aantalVerzen: 1 }, nu);

		expect(regel).toBe('"Mensenzoon" door "de Mensenzoon", 1 vers, toegepast 11:02.');
	});
});

describe('verouderdMelding', () => {
	it('noemt het vers en wat de lezer kan doen', () => {
		expect(verouderdMelding(['vers 12'], 'voordat je kopieert')).toBe(
			'Claude heeft vers 12 veranderd nadat jij het bewerkte. Lees je tekst na voordat je kopieert. Wil je de tekst van Claude, kies dan bij dat vers Vers terugzetten (je eigen wijziging gaat dan weg).',
		);
	});

	it('noemt meer verzen met een komma en "en"', () => {
		expect(verouderdMelding(['vers 2', 'vers 5', 'vers 9'], 'voordat je kopieert')).toContain('vers 2, vers 5 en vers 9 veranderd nadat jij ze bewerkte');
	});
});
