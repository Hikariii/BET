import { describe, expect, it } from 'vitest';
import { adresMetOntwerp, cssVanOntwerp, leesOntwerp, ONTWERPEN, type OntwerpConfig } from './ontwerpProef';

function config(zoekdeel: string): OntwerpConfig {
	const ontwerp = leesOntwerp(zoekdeel);
	if (ontwerp.variant === null) throw new Error(`Geen variant voor ${zoekdeel}.`);
	return ontwerp.config;
}

describe('leesOntwerp', () => {
	it('geeft zonder parameter de tool zoals hij was', () => {
		expect(leesOntwerp('')).toEqual({ variant: null });
		expect(leesOntwerp('?iets=anders')).toEqual({ variant: null });
	});

	it('negeert een onbekende variant', () => {
		expect(leesOntwerp('?ontwerp=v9')).toEqual({ variant: null });
		expect(leesOntwerp('?ontwerp=v8')).toEqual({ variant: null });
		expect(leesOntwerp('?ontwerp=')).toEqual({ variant: null });
	});

	it('kent alle varianten met een titel', () => {
		for (const naam of ONTWERPEN) {
			const ontwerp = leesOntwerp(`?ontwerp=${naam}`);
			expect(ontwerp.variant).toBe(naam);
			expect(ontwerp.variant === null ? '' : ontwerp.titel).not.toBe('');
		}
	});

	it('geeft v1 en v2 een zijbalk met leesbreedte in tekens, en alleen v2 twee balken', () => {
		expect(config('?ontwerp=v1')).toEqual({
			bovenbalk: 'een',
			navigatie: 'zijbalk',
			breedte: 'tekens',
			status: 'tekst',
			boeknavigatie: 'knop',
			grootteStandaard: 0,
			zijbalkStandaardIngeklapt: false,
		});
		expect(config('?ontwerp=v2')).toEqual({ ...config('?ontwerp=v1'), bovenbalk: 'twee' });
	});

	it('geeft v3 een strip zonder zijbalk, volle breedte en een icoon', () => {
		expect(config('?ontwerp=v3')).toMatchObject({ bovenbalk: 'een', navigatie: 'strip', breedte: 'vol', status: 'icoon' });
	});

	it('geeft v4 volle breedte met zijbalk, v5 twee balken met de overzichtspagina', () => {
		expect(config('?ontwerp=v4')).toMatchObject({ bovenbalk: 'een', navigatie: 'zijbalk', breedte: 'vol', status: 'icoon' });
		expect(config('?ontwerp=v5')).toMatchObject({ bovenbalk: 'twee', navigatie: 'zijbalk', breedte: 'tekens', status: 'pagina' });
	});

	it('geeft alleen v6 een grotere standaardletter en een ingeklapte zijbalk', () => {
		expect(config('?ontwerp=v6')).toMatchObject({ grootteStandaard: 1, zijbalkStandaardIngeklapt: true, status: 'tekst' });
		for (const naam of ['v1', 'v2', 'v3', 'v4', 'v5', 'v7', 'v8a', 'v8b', 'v8c']) {
			expect(config(`?ontwerp=${naam}`)).toMatchObject({ grootteStandaard: 0, zijbalkStandaardIngeklapt: false });
		}
	});

	it('geeft v7 de opzet van v3 met de balken van v5 en de knop Keuzes en vragen', () => {
		expect(config('?ontwerp=v7')).toEqual({
			bovenbalk: 'twee',
			navigatie: 'strip',
			breedte: 'vol',
			status: 'pagina',
			boeknavigatie: 'knop',
			grootteStandaard: 0,
			zijbalkStandaardIngeklapt: false,
		});
	});

	it('laat v8a, v8b en v8c alleen in de boeknavigatie van v7 verschillen, en v8c ook in de bewaarstatus', () => {
		const basis = config('?ontwerp=v7');
		expect(config('?ontwerp=v8a')).toEqual({ ...basis, boeknavigatie: 'tabbladen' });
		expect(config('?ontwerp=v8b')).toEqual({ ...basis, boeknavigatie: 'menu' });
		expect(config('?ontwerp=v8c')).toEqual({ ...basis, boeknavigatie: 'werkbalk', status: 'kort' });
		expect(config('?ontwerp=v8d')).toEqual({ ...basis, boeknavigatie: 'tabbladen-iconen' });
	});

	it('geeft alleen v8a tot en met v8c een andere boeknavigatie dan de knop', () => {
		const metKnop = ONTWERPEN.filter((naam) => config(`?ontwerp=${naam}`).boeknavigatie === 'knop');
		expect(metKnop).toEqual(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7']);
	});
});

describe('cssVanOntwerp', () => {
	it('laadt voor v8a tot en met v8c eerst de basis v7, voor de andere varianten alleen hun eigen css', () => {
		expect(cssVanOntwerp('v7')).toEqual(['v7']);
		expect(cssVanOntwerp('v8b')).toEqual(['v7', 'v8b']);
		expect(cssVanOntwerp('v8d')).toEqual(['v7', 'v8d']);
		expect(cssVanOntwerp('v3')).toEqual(['v3']);
	});
});

describe('adresMetOntwerp', () => {
	it('zet de variant en houdt pad en hash', () => {
		expect(adresMetOntwerp('http://localhost:4220/BET/#/lukas/4/2', 'v3')).toBe('http://localhost:4220/BET/?ontwerp=v3#/lukas/4/2');
		expect(adresMetOntwerp('http://localhost:4220/BET/?ontwerp=v1#/lukas/4', 'v5')).toBe('http://localhost:4220/BET/?ontwerp=v5#/lukas/4');
	});

	it('haalt de variant weg bij null', () => {
		expect(adresMetOntwerp('http://localhost:4220/BET/?ontwerp=v1#/lukas/4', null)).toBe('http://localhost:4220/BET/#/lukas/4');
	});
});
