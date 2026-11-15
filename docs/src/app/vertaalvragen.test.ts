import { describe, expect, it } from 'vitest';
import type { OpenVraag, VersRef } from '../data/types';
import { aantalOpenVragen, vragenBijVers } from './vertaalvragen';

function maakVraag(kwestie: string, status: string, verzen: VersRef[]): OpenVraag {
	return { plaats: '', kwestie, gekozen: '', alternatief: '', status, besluit: '', verzen };
}

const gezegend = maakVraag('Gezegend', 'open', [
	{ hoofdstuk: 1, vers: 45 },
	{ hoofdstuk: 6, vers: 20 },
	{ hoofdstuk: 6, vers: 22 },
]);
const opgewekt = maakVraag('opgewekt', 'open', [{ hoofdstuk: 9, vers: 22 }]);
const verzoeking = maakVraag('verzoeking', 'voorlopig besloten', [{ hoofdstuk: 6, vers: 23 }]);
const zonderVerzen = maakVraag('Wee jullie', 'open', []);
const alle = [gezegend, opgewekt, verzoeking, zonderVerzen];

describe('vragenBijVers', () => {
	it('geeft de vragen met precies dit vers, ook als ze besloten zijn', () => {
		expect(vragenBijVers(alle, 6, 20)).toEqual([gezegend]);
		expect(vragenBijVers(alle, 6, 23)).toEqual([verzoeking]);
	});

	it('koppelt op hoofdstuk en vers samen: vers 22 van een ander hoofdstuk hoort er niet bij', () => {
		expect(vragenBijVers(alle, 9, 22)).toEqual([opgewekt]);
		expect(vragenBijVers(alle, 1, 22)).toEqual([]);
	});

	it('geeft niets voor een vraag zonder verzen', () => {
		expect(vragenBijVers([zonderVerzen], 6, 22)).toEqual([]);
	});
});

describe('aantalOpenVragen', () => {
	it('telt alleen vragen met status open waarvan een vers in het hoofdstuk valt', () => {
		expect(aantalOpenVragen(alle, 9)).toBe(1);
		expect(aantalOpenVragen(alle, 1)).toBe(1);
		expect(aantalOpenVragen(alle, 2)).toBe(0);
	});

	it('telt een vraag met twee verzen in hetzelfde hoofdstuk één keer', () => {
		expect(aantalOpenVragen([gezegend], 6)).toBe(1);
	});

	it('telt een besloten vraag niet mee', () => {
		expect(aantalOpenVragen([verzoeking], 6)).toBe(0);
	});

	it('leest de status zonder letterverschil of spaties', () => {
		expect(aantalOpenVragen([maakVraag('x', ' Open ', [{ hoofdstuk: 3, vers: 1 }])], 3)).toBe(1);
	});
});
