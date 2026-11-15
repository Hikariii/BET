import { describe, expect, it } from 'vitest';
import type { VersInhoud } from '../bewerken/types';
import { leesBijbelbestanden } from '../formaat/bijbelbestanden.testhulp';
import { groepeerPerVers } from '../app/groepeerPerVers';
import { parseerHoofdstuk } from '../formaat/parseer';
import { documentNaarVersInhoud, versInhoudNaarDocument } from './versDocument';

/** Alle verzen van een bestand als versinhoud, zonder de knipfunctie van de tussenstand te gebruiken. */
function versInhoudenVan(tekst: string): VersInhoud[] {
	const hoofdstuk = parseerHoofdstuk(tekst);
	return groepeerPerVers(hoofdstuk, hoofdstuk)
		.filter((groep) => groep.bron.length > 0)
		.map((groep) => ({ delen: groep.bron.map((deel) => ({ stijl: deel.stijl, stukken: [...deel.stukken] })) }));
}

describe('versinhoud, editordocument en terug', () => {
	it("geeft evenveel alinea's als delen, met stijl en opmaak", () => {
		const inhoud: VersInhoud = {
			delen: [
				{
					stijl: 'jezus',
					stukken: [
						{ soort: 'tekst', tekst: 'Hij zei: ', opmaak: [] },
						{ soort: 'tekst', tekst: 'genade', opmaak: ['onderwijs', 'genade'] },
					],
				},
				{ stijl: null, stukken: [] },
			],
		};
		const document = versInhoudNaarDocument(inhoud);
		expect(document.childCount).toBe(2);
		expect(document.child(0).attrs['stijl']).toBe('jezus');
		expect(document.child(0).lastChild?.marks.map((mark) => mark.type.name)).toEqual(['onderwijs', 'genade']);
		expect(documentNaarVersInhoud(document)).toEqual(inhoud);
	});

	it.each(leesBijbelbestanden())('$naam: elk vers komt ongewijzigd terug', ({ tekst }) => {
		const verzen = versInhoudenVan(tekst);
		expect(verzen.length).toBeGreaterThan(0);
		for (const vers of verzen) {
			expect(documentNaarVersInhoud(versInhoudNaarDocument(vers))).toEqual(vers);
		}
	});
});
