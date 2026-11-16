import { describe, expect, it } from 'vitest';
import { schuifAfstand, schuifstand, scrollVoorHuidig } from './stripSchuiven';

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

describe('scrollVoorHuidig', () => {
	const hoofdstuk = (links: number) => ({ links, breedte: 50 });

	it('laat de strip staan als het open hoofdstuk ruim in beeld staat', () => {
		expect(scrollVoorHuidig(300, 800, hoofdstuk(600), 40)).toBeNull();
	});

	it('zet het hoofdstuk in het midden als het onder de linker- of rechterrand valt', () => {
		expect(scrollVoorHuidig(300, 800, hoofdstuk(320), 40)).toBe(320 - 375);
		expect(scrollVoorHuidig(300, 800, hoofdstuk(1030), 40)).toBe(1030 - 375);
	});

	it('zet een hoofdstuk buiten beeld in het midden', () => {
		expect(scrollVoorHuidig(0, 800, hoofdstuk(1500), 40)).toBe(1500 - 375);
	});
});
