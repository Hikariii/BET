import { describe, expect, it } from 'vitest';
import type { OpenVraag, Precedent, Referentie } from '../../data/types';
import { boekPlekken } from './boekplekken';

function registerVraag(nr: string, status: string): OpenVraag {
	return { nr, plaats: '', kwestie: 'kwestie', gekozen: '', alternatief: '', status, besluit: '', verzen: [] };
}

function precedent(): Precedent {
	return { sectie: '', bron: 'x', vereenvoudigd: 'y', plaats: '', status: 'vast', opmerking: '' };
}

const referentie: Referentie = {
	precedenten: [precedent(), precedent(), precedent()],
	openVragen: [registerVraag('V1', 'open'), registerVraag('V2', 'besloten'), registerVraag('V3', 'open'), registerVraag('V4', 'voorlopig besloten')],
};

describe('boekPlekken', () => {
	it('geeft de plekken in vaste volgorde met de adressen van de tabbladen', () => {
		const plekken = boekPlekken('lukas', referentie, 9);
		expect(plekken.map((plek) => plek.naam)).toEqual(['Hoofdstukken', 'Vertaalkeuzes', 'Zo vertaald', 'Vertaalvragen', 'Zoeken en vervangen']);
		expect(plekken.map((plek) => plek.adres)).toEqual([
			'#/lukas/9',
			'#/lukas/begrippen/besloten',
			'#/lukas/begrippen/gevonden',
			'#/lukas/begrippen/vragen',
			'#/lukas/begrippen/vervangen',
		]);
	});

	it('telt de vertaalkeuzes en alleen de open vragen uit het register, niet de besloten', () => {
		const plekken = boekPlekken('lukas', referentie, 1);
		expect(plekken.map((plek) => plek.aantal?.tekst ?? null)).toEqual([null, '3 vertaalkeuzes', null, '2 open vragen', null]);
	});

	it('gebruikt het enkelvoud bij één open vraag', () => {
		const plekken = boekPlekken('lukas', { ...referentie, openVragen: [registerVraag('V1', 'open')] }, 1);
		expect(plekken.find((plek) => plek.plek === 'vragen')?.aantal).toEqual({ getal: 1, tekst: '1 open vraag' });
	});
});
