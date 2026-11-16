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

	it('leest één vraag op het tabblad Vertaalvragen, met een sleutel vol vreemde tekens', () => {
		const sleutel = 'register-"Gezegend" / zalig: eeuwigleven?-1';
		const adres = maakAdres({ soort: 'begrippen', boek: 'lukas', tabblad: 'vragen', vraag: sleutel });

		expect(leesAdres(adres)).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'vragen', vraag: sleutel });
		expect(leesAdres('#/lukas/begrippen/vragen/vers-4-2-1/')).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'vragen', vraag: 'vers-4-2-1' });
	});

	it('geeft null voor een vraag op een ander tabblad of met een ongeldige procentcodering', () => {
		expect(leesAdres('#/lukas/begrippen/gevonden/vers-4-2-1')).toBeNull();
		expect(leesAdres('#/lukas/begrippen/vragen/%E0%A4%A')).toBeNull();
		expect(leesAdres('#/lukas/begrippen/vragen/a/b')).toBeNull();
	});

	it('leest het overzicht van wat opgeslagen is, ook met een slash achteraan', () => {
		expect(leesAdres('#/lukas/opgeslagen')).toEqual({ soort: 'bewaard', boek: 'lukas' });
		expect(leesAdres('#/lukas/opgeslagen/')).toEqual({ soort: 'bewaard', boek: 'lukas' });
		expect(leesAdres('#/lukas/opgeslagen/3')).toBeNull();
	});

	it('leest het oude adres bewaard nog als het overzicht', () => {
		expect(leesAdres('#/lukas/bewaard')).toEqual({ soort: 'bewaard', boek: 'lukas' });
	});

	it('leest de pagina Richtlijn met en zonder paragraaf, ook met een slash achteraan', () => {
		expect(leesAdres('#/lukas/richtlijn')).toEqual({ soort: 'richtlijn', boek: 'lukas', paragraaf: null });
		expect(leesAdres('#/lukas/richtlijn/')).toEqual({ soort: 'richtlijn', boek: 'lukas', paragraaf: null });
		expect(leesAdres('#/lukas/richtlijn/17B')).toEqual({ soort: 'richtlijn', boek: 'lukas', paragraaf: '17B' });
		expect(leesAdres('#/lukas/richtlijn/11/')).toEqual({ soort: 'richtlijn', boek: 'lukas', paragraaf: '11' });
	});

	it('leest een paragraaf met een kleine letter als hoofdletter en weigert wat geen paragraafnummer is', () => {
		expect(leesAdres('#/lukas/richtlijn/17b')).toEqual({ soort: 'richtlijn', boek: 'lukas', paragraaf: '17B' });
		expect(leesAdres('#/lukas/richtlijn/over-deze-versie')).toBeNull();
		expect(leesAdres('#/lukas/richtlijn/17B/2')).toBeNull();
	});

	it('leest de galerij, ook met een slash achteraan', () => {
		expect(leesAdres('#/galerij')).toEqual({ soort: 'galerij' });
		expect(leesAdres('#/galerij/')).toEqual({ soort: 'galerij' });
	});

	it('leest een boek dat galerij heet nog steeds als boek', () => {
		expect(leesAdres('#/galerij/9')).toEqual({ soort: 'hoofdstuk', boek: 'galerij', hoofdstuk: 9, vers: null });
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
			{ soort: 'bewaard', boek: 'het boek' },
			{ soort: 'richtlijn', boek: 'het boek', paragraaf: '7A' },
			{ soort: 'richtlijn', boek: 'het boek', paragraaf: null },
			{ soort: 'galerij' },
		];
		for (const adres of adressen) expect(leesAdres(maakAdres(adres))).toEqual(adres);
	});
});

describe('maakAdres', () => {
	it('schrijft het adres met en zonder vers, en van een tabblad', () => {
		expect(maakAdres({ soort: 'hoofdstuk', boek: 'lukas', hoofdstuk: 9, vers: 22 })).toBe('#/lukas/9/22');
		expect(maakAdres({ soort: 'hoofdstuk', boek: 'lukas', hoofdstuk: 9, vers: null })).toBe('#/lukas/9');
		expect(maakAdres({ soort: 'begrippen', boek: 'lukas', tabblad: 'gevonden' })).toBe('#/lukas/begrippen/gevonden');
		expect(maakAdres({ soort: 'bewaard', boek: 'lukas' })).toBe('#/lukas/opgeslagen');
		expect(maakAdres({ soort: 'richtlijn', boek: 'lukas', paragraaf: null })).toBe('#/lukas/richtlijn');
		expect(maakAdres({ soort: 'richtlijn', boek: 'lukas', paragraaf: '17B' })).toBe('#/lukas/richtlijn/17B');
		expect(maakAdres({ soort: 'galerij' })).toBe('#/galerij');
	});
});
