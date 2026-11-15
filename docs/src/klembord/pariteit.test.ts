import { describe, expect, it } from 'vitest';
import { naarPlatteTekst, naarWordHtml } from './naarWordHtml';
import {
	leesPrototypeInvoer,
	leesPrototypePlatteTekst,
	leesPrototypeVariantA,
	stijlenUitSjabloon,
} from './prototype.testhulp';

describe('naarWordHtml tegen variant A van het prototype', () => {
	const hoofdstukken = leesPrototypeInvoer();
	const verwacht = leesPrototypeVariantA();
	const eigen = naarWordHtml(hoofdstukken, stijlenUitSjabloon());

	it('maakt byte-gelijke HTML voor Lukas 2, 3, 5 en 17', () => {
		expect(eigen).toBe(verwacht);
	});

	it('naarPlatteTekst maakt dezelfde platte tekst als het prototype', () => {
		expect(naarPlatteTekst(hoofdstukken)).toBe(leesPrototypePlatteTekst());
	});
});
