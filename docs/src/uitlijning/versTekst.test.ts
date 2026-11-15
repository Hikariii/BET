import { describe, expect, it } from 'vitest';
import { parseerHoofdstuk } from '../formaat/parseer';
import { tekstPerVers } from './versTekst';

describe('tekstPerVers', () => {
	it('geeft per versnummer de tekst zonder tags', () => {
		const hoofdstuk = parseerHoofdstuk('# Lukas 1\n\n[1] Jezus, vol van {genade}de Geest{/genade}, kwam. [2] Hij ==ging== weg.\n');

		const tekst = tekstPerVers(hoofdstuk);

		expect([...tekst.keys()]).toEqual([1, 2]);
		expect(tekst.get(1)?.trim()).toBe('Jezus, vol van de Geest, kwam.');
		expect(tekst.get(2)?.trim()).toBe('Hij ging weg.');
	});

	it("voegt een vers dat over twee alinea's loopt samen met een spatie", () => {
		const hoofdstuk = parseerHoofdstuk('# Lukas 1\n\n[3] Hij zei:\n@jezus Kom hier.\n\n[4] Daarna ging hij.\n');

		const tekst = tekstPerVers(hoofdstuk);

		expect(tekst.get(3)?.trim()).toBe('Hij zei: Kom hier.');
		expect(tekst.get(4)?.trim()).toBe('Daarna ging hij.');
	});

	it('houdt een tag midden in een woord bij dat woord', () => {
		const hoofdstuk = parseerHoofdstuk('# Lukas 1\n\n[69] een hoorn van r{eeuwigleven}edding{/eeuwigleven} voor ons\n');

		expect(tekstPerVers(hoofdstuk).get(69)?.trim()).toBe('een hoorn van redding voor ons');
	});

	it('negeert de titel en lege regels', () => {
		const hoofdstuk = parseerHoofdstuk('# Lukas 1\n\n\n[1] Tekst.\n');

		expect([...tekstPerVers(hoofdstuk).keys()]).toEqual([1]);
	});
});
