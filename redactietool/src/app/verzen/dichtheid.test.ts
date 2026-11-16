import { describe, expect, it } from 'vitest';
import { adresMetDichtheid, DICHTHEDEN, DICHTHEID_TITELS, leesDichtheid, plaatsNotities } from './dichtheid';

describe('leesDichtheid', () => {
	it('geeft zonder parameter geen dichtheid', () => {
		expect(leesDichtheid('')).toBeNull();
		expect(leesDichtheid('?ontwerp=v1')).toBeNull();
	});

	it('negeert een onbekende waarde', () => {
		expect(leesDichtheid('?verzen=d4')).toBeNull();
		expect(leesDichtheid('?verzen=')).toBeNull();
	});

	it('kent d1 tot d3, ook naast een ontwerpvariant', () => {
		for (const naam of DICHTHEDEN) {
			expect(leesDichtheid(`?verzen=${naam}`)).toBe(naam);
			expect(leesDichtheid(`?ontwerp=v3&verzen=${naam}`)).toBe(naam);
			expect(DICHTHEID_TITELS[naam]).not.toBe('');
		}
	});
});

describe('adresMetDichtheid', () => {
	const huidig = 'http://localhost/BET/?ontwerp=v2&verzen=d1#/lukas/22';

	it('wisselt van dichtheid en laat ontwerp en hash staan', () => {
		const adres = new URL(adresMetDichtheid(huidig, 'd3'));
		expect(adres.searchParams.get('verzen')).toBe('d3');
		expect(adres.searchParams.get('ontwerp')).toBe('v2');
		expect(adres.hash).toBe('#/lukas/22');
	});

	it('haalt de dichtheid weg voor null', () => {
		const adres = new URL(adresMetDichtheid(huidig, null));
		expect(adres.searchParams.has('verzen')).toBe(false);
		expect(adres.searchParams.get('ontwerp')).toBe('v2');
	});
});

describe('plaatsNotities', () => {
	it('laat notities staan die elkaar niet raken', () => {
		const metingen = [
			{ gewenstBoven: 0, hoogte: 40 },
			{ gewenstBoven: 100, hoogte: 40 },
			{ gewenstBoven: 200, hoogte: 40 },
		];
		expect(plaatsNotities(metingen, 8)).toEqual([0, 100, 200]);
	});

	it('schuift een notitie omlaag onder de vorige als die doorloopt', () => {
		const metingen = [
			{ gewenstBoven: 0, hoogte: 150 },
			{ gewenstBoven: 60, hoogte: 40 },
			{ gewenstBoven: 120, hoogte: 40 },
			{ gewenstBoven: 400, hoogte: 40 },
		];
		expect(plaatsNotities(metingen, 8)).toEqual([0, 158, 206, 400]);
	});

	it('houdt de tussenruimte aan als een notitie er precies naast past', () => {
		const metingen = [
			{ gewenstBoven: 0, hoogte: 52 },
			{ gewenstBoven: 60, hoogte: 40 },
		];
		expect(plaatsNotities(metingen, 8)).toEqual([0, 60]);
		expect(plaatsNotities(metingen, 12)).toEqual([0, 64]);
	});

	it('laat geen enkele notitie een andere raken en houdt de volgorde', () => {
		const metingen = [
			{ gewenstBoven: 10, hoogte: 90 },
			{ gewenstBoven: 30, hoogte: 70 },
			{ gewenstBoven: 50, hoogte: 20 },
			{ gewenstBoven: 55, hoogte: 120 },
			{ gewenstBoven: 70, hoogte: 10 },
		];
		const plaatsen = plaatsNotities(metingen, 8);
		expect(plaatsen).toHaveLength(metingen.length);
		plaatsen.forEach((boven, index) => {
			const meting = metingen[index];
			const volgende = plaatsen[index + 1];
			expect(boven).toBeGreaterThanOrEqual(meting?.gewenstBoven ?? Number.POSITIVE_INFINITY);
			if (volgende !== undefined) {
				expect(volgende).toBeGreaterThanOrEqual(boven + (meting?.hoogte ?? Number.POSITIVE_INFINITY) + 8);
			}
		});
	});

	it('geeft niets terug zonder notities', () => {
		expect(plaatsNotities([], 8)).toEqual([]);
	});
});
