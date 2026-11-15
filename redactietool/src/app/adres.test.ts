import { describe, expect, it } from 'vitest';
import { leesAdres, maakAdres } from './adres';

describe('leesAdres', () => {
	it('leest boek, hoofdstuk en vers', () => {
		expect(leesAdres('#/lukas/9/22')).toEqual({ boek: 'lukas', hoofdstuk: 9, vers: 22 });
	});

	it('leest een adres zonder vers als het hele hoofdstuk', () => {
		expect(leesAdres('#/lukas/9')).toEqual({ boek: 'lukas', hoofdstuk: 9, vers: null });
	});

	it('geeft null voor een leeg of onbegrijpelijk adres', () => {
		expect(leesAdres('')).toBeNull();
		expect(leesAdres('#/lukas')).toBeNull();
		expect(leesAdres('#/lukas/negen')).toBeNull();
		expect(leesAdres('#/lukas/9/22/3')).toBeNull();
	});

	it('geeft terug wat maakAdres schrijft', () => {
		const adres = { boek: 'het boek', hoofdstuk: 4, vers: 18 };
		expect(leesAdres(maakAdres(adres))).toEqual(adres);
	});
});

describe('maakAdres', () => {
	it('schrijft het adres met en zonder vers', () => {
		expect(maakAdres({ boek: 'lukas', hoofdstuk: 9, vers: 22 })).toBe('#/lukas/9/22');
		expect(maakAdres({ boek: 'lukas', hoofdstuk: 9, vers: null })).toBe('#/lukas/9');
	});
});
