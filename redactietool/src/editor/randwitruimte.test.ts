import { describe, expect, it } from 'vitest';
import { groepeerPerVers } from '../app/groepeerPerVers';
import type { VersInhoud } from '../bewerken/types';
import { leesBijbelbestanden } from '../formaat/bijbelbestanden.testhulp';
import { parseerHoofdstuk } from '../formaat/parseer';
import type { Opmaak } from '../formaat/types';
import { leesStijlen } from '../sjabloon/leesStijlen';
import { leesStylesXmlVanSjabloon } from '../sjabloon/sjabloon.testhulp';
import { metRandwitruimte, zonderRandwitruimte } from './randwitruimte';
import { documentNaarVersInhoud, versInhoudNaarDocument } from './versDocument';
import { vetteOpmaakVan } from './vetteOpmaak';

const VETTE_OPMAAK_LUKAS = vetteOpmaakVan(leesStijlen(leesStylesXmlVanSjabloon()));

type Stuk = readonly [tekst: string, ...opmaak: Opmaak[]];

function vers(...delen: (readonly Stuk[])[]): VersInhoud {
	return { delen: delen.map((stukken) => ({ stijl: null, stukken: stukken.map(([tekst, ...opmaak]) => ({ soort: 'tekst', tekst, opmaak })) })) };
}

/** Alle verzen van een bestand als versinhoud, zoals ze in het bestand staan. */
function versInhoudenVan(tekst: string): VersInhoud[] {
	const hoofdstuk = parseerHoofdstuk(tekst);
	return groepeerPerVers(hoofdstuk, hoofdstuk)
		.filter((groep) => groep.bron.length > 0)
		.map((groep) => ({ delen: groep.bron.map((deel) => ({ stijl: deel.stijl, stukken: [...deel.stukken] })) }));
}

describe('randwitruimte', () => {
	it('haalt de spatie na het versnummer en vóór het volgende versnummer weg voor de editor', () => {
		const { inhoud } = zonderRandwitruimte(vers([[' Jezus zei: '], ['genade', 'genade'], [' en ging. ']]));

		expect(inhoud).toEqual(vers([['Jezus zei: '], ['genade', 'genade'], [' en ging.']]));
	});

	it('zet precies de witruimte van het bestand terug, ook als de vertaler zelf spaties aan begin of eind typte', () => {
		const { randen } = zonderRandwitruimte(vers([[' Jezus ging. ']], [['Tweede deel.']]));

		const bewerkt = vers([['   Jezus ging weg.  ']], [[' Tweede deel. ']]);

		expect(metRandwitruimte(bewerkt, randen)).toEqual(vers([[' Jezus ging weg. ']], [['Tweede deel.']]));
	});

	it('zet de witruimte buiten de opmaak als het eerste of laatste stuk opmaak heeft', () => {
		const { inhoud, randen } = zonderRandwitruimte(vers([[' '], ['Christus', 'vet'], [' ']]));
		expect(inhoud).toEqual(vers([['Christus', 'vet']]));

		expect(metRandwitruimte(vers([['  Christus  ', 'vet']]), randen)).toEqual(vers([[' '], ['Christus', 'vet'], [' ']]));
	});

	it('laat een deel van alleen witruimte zoals het was', () => {
		const origineel = vers([[' ']]);
		const { inhoud, randen } = zonderRandwitruimte(origineel);
		expect(inhoud).toEqual(vers([]));

		expect(metRandwitruimte(inhoud, randen)).toEqual(origineel);
	});

	it.each(leesBijbelbestanden())('$naam: elk vers komt via de editor ongewijzigd terug', ({ tekst }) => {
		const verzen = versInhoudenVan(tekst);
		expect(verzen.length).toBeGreaterThan(0);
		for (const origineel of verzen) {
			const { inhoud, randen } = zonderRandwitruimte(origineel);
			const terug = metRandwitruimte(documentNaarVersInhoud(versInhoudNaarDocument(inhoud), VETTE_OPMAAK_LUKAS), randen);
			expect(terug).toEqual(origineel);
		}
	});
});
