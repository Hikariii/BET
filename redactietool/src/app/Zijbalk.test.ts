import { describe, expect, it } from 'vitest';
import { gewoneStatusVan } from './Zijbalk';

describe('gewoneStatusVan', () => {
	it('kiest de status die de meeste hoofdstukken hebben', () => {
		expect(gewoneStatusVan(['goedgekeurd', 'review', 'review', 'verwerkt', 'review'])).toBe('review');
	});

	it('kiest een andere status als die vaker voorkomt, zonder vaste voorkeur voor review', () => {
		expect(gewoneStatusVan(['concept', 'review', 'concept', 'concept'])).toBe('concept');
	});

	it('kiest de status als alle hoofdstukken hem hebben', () => {
		expect(gewoneStatusVan(['bij editor', 'bij editor'])).toBe('bij editor');
	});

	it('kiest niets bij een gelijke stand tussen de meest voorkomende statussen', () => {
		expect(gewoneStatusVan(['review', 'review', 'concept', 'concept', 'verwerkt'])).toBeNull();
	});

	it('kiest wel een status als de gelijke stand lager in de rij zit', () => {
		expect(gewoneStatusVan(['review', 'review', 'review', 'concept', 'verwerkt'])).toBe('review');
	});

	it('kiest niets zonder hoofdstukken', () => {
		expect(gewoneStatusVan([])).toBeNull();
	});
});
