import { describe, expect, it } from 'vitest';
import { eerstAfwijkendeRegel, leesBijbelbestanden } from '../formaat/bijbelbestanden.testhulp';
import { parseerHoofdstuk } from '../formaat/parseer';
import { serialiseerHoofdstuk } from '../formaat/serialiseer';
import { naarProseMirror, vanProseMirror } from './omzetten';

describe('bestand, editor en terug geeft de oorspronkelijke tekst', () => {
	it.each(leesBijbelbestanden())('$naam', ({ tekst }) => {
		const terug = serialiseerHoofdstuk(vanProseMirror(naarProseMirror(parseerHoofdstuk(tekst))));
		expect(terug === tekst ? 'gelijk' : eerstAfwijkendeRegel(tekst, terug)).toBe('gelijk');
		expect(Buffer.from(terug, 'utf-8').equals(Buffer.from(tekst, 'utf-8'))).toBe(true);
	});
});
