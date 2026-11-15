import { describe, expect, it } from 'vitest';
import { leesAdres, maakAdres, type Adres } from './adres';

describe('leesAdres', () => {
	it('leest boek, hoofdstuk en vers', () => {
		expect(leesAdres('#/lukas/9/22')).toEqual({ soort: 'hoofdstuk', boek: 'lukas', hoofdstuk: 9, vers: 22 });
	});

	it('leest een adres zonder vers als het hele hoofdstuk', () => {
		expect(leesAdres('#/lukas/9')).toEqual({ soort: 'hoofdstuk', boek: 'lukas', hoofdstuk: 9, vers: null });
	});

	it('leest een slash achteraan als dezelfde plek, ook zonder vers', () => {
		expect(leesAdres('#/lukas/9/')).toEqual({ soort: 'hoofdstuk', boek: 'lukas', hoofdstuk: 9, vers: null });
		expect(leesAdres('#/lukas/9/22/')).toEqual({ soort: 'hoofdstuk', boek: 'lukas', hoofdstuk: 9, vers: 22 });
	});

	it('leest het scherm Begrippen, zonder tabblad als Besloten', () => {
		expect(leesAdres('#/lukas/begrippen')).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'besloten' });
		expect(leesAdres('#/lukas/begrippen/gevonden')).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'gevonden' });
		expect(leesAdres('#/lukas/begrippen/vragen/')).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'vragen' });
	});

	it('geeft null voor een onbekend tabblad', () => {
		expect(leesAdres('#/lukas/begrippen/onbekend')).toBeNull();
	});

	it('geeft null voor een boeknaam met een ongeldige procentcodering', () => {
		expect(leesAdres('#/%E0%A4%A/1')).toBeNull();
		expect(leesAdres('#/%E0%A4%A/1/2')).toBeNull();
		expect(leesAdres('#/%E0%A4%A/begrippen')).toBeNull();
	});

	it('geeft null voor een leeg of onbegrijpelijk adres', () => {
		expect(leesAdres('')).toBeNull();
		expect(leesAdres('#/lukas')).toBeNull();
		expect(leesAdres('#/lukas/negen')).toBeNull();
		expect(leesAdres('#/lukas/9/22/3')).toBeNull();
	});

	it('geeft terug wat maakAdres schrijft', () => {
		const adressen: Adres[] = [
			{ soort: 'hoofdstuk', boek: 'het boek', hoofdstuk: 4, vers: 18 },
			{ soort: 'begrippen', boek: 'het boek', tabblad: 'vragen' },
		];
		for (const adres of adressen) expect(leesAdres(maakAdres(adres))).toEqual(adres);
	});
});

describe('maakAdres', () => {
	it('schrijft het adres met en zonder vers, en van een tabblad', () => {
		expect(maakAdres({ soort: 'hoofdstuk', boek: 'lukas', hoofdstuk: 9, vers: 22 })).toBe('#/lukas/9/22');
		expect(maakAdres({ soort: 'hoofdstuk', boek: 'lukas', hoofdstuk: 9, vers: null })).toBe('#/lukas/9');
		expect(maakAdres({ soort: 'begrippen', boek: 'lukas', tabblad: 'gevonden' })).toBe('#/lukas/begrippen/gevonden');
	});
});
