import { describe, expect, it } from 'vitest';
import { eerstAfwijkendeRegel, leesBijbelbestanden } from './bijbelbestanden.testhulp';
import { parseerHoofdstuk } from './parseer';
import { serialiseerHoofdstuk } from './serialiseer';

describe('parseren en terugschrijven geeft de oorspronkelijke tekst', () => {
	it.each(leesBijbelbestanden())('$naam', ({ tekst }) => {
		const terug = serialiseerHoofdstuk(parseerHoofdstuk(tekst));
		expect(terug === tekst ? 'gelijk' : eerstAfwijkendeRegel(tekst, terug)).toBe('gelijk');
		expect(Buffer.from(terug, 'utf-8').equals(Buffer.from(tekst, 'utf-8'))).toBe(true);
	});
});
