import { describe, expect, it } from 'vitest';
import { leesBijbelbestanden } from './bijbelbestanden.testhulp';
import { parseerHoofdstuk } from './parseer';
import { serialiseerHoofdstuk } from './serialiseer';

function eerstAfwijkendeRegel(origineel: string, terug: string): string {
	const oorspronkelijk = origineel.split('\n');
	const nieuw = terug.split('\n');
	const index = oorspronkelijk.findIndex((regel, plek) => regel !== nieuw[plek]);
	if (index === -1) return `de tekst is ${oorspronkelijk.length === nieuw.length ? 'gelijk' : 'korter of langer'}`;
	return `regel ${index + 1}:\n  oorspronkelijk: ${JSON.stringify(oorspronkelijk[index])}\n  teruggeschreven: ${JSON.stringify(nieuw[index])}`;
}

describe('parseren en terugschrijven geeft de oorspronkelijke tekst', () => {
	it.each(leesBijbelbestanden())('$naam', ({ tekst }) => {
		const terug = serialiseerHoofdstuk(parseerHoofdstuk(tekst));
		expect(terug === tekst ? 'gelijk' : eerstAfwijkendeRegel(tekst, terug)).toBe('gelijk');
		expect(Buffer.from(terug, 'utf-8').equals(Buffer.from(tekst, 'utf-8'))).toBe(true);
	});
});
