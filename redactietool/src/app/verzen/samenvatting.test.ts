import { describe, expect, it } from 'vitest';
import type { LogRegel, LogVers } from '../../data/types';
import { maakSamenvatting } from './samenvatting';

function blok(...wijzigingen: LogRegel[]): LogVers {
	return { verzen: [1], wijzigingen, vragen: [] };
}

describe('maakSamenvatting', () => {
	it('geeft een lege samenvatting zonder regels', () => {
		expect(maakSamenvatting([])).toEqual({ eersteRegel: null, paragrafen: [], heeftPrecedent: false });
		expect(maakSamenvatting([blok()]).eersteRegel).toBeNull();
	});

	it('neemt de eerste regel van het eerste logblok met regels', () => {
		const samenvatting = maakSamenvatting([
			blok(),
			blok({ tekst: 'eerste', verwijzingen: [] }, { tekst: 'tweede', verwijzingen: [] }),
			blok({ tekst: 'derde', verwijzingen: [] }),
		]);
		expect(samenvatting.eersteRegel).toBe('eerste');
	});

	it('verzamelt paragrafen zonder dubbelen en ziet een precedent', () => {
		const samenvatting = maakSamenvatting([
			blok(
				{ tekst: 'a', verwijzingen: [{ soort: 'paragraaf', paragraaf: '7A' }] },
				{ tekst: 'b', verwijzingen: [{ soort: 'precedent' }, { soort: 'paragraaf', paragraaf: '11' }] },
				{ tekst: 'c', verwijzingen: [{ soort: 'paragraaf', paragraaf: '7A' }] },
			),
		]);
		expect(samenvatting.paragrafen).toEqual(['7A', '11']);
		expect(samenvatting.heeftPrecedent).toBe(true);
	});

	it('meldt geen precedent als alleen paragrafen verwijzen', () => {
		const samenvatting = maakSamenvatting([blok({ tekst: 'a', verwijzingen: [{ soort: 'paragraaf', paragraaf: '3' }] })]);
		expect(samenvatting.heeftPrecedent).toBe(false);
	});
});
