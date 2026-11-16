import { describe, expect, it } from 'vitest';
import { middenBinnen } from './wijsAan';

const vak = { left: 0, right: 200, top: 0, bottom: 100 };

describe('middenBinnen', () => {
	it('telt een element met het midden in het vak als zichtbaar', () => {
		expect(middenBinnen({ left: 10, right: 50, top: 10, bottom: 30 }, vak)).toBe(true);
	});

	it('telt een element dat over de rand steekt nog als zichtbaar zolang het midden binnen blijft', () => {
		expect(middenBinnen({ left: 150, right: 230, top: 40, bottom: 60 }, vak)).toBe(true);
	});

	it('telt een element met het midden onder het vak als afgekapt, zoals "nog N regels" in een ingeklapt vak', () => {
		expect(middenBinnen({ left: 10, right: 90, top: 95, bottom: 135 }, vak)).toBe(false);
		expect(middenBinnen({ left: 10, right: 90, top: 150, bottom: 170 }, vak)).toBe(false);
	});

	it.each([
		['links', { left: -90, right: -10, top: 40, bottom: 60 }],
		['rechts', { left: 210, right: 290, top: 40, bottom: 60 }],
		['boven', { left: 10, right: 90, top: -40, bottom: -10 }],
	])('telt een element met het midden buiten het vak (%s) als afgekapt', (_richting, element) => {
		expect(middenBinnen(element, vak)).toBe(false);
	});
});
