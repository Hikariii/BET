import { describe, expect, it } from 'vitest';
import { parseerHoofdstuk } from '../formaat/parseer';
import type { Hoofdstuk } from '../formaat/types';
import { groepeerPerVers, type VersDeel } from './groepeerPerVers';

function tekstenVan(delen: readonly VersDeel[]): string[] {
	return delen.map((deel) => deel.stukken.map((stuk) => stuk.tekst).join(''));
}

describe('groepeerPerVers', () => {
	const leeg: Hoofdstuk = { alineas: [] };

	it('maakt van elk versnummer een groep, in volgorde van het vers', () => {
		const bron = parseerHoofdstuk('# Lukas 1\n\n[1] Eerste vers. [2] Tweede vers.\n[3] Derde vers.\n');

		const groepen = groepeerPerVers(bron, leeg);

		expect(groepen.map((groep) => groep.nummer)).toEqual([1, 2, 3]);
		expect(groepen.map((groep) => tekstenVan(groep.bron))).toEqual([['Eerste vers.'], ['Tweede vers.'], ['Derde vers.']]);
	});

	it('houdt een vers dat over twee alinea\'s loopt bij elkaar, met de stijl van elke alinea', () => {
		const bron = parseerHoofdstuk('# Lukas 9\n\n[21] Hij zei:\n@jezus Zeg het niemand. [22] Want de Mensenzoon moet lijden.\n');

		const groepen = groepeerPerVers(bron, leeg);

		const vers21 = groepen.find((groep) => groep.nummer === 21);
		expect(vers21?.bron.map((deel) => deel.stijl)).toEqual([null, 'jezus']);
		expect(tekstenVan(vers21?.bron ?? [])).toEqual(['Hij zei:', 'Zeg het niemand.']);
		expect(tekstenVan(groepen.find((groep) => groep.nummer === 22)?.bron ?? [])).toEqual(['Want de Mensenzoon moet lijden.']);
	});

	it('zet bron en vereenvoudiging van hetzelfde vers in één groep', () => {
		const bron = parseerHoofdstuk('# Lukas 4\n\n[18] De Geest des Heeren is op Mij.\n');
		const vereenvoudigd = parseerHoofdstuk('# Lukas 4\n\n[18] De Geest van de Heer is op Mij.\n');

		const groepen = groepeerPerVers(bron, vereenvoudigd);

		expect(groepen).toHaveLength(1);
		expect(tekstenVan(groepen[0]?.bron ?? [])).toEqual(['De Geest des Heeren is op Mij.']);
		expect(tekstenVan(groepen[0]?.vereenvoudigd ?? [])).toEqual(['De Geest van de Heer is op Mij.']);
	});

	it('geeft een lege kant voor een vers dat er in de ene tekst niet is', () => {
		const bron = parseerHoofdstuk('# Lukas 4\n\n[1] Een. [2] Twee.\n');
		const vereenvoudigd = parseerHoofdstuk('# Lukas 4\n\n[1] Een.\n');

		const groepen = groepeerPerVers(bron, vereenvoudigd);

		expect(groepen.map((groep) => [groep.nummer, groep.vereenvoudigd.length])).toEqual([
			[1, 1],
			[2, 0],
		]);
	});

	it('bewaart de opmaak van de stukken en snijdt de spaties rond het versnummer af', () => {
		const bron = parseerHoofdstuk('# Lukas 3\n\n[15] Of hij {vet}de Christus{/vet} was.\n');

		const [groep] = groepeerPerVers(bron, leeg);

		const stukken = groep?.bron[0]?.stukken ?? [];
		expect(stukken.map((stuk) => [stuk.tekst, stuk.opmaak])).toEqual([
			['Of hij ', []],
			['de Christus', ['vet']],
			[' was.', []],
		]);
	});

	it('laat de titel en lege regels buiten de groepen', () => {
		const bron = parseerHoofdstuk('# Lukas 2\n\n[1] Een.\n\n\n[2] Twee.\n');

		const groepen = groepeerPerVers(bron, leeg);

		expect(groepen.map((groep) => groep.nummer)).toEqual([1, 2]);
	});

	it('zet tekst vóór het eerste versnummer in een groep zonder nummer, vooraan', () => {
		const bron = parseerHoofdstuk('# Lukas 1\n\nOpschrift\n[1] Een.\n');

		const groepen = groepeerPerVers(bron, leeg);

		expect(groepen.map((groep) => groep.nummer)).toEqual([null, 1]);
		expect(tekstenVan(groepen[0]?.bron ?? [])).toEqual(['Opschrift']);
	});
});
