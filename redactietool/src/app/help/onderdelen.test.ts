import { describe, expect, it } from 'vitest';
import { TABBLADEN } from '../adres';
import { boekPlekken } from '../navigatie/boekplekken';
import { alleOnderdelen, helpPlekBijPagina, HELP_PLEKKEN, paginaOnderdeel } from './onderdelen';

describe('helpPlekBijPagina', () => {
	it('geeft bij elk tabblad van Keuzes en vragen dat tabblad', () => {
		expect(TABBLADEN.map((tabblad) => helpPlekBijPagina('begrippen', tabblad))).toEqual(['besloten', 'gevonden', 'vragen', 'vervangen']);
	});

	it('geeft de hoofdstukken bij een hoofdstuk en Opgeslagen bij de pagina Opgeslagen', () => {
		expect(helpPlekBijPagina('hoofdstuk', null)).toBe('hoofdstukken');
		expect(helpPlekBijPagina('bewaard', null)).toBe('bewaard');
	});
});

describe('onderdelen van de help', () => {
	it('opent bij het onderdeel van de pagina', () => {
		expect(paginaOnderdeel(helpPlekBijPagina('begrippen', 'vervangen'))).toBe('pagina-vervangen');
		expect(paginaOnderdeel(helpPlekBijPagina('bewaard', null))).toBe('pagina-bewaard');
	});

	it('heeft een onderdeel voor elke plek in de balk en voor Opgeslagen', () => {
		const plekken = boekPlekken('lukas', { precedenten: [], openVragen: [] }, null, 1).map((plek) => plek.plek);
		expect(plekken).toHaveLength(5);
		for (const plek of plekken) expect(HELP_PLEKKEN).toContain(plek);
		expect(HELP_PLEKKEN).toContain('bewaard');
		expect(alleOnderdelen()).toEqual(expect.arrayContaining(plekken.map(paginaOnderdeel)));
	});
});
