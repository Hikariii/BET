import { describe, expect, it } from 'vitest';
import type { VersInhoud } from '../bewerken/types';
import { leesBijbelbestanden } from '../formaat/bijbelbestanden.testhulp';
import { leesStijlen } from '../sjabloon/leesStijlen';
import { leesStylesXmlVanSjabloon } from '../sjabloon/sjabloon.testhulp';
import { groepeerPerVers } from '../app/groepeerPerVers';
import { parseerHoofdstuk } from '../formaat/parseer';
import type { Alineastijl, Opmaak } from '../formaat/types';
import { documentNaarVersInhoud, versInhoudNaarDocument } from './versDocument';
import { GEEN_VETTE_OPMAAK } from './editor.testhulp';
import { vetteOpmaakVan, type VetteOpmaak } from './vetteOpmaak';

const VETTE_OPMAAK_LUKAS = vetteOpmaakVan(leesStijlen(leesStylesXmlVanSjabloon()));

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
		expect(documentNaarVersInhoud(document, GEEN_VETTE_OPMAAK)).toEqual(inhoud);
	});

	it.each(leesBijbelbestanden())('$naam: elk vers komt ongewijzigd terug', ({ tekst }) => {
		const verzen = versInhoudenVan(tekst);
		expect(verzen.length).toBeGreaterThan(0);
		for (const vers of verzen) {
			expect(documentNaarVersInhoud(versInhoudNaarDocument(vers), VETTE_OPMAAK_LUKAS)).toEqual(vers);
		}
	});
});

type Stuk = readonly [tekst: string, ...opmaak: Opmaak[]];

/** Zet de stukken in een document, haalt het terug en geeft de stukken van het eerste deel. */
function naNormalisatie(stukken: readonly Stuk[], vette: VetteOpmaak, stijl: Alineastijl | null = null): Stuk[] {
	const inhoud: VersInhoud = { delen: [{ stijl, stukken: stukken.map(([tekst, ...opmaak]) => ({ soort: 'tekst', tekst, opmaak })) }] };
	const terug = documentNaarVersInhoud(versInhoudNaarDocument(inhoud), vette);
	return terug.delen[0]!.stukken.map((stuk) => [stuk.tekst, ...stuk.opmaak]);
}

describe('het opslaan van een vers normaliseert de opmaak', () => {
	it('zet witruimte aan het begin en eind van een reeks buiten de opmaak', () => {
		expect(naNormalisatie([['zag ', 'vet']], GEEN_VETTE_OPMAAK)).toEqual([['zag', 'vet'], [' ']]);
		expect(naNormalisatie([[' zag', 'highlight']], GEEN_VETTE_OPMAAK)).toEqual([[' '], ['zag', 'highlight']]);
		expect(naNormalisatie([['  woord  ', 'genade']], GEEN_VETTE_OPMAAK)).toEqual([['  '], ['woord', 'genade'], ['  ']]);
	});

	it('beoordeelt elke opmaak over haar eigen reeks', () => {
		const uit = naNormalisatie([[' een ', 'onderwijs', 'genade'], ['twee ', 'onderwijs'], ['drie', 'onderwijs', 'vet']], GEEN_VETTE_OPMAAK);
		expect(uit).toEqual([[' '], ['een', 'onderwijs', 'genade'], [' twee ', 'onderwijs'], ['drie', 'onderwijs', 'vet']]);
	});

	it('laat witruimte midden in een reeks staan, ook als de reeks uit meer stukken bestaat', () => {
		const stukken: Stuk[] = [['de ', 'onderstreept'], ['Christus', 'onderstreept', 'vet'], [' kwam', 'onderstreept']];
		expect(naNormalisatie(stukken, GEEN_VETTE_OPMAAK)).toEqual(stukken);
	});

	it('haalt de opmaak van tekst die alleen uit witruimte bestaat helemaal weg', () => {
		expect(naNormalisatie([['a'], [' ', 'vet'], ['b']], GEEN_VETTE_OPMAAK)).toEqual([['a b']]);
	});

	it('haalt vet weg onder een domein dat zelf vet is, en laat het staan als het domein niet vet is', () => {
		const vetteDomeinen: VetteOpmaak = { domeinen: new Set(['genade']), alineastijlen: new Set() };
		const stukken: Stuk[] = [['de '], ['genade', 'vet', 'genade'], [' en '], ['zonde', 'vet', 'zonde']];
		expect(naNormalisatie(stukken, vetteDomeinen)).toEqual([['de '], ['genade', 'genade'], [' en '], ['zonde', 'vet', 'zonde']]);
	});

	it('haalt vet weg in een alinea waarvan de stijl zelf vet is', () => {
		const vetteStijl: VetteOpmaak = { domeinen: new Set(), alineastijlen: new Set(['god']) };
		expect(naNormalisatie([['Ik ben', 'vet']], vetteStijl, 'god')).toEqual([['Ik ben']]);
		expect(naNormalisatie([['Ik ben', 'vet']], vetteStijl, 'jezus')).toEqual([['Ik ben', 'vet']]);
	});
});
