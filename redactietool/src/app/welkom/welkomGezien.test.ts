import { describe, expect, it } from 'vitest';
import { GeheugenOpslag, OpslagMetVolleSleutel } from '../../bewaren/testhulp';
import { bewaarWelkomGezien, isWelkomGezien } from './welkomGezien';

describe('welkom gezien', () => {
	it('is niet gezien in een lege browser', () => {
		expect(isWelkomGezien(new GeheugenOpslag())).toBe(false);
	});

	it('is gezien nadat Niet meer tonen onthouden is', () => {
		const opslag = new GeheugenOpslag();

		bewaarWelkomGezien(opslag);

		expect(isWelkomGezien(opslag)).toBe(true);
	});

	it('komt terug als de opslag het onthouden weigert', () => {
		const opslag = new OpslagMetVolleSleutel('bet-welkom-gezien');

		expect(() => bewaarWelkomGezien(opslag)).not.toThrow();
		expect(isWelkomGezien(opslag)).toBe(false);
	});
});
