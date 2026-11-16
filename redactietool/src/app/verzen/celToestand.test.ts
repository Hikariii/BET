import { describe, expect, it } from 'vitest';
import { celToestand } from './celToestand';

describe('celToestand', () => {
	it('laat een cel waar alles in past een gewoon zweefvak, ook bij aanwijzen', () => {
		expect(celToestand(false, false, false)).toEqual({ vast: false, klassen: 'zweefvak', focusbaar: false });
		expect(celToestand(false, false, true)).toEqual({ vast: false, klassen: 'zweefvak', focusbaar: false });
	});

	it('vervaagt een overlopende cel en laat hem focus nemen', () => {
		expect(celToestand(false, true, false)).toEqual({ vast: false, klassen: 'zweefvak overloopt', focusbaar: true });
	});

	it('klapt een overlopende cel uit bij aanwijzen of focus', () => {
		expect(celToestand(false, true, true)).toEqual({ vast: false, klassen: 'zweefvak overloopt open', focusbaar: true });
	});

	it('zet de cel vast zolang de naslagkaart open staat, ook als hij overloopt of uitgeklapt is', () => {
		const verwacht = { vast: true, klassen: 'zweefvak vast', focusbaar: false };
		expect(celToestand(true, false, false)).toEqual(verwacht);
		expect(celToestand(true, true, false)).toEqual(verwacht);
		expect(celToestand(true, true, true)).toEqual(verwacht);
	});
});
