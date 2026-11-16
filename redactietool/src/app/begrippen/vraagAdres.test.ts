import { describe, expect, it } from 'vitest';
import { verzamelVragen } from '../../begrippen/verzamelVragen';
import { vraagSleutels } from '../../begrippen/vragenOverzicht';
import type { HoofdstukData, OpenVraag } from '../../data/types';
import { leesAdres } from '../adres';
import { maakVersVraagAdres, registerVraagSleutel, vraagAdres } from './vraagAdres';

function registerRegel(velden: Partial<OpenVraag>): OpenVraag {
	return { plaats: 'Lk 1:1', kwestie: 'kwestie', gekozen: 'gekozen', alternatief: 'a) een; b) twee', status: 'open', besluit: '', verzen: [], ...velden };
}

const OPEN_VRAGEN = [
	registerRegel({ kwestie: 'Gezegend "zalig" of "gezegend"', verzen: [{ hoofdstuk: 4, vers: 2 }] }),
	registerRegel({ kwestie: 'woestenij', status: 'besloten', verzen: [{ hoofdstuk: 5, vers: 9 }] }),
];

function hoofdstuk(nummer: number, algemeneVragen: string[], verzen: HoofdstukData['log']['verzen'] = []): Pick<HoofdstukData, 'nummer' | 'log'> {
	return { nummer, log: { algemeneVragen, verzen } };
}

describe('vraagAdres', () => {
	it('wijst naar één vraag op het tabblad Vertaalvragen', () => {
		expect(leesAdres(vraagAdres('lukas', 'vers-4-2-1'))).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'vragen', vraag: 'vers-4-2-1' });
	});
});

describe('registerVraagSleutel', () => {
	it('geeft dezelfde sleutel als vraagSleutels op het tabblad Vertaalvragen', () => {
		const sleutels = vraagSleutels(verzamelVragen(OPEN_VRAGEN, [hoofdstuk(4, ['**4:2, Mensenzoon**: OPEN.'])]));

		expect([...sleutels.values()]).toContain(registerVraagSleutel('Gezegend "zalig" of "gezegend"'));
		expect([...sleutels.values()]).toContain(registerVraagSleutel('woestenij'));
	});
});

describe('maakVersVraagAdres', () => {
	const logVerzen = [{ verzen: [3], wijzigingen: [], vragen: ['Zie vraag 1'] }];
	const adresBij = maakVersVraagAdres('lukas', OPEN_VRAGEN, hoofdstuk(4, ['**4:3, Mensenzoon**: OPEN. Moet dit blijven?'], logVerzen));

	it('wijst bij een vers met een registervraag naar die vraag', () => {
		const adres = leesAdres(adresBij(2) ?? '');

		expect(adres).toEqual({ soort: 'begrippen', boek: 'lukas', tabblad: 'vragen', vraag: registerVraagSleutel('Gezegend "zalig" of "gezegend"') });
	});

	it('wijst bij een vers met een vraag uit het hoofdstuklog naar die vraag', () => {
		expect(leesAdres(adresBij(3) ?? '')).toMatchObject({ tabblad: 'vragen', vraag: 'hoofdstuk-4-1-1' });
	});

	it('geeft null bij een vers zonder vraag, en bij een vers van een ander hoofdstuk', () => {
		expect(adresBij(1)).toBeNull();
		expect(adresBij(9)).toBeNull();
	});
});
