import { describe, expect, it } from 'vitest';
import { adresMetOntwerp, leesOntwerp, ONTWERPEN, type OntwerpConfig } from './ontwerpProef';

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
		expect(leesOntwerp('?ontwerp=v7')).toEqual({ variant: null });
		expect(leesOntwerp('?ontwerp=')).toEqual({ variant: null });
	});

	it('kent alle zes varianten met een titel', () => {
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
		for (const naam of ['v1', 'v2', 'v3', 'v4', 'v5']) {
			expect(config(`?ontwerp=${naam}`)).toMatchObject({ grootteStandaard: 0, zijbalkStandaardIngeklapt: false });
		}
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
