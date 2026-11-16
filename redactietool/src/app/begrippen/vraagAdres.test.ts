import { describe, expect, it } from 'vitest';
import type { HoofdstukData, OpenVraag } from '../../data/types';
import { leesAdres } from '../adres';
import { maakVersVraag, vraagAdres, vraagNaam } from './vraagAdres';

function registerRegel(velden: Partial<OpenVraag>): OpenVraag {
	return { nr: 'V1', plaats: 'Lk 1:1', kwestie: 'kwestie', gekozen: 'gekozen', alternatief: 'a) een; b) twee', status: 'open', besluit: '', verzen: [], ...velden };
}

const OPEN_VRAGEN = [
	registerRegel({ nr: 'V12', kwestie: 'Gezegend "zalig" of "gezegend"', verzen: [{ hoofdstuk: 4, vers: 2 }] }),
	registerRegel({ nr: 'V13', kwestie: 'woestenij', status: 'besloten', verzen: [{ hoofdstuk: 5, vers: 9 }] }),
];

function hoofdstuk(nummer: number, algemeneVragen: string[], verzen: HoofdstukData['log']['verzen'] = []): Pick<HoofdstukData, 'nummer' | 'log'> {
	return { nummer, log: { algemeneVragen, verzen } };
}

describe('vraagAdres', () => {
	it('wijst met het nummer naar één vraag op het tabblad Vertaalvragen', () => {
		expect(leesAdres(vraagAdres('lukas', 'V12'))).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'vragen', vraag: 'V12' });
		expect(leesAdres(vraagAdres('lukas', 'O5.2'))).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'vragen', vraag: 'O5.2' });
	});
});

describe('vraagNaam', () => {
	it('noemt een nummer uit het register een vertaalvraag en een nummer uit een log een opmerking', () => {
		expect(vraagNaam('V12')).toBe('Vertaalvraag V12');
		expect(vraagNaam('O5.2')).toBe('Opmerking O5.2');
	});
});

describe('maakVersVraag', () => {
	const logVerzen = [{ verzen: [3], wijzigingen: [], vragen: ['Zie vraag 1'] }];
	const vraagBij = maakVersVraag('lukas', OPEN_VRAGEN, hoofdstuk(4, ['**4:3, Mensenzoon**: OPEN. Moet dit blijven?'], logVerzen));

	it('wijst bij een vers met een registervraag naar die vraag met haar nummer', () => {
		const gevonden = vraagBij(2);

		expect(gevonden?.nr).toBe('V12');
		expect(leesAdres(gevonden?.adres ?? '')).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'vragen', vraag: 'V12' });
	});

	it('wijst bij een vers met een vraag uit het hoofdstuklog naar die opmerking', () => {
		expect(vraagBij(3)?.nr).toBe('O4.1');
		expect(leesAdres(vraagBij(3)?.adres ?? '')).toMatchObject({ tabblad: 'vragen', vraag: 'O4.1' });
	});

	it('geeft null bij een vers zonder vraag, en bij een vers van een ander hoofdstuk', () => {
		expect(vraagBij(1)).toBeNull();
		expect(vraagBij(9)).toBeNull();
	});
});
