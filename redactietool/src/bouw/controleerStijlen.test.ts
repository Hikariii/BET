import { describe, expect, it } from 'vitest';
import type { WordStijl } from '../data/types';
import { leesStijlen } from '../sjabloon/leesStijlen';
import { leesStylesXmlVanSjabloon } from '../sjabloon/sjabloon.testhulp';
import { ontbrekendeStijlen } from './controleerStijlen';

const lukasStijlen = leesStijlen(leesStylesXmlVanSjabloon());

function stijl(id: string, soort: WordStijl['soort']): WordStijl {
	return { id, naam: id, soort, kleur: null, vet: false, cursief: false };
}

describe('ontbrekendeStijlen', () => {
	it('vindt niets op het sjabloon van Lukas', () => {
		expect(ontbrekendeStijlen(lukasStijlen)).toEqual([]);
	});

	it('noemt een stijl die het sjabloon niet heeft', () => {
		const zonderTorah = lukasStijlen.filter(({ id }) => id !== 'Torah');

		expect(ontbrekendeStijlen(zonderTorah)).toEqual(["tekenstijl 'Torah' ontbreekt"]);
	});

	it('noemt een stijl die als het verkeerde soort bestaat', () => {
		const torahAlsAlinea = lukasStijlen.map((bestaand) => (bestaand.id === 'Torah' ? stijl('Torah', 'alinea') : bestaand));

		expect(ontbrekendeStijlen(torahAlsAlinea)).toEqual(["'Torah' is een alineastijl, verwacht een tekenstijl"]);
	});

	it('noemt alle stijlen van een leeg sjabloon', () => {
		expect(ontbrekendeStijlen([])).toHaveLength(13);
	});
});
