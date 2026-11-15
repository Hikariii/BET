import { describe, expect, it } from 'vitest';
import { layoutUitZoekreeks, naslagPlek, regelsWeergave, zoekreeksMetLayout } from './layoutProef';

describe('layoutUitZoekreeks', () => {
	it('geeft null zonder parameter, zodat de tool blijft zoals hij is', () => {
		expect(layoutUitZoekreeks('')).toBeNull();
		expect(layoutUitZoekreeks('?ander=r1')).toBeNull();
	});

	it('leest de gekozen proef', () => {
		expect(layoutUitZoekreeks('?layout=r1')).toBe('r1');
		expect(layoutUitZoekreeks('?x=1&layout=r4')).toBe('r4');
		expect(layoutUitZoekreeks('?layout=nu')).toBe('nu');
	});

	it('negeert een onbekende waarde', () => {
		expect(layoutUitZoekreeks('?layout=r5')).toBeNull();
		expect(layoutUitZoekreeks('?layout=p3')).toBe('p3');
		expect(layoutUitZoekreeks('?layout=p4')).toBeNull();
		expect(layoutUitZoekreeks('?layout=')).toBeNull();
	});
});

describe('zoekreeksMetLayout', () => {
	it('zet de proef en houdt andere parameters', () => {
		expect(zoekreeksMetLayout('', 'r2')).toBe('?layout=r2');
		expect(zoekreeksMetLayout('?x=1&layout=r1', 'r3')).toBe('?x=1&layout=r3');
	});

	it('geeft een zoekreeks die terug te lezen is', () => {
		expect(layoutUitZoekreeks(zoekreeksMetLayout('?layout=r1', 'r4'))).toBe('r4');
	});
});

describe('regelsWeergave', () => {
	it('volgt de schakelaar zonder proef, bij nu, r4, p1 en p3', () => {
		for (const layout of [null, 'nu', 'r4', 'p1', 'p3'] as const) {
			expect(regelsWeergave(layout, true)).toBe('kolom');
			expect(regelsWeergave(layout, false)).toBe('onder-gekozen');
		}
	});

	it('kent bij r1 tot r3 geen kolom, wat de schakelaar ook zegt', () => {
		expect(regelsWeergave('r1', true)).toBe('onder-altijd');
		expect(regelsWeergave('r2', true)).toBe('uitklapbaar');
		expect(regelsWeergave('r3', false)).toBe('zwevend');
	});

	it('houdt bij p2 de kolom, ook als de schakelaar uit staat, want de naslag neemt die plek', () => {
		expect(regelsWeergave('p2', false)).toBe('kolom');
	});
});

describe('naslagPlek', () => {
	it('duwt de pagina zonder proef en bij r1 tot r3', () => {
		for (const layout of [null, 'nu', 'r1', 'r2', 'r3'] as const) {
			expect(naslagPlek(layout)).toBe('rechts');
		}
	});

	it('laat r4 en p1 zweven, p2 de kolom nemen en p3 een kaart maken', () => {
		expect(naslagPlek('r4')).toBe('zwevend');
		expect(naslagPlek('p1')).toBe('zwevend');
		expect(naslagPlek('p2')).toBe('kolom');
		expect(naslagPlek('p3')).toBe('kaart');
	});
});

