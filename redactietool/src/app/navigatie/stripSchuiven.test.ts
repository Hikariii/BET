import { describe, expect, it } from 'vitest';
import { schuifAfstand, schuifstand } from './stripSchuiven';

describe('schuifstand', () => {
	it('toont geen pijltjes als de hele strip past', () => {
		expect(schuifstand(0, 600, 600)).toEqual({ terug: false, verder: false });
	});

	it('toont alleen verder aan het begin van een te lange strip', () => {
		expect(schuifstand(0, 400, 1000)).toEqual({ terug: false, verder: true });
	});

	it('toont beide in het midden en alleen terug aan het eind', () => {
		expect(schuifstand(300, 400, 1000)).toEqual({ terug: true, verder: true });
		expect(schuifstand(600, 400, 1000)).toEqual({ terug: true, verder: false });
	});

	it('negeert een afrondingsverschil van een pixel aan de randen', () => {
		expect(schuifstand(1, 400, 1000)).toEqual({ terug: false, verder: true });
		expect(schuifstand(599, 400, 1000)).toEqual({ terug: true, verder: false });
	});
});

describe('schuifAfstand', () => {
	it('schuift ongeveer een strookbreedte, met overlap', () => {
		expect(schuifAfstand(500)).toBe(400);
	});
});
