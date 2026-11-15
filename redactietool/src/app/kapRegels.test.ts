import { describe, expect, it } from 'vitest';
import { kapRegels } from './kapRegels';

describe('kapRegels', () => {
	it('laat een vers met drie of vier regels ongemoeid', () => {
		expect(kapRegels([3], false)).toEqual({ zichtbaarPerBlok: [3], verborgen: 0 });
		expect(kapRegels([4], false)).toEqual({ zichtbaarPerBlok: [4], verborgen: 0 });
	});

	it('toont drie regels en verbergt de rest vanaf twee verborgen regels', () => {
		expect(kapRegels([5], false)).toEqual({ zichtbaarPerBlok: [3], verborgen: 2 });
		expect(kapRegels([9], false)).toEqual({ zichtbaarPerBlok: [3], verborgen: 6 });
	});

	it('telt over logblokken heen en laat een blok zonder zichtbare regels staan', () => {
		expect(kapRegels([2, 2, 3], false)).toEqual({ zichtbaarPerBlok: [2, 1, 0], verborgen: 4 });
	});

	it('toont alles na uitklappen', () => {
		expect(kapRegels([2, 2, 3], true)).toEqual({ zichtbaarPerBlok: [2, 2, 3], verborgen: 0 });
	});

	it('geeft niets terug voor een vers zonder regels', () => {
		expect(kapRegels([], false)).toEqual({ zichtbaarPerBlok: [], verborgen: 0 });
	});
});
