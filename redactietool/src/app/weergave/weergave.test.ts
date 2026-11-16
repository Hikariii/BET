import { describe, expect, it } from 'vitest';
import { GeheugenOpslag } from '../../bewaren/testhulp';
import { bewaarWeergave, GROOTTE_STAPPEN, leesWeergave, schaalVan, type Weergave } from './weergave';

const STANDAARD: Weergave = { grootte: 0, zijbalkIngeklapt: false };

describe('schaalVan', () => {
	it('groeit met elke stap en is 1 bij stap 0, zodat de standaard de tool ongewijzigd laat', () => {
		const schalen = GROOTTE_STAPPEN.map(schaalVan);

		expect(schaalVan(0)).toBe(1);
		expect(schalen).toEqual([...schalen].sort((een, ander) => een - ander));
		expect(new Set(schalen).size).toBe(GROOTTE_STAPPEN.length);
	});
});

describe('leesWeergave', () => {
	it('geeft de standaard als er niets onthouden is', () => {
		expect(leesWeergave(new GeheugenOpslag(), null, { grootte: 1, zijbalkIngeklapt: true })).toEqual({ grootte: 1, zijbalkIngeklapt: true });
	});

	it('geeft terug wat bewaarWeergave onthield, ook als de standaard anders is', () => {
		const opslag = new GeheugenOpslag();
		bewaarWeergave(opslag, null, { grootte: 2, zijbalkIngeklapt: true });

		expect(leesWeergave(opslag, null, STANDAARD)).toEqual({ grootte: 2, zijbalkIngeklapt: true });
	});

	it('onthoudt per ontwerpvariant apart', () => {
		const opslag = new GeheugenOpslag();
		bewaarWeergave(opslag, 'v6', { grootte: -1, zijbalkIngeklapt: false });

		expect(leesWeergave(opslag, 'v6', STANDAARD).grootte).toBe(-1);
		expect(leesWeergave(opslag, 'v1', STANDAARD).grootte).toBe(0);
		expect(leesWeergave(opslag, null, STANDAARD).grootte).toBe(0);
	});

	it.each([
		['kapotte JSON', '{niet goed'],
		['een getal', '5'],
		['een lijst', '[1]'],
	])('valt bij %s terug op de standaard', (_naam, tekst) => {
		const opslag = new GeheugenOpslag();
		opslag.setItem('bet-weergave', tekst);

		expect(leesWeergave(opslag, null, { grootte: 1, zijbalkIngeklapt: true })).toEqual({ grootte: 1, zijbalkIngeklapt: true });
	});

	it('neemt een onbekende grootte niet over maar houdt de rest', () => {
		const opslag = new GeheugenOpslag();
		opslag.setItem('bet-weergave', JSON.stringify({ grootte: 9, zijbalkIngeklapt: true }));

		expect(leesWeergave(opslag, null, STANDAARD)).toEqual({ grootte: 0, zijbalkIngeklapt: true });
	});
});

describe('bewaarWeergave', () => {
	it('slikt de fout van een weigerende opslag in', () => {
		const weigert = {
			getItem: () => null,
			setItem: () => {
				throw new DOMException('vol', 'QuotaExceededError');
			},
			removeItem: () => {},
		};

		expect(() => bewaarWeergave(weigert, null, STANDAARD)).not.toThrow();
	});
});
