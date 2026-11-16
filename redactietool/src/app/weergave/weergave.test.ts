import { describe, expect, it } from 'vitest';
import { GeheugenOpslag } from '../../bewaren/testhulp';
import { bewaarWeergave, GROOTTE_STAPPEN, leesWeergave, schaalVan } from './weergave';

describe('schaalVan', () => {
	it('geeft de vaste lettergrootte per stap, met 1 bij stap 0 zodat de standaard de tool ongewijzigd laat', () => {
		expect(GROOTTE_STAPPEN.map(schaalVan)).toEqual([0.92, 1, 1.08, 1.16]);
	});
});

describe('leesWeergave', () => {
	it('geeft grootte 0 als er niets onthouden is', () => {
		expect(leesWeergave(new GeheugenOpslag())).toEqual({ grootte: 0, alleRegelsVast: false });
	});

	it('geeft terug wat bewaarWeergave onthield', () => {
		const opslag = new GeheugenOpslag();
		bewaarWeergave(opslag, { grootte: 2, alleRegelsVast: true });

		expect(leesWeergave(opslag)).toEqual({ grootte: 2, alleRegelsVast: true });
	});

	it.each([
		['kapotte JSON', '{niet goed'],
		['een getal', '5'],
		['een lijst', '[1]'],
	])('valt bij %s terug op grootte 0', (_naam, tekst) => {
		const opslag = new GeheugenOpslag();
		opslag.setItem('bet-weergave', tekst);

		expect(leesWeergave(opslag)).toEqual({ grootte: 0, alleRegelsVast: false });
	});

	it('neemt een onbekende grootte niet over', () => {
		const opslag = new GeheugenOpslag();
		opslag.setItem('bet-weergave', JSON.stringify({ grootte: 9 }));

		expect(leesWeergave(opslag)).toEqual({ grootte: 0, alleRegelsVast: false });
	});

	it('leest de grootte uit een oudere opslag met meer velden', () => {
		const opslag = new GeheugenOpslag();
		opslag.setItem('bet-weergave', JSON.stringify({ grootte: -1, zijbalkIngeklapt: true }));

		expect(leesWeergave(opslag)).toEqual({ grootte: -1, alleRegelsVast: false });
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

		expect(() => bewaarWeergave(weigert, { grootte: 0, alleRegelsVast: false })).not.toThrow();
	});
});
