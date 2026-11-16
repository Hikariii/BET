import { describe, expect, it } from 'vitest';
import type { HoofdstukData, OpenVraag, Precedent, Referentie } from '../../data/types';
import { boekPlekken } from './boekplekken';

function registerVraag(status: string): OpenVraag {
	return { plaats: '', kwestie: 'kwestie', gekozen: '', alternatief: '', status, besluit: '', verzen: [] };
}

function precedent(): Precedent {
	return { sectie: '', bron: 'x', vereenvoudigd: 'y', plaats: '', status: 'vast', opmerking: '' };
}

function hoofdstukMetVragen(nummer: number, algemeneVragen: string[]): Pick<HoofdstukData, 'nummer' | 'log'> {
	return { nummer, log: { algemeneVragen, verzen: [] } };
}

const referentie: Referentie = {
	precedenten: [precedent(), precedent(), precedent()],
	openVragen: [registerVraag('open'), registerVraag('besloten'), registerVraag('open')],
};
const hoofdstukken = [hoofdstukMetVragen(5, ['**5:9, log open:** OPEN', '**5:1, log onbeslist:** zonder woord']), hoofdstukMetVragen(3, ['**3:7, nog een:** OPEN'])];

describe('boekPlekken', () => {
	it('geeft de plekken in vaste volgorde met de adressen van de tabbladen', () => {
		const plekken = boekPlekken('lukas', referentie, hoofdstukken, 9);
		expect(plekken.map((plek) => plek.naam)).toEqual(['Hoofdstukken', 'Vertaalkeuzes', 'Zo vertaald', 'Vertaalvragen', 'Zoeken en vervangen']);
		expect(plekken.map((plek) => plek.adres)).toEqual([
			'#/lukas/9',
			'#/lukas/begrippen/besloten',
			'#/lukas/begrippen/gevonden',
			'#/lukas/begrippen/vragen',
			'#/lukas/begrippen/vervangen',
		]);
	});

	it('telt de vertaalkeuzes en de open vragen uit het register en de logs, niet de besloten of onbeslist', () => {
		const plekken = boekPlekken('lukas', referentie, hoofdstukken, 1);
		expect(plekken.map((plek) => plek.aantal?.tekst ?? null)).toEqual([null, '3 vertaalkeuzes', null, '4 open vragen', null]);
	});

	it('kent het aantal open vragen niet zolang de hoofdstukken laden', () => {
		const plekken = boekPlekken('lukas', referentie, null, 1);
		expect(plekken.find((plek) => plek.plek === 'vragen')?.aantal).toBeNull();
		expect(plekken.find((plek) => plek.plek === 'besloten')?.aantal?.getal).toBe(3);
	});

	it('gebruikt het enkelvoud bij één open vraag', () => {
		const plekken = boekPlekken('lukas', { ...referentie, openVragen: [registerVraag('open')] }, [], 1);
		expect(plekken.find((plek) => plek.plek === 'vragen')?.aantal).toEqual({ getal: 1, tekst: '1 open vraag' });
	});
});
