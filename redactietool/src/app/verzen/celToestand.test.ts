import { describe, expect, it } from 'vitest';
import { celToestand } from './celToestand';

const rust = { naslagOpen: false, vastgezet: false, overloopt: false, open: false };

describe('celToestand', () => {
	it('laat een cel waar alles in past een gewoon zweefvak zonder punaise, ook bij aanwijzen', () => {
		const verwacht = { vast: false, klassen: 'zweefvak', focusbaar: false, punaise: false };
		expect(celToestand(rust)).toEqual(verwacht);
		expect(celToestand({ ...rust, open: true })).toEqual(verwacht);
	});

	it('vervaagt een overlopende cel en laat hem focus nemen, nog zonder punaise', () => {
		expect(celToestand({ ...rust, overloopt: true })).toEqual({ vast: false, klassen: 'zweefvak overloopt', focusbaar: true, punaise: false });
	});

	it('klapt een overlopende cel uit bij aanwijzen of focus en toont dan de punaise', () => {
		expect(celToestand({ ...rust, overloopt: true, open: true })).toEqual({ vast: false, klassen: 'zweefvak overloopt open', focusbaar: true, punaise: true });
	});

	it('zet de cel vast zolang de naslagkaart open staat, met de punaise om hem daarna vast te houden', () => {
		const verwacht = { vast: true, klassen: 'zweefvak vast', focusbaar: false, punaise: true };
		expect(celToestand({ ...rust, naslagOpen: true })).toEqual(verwacht);
		expect(celToestand({ ...rust, naslagOpen: true, overloopt: true })).toEqual(verwacht);
		expect(celToestand({ ...rust, naslagOpen: true, overloopt: true, open: true })).toEqual(verwacht);
	});

	it('zet een vastgezette cel vast met de punaise om hem los te maken, ook als de muis weg is', () => {
		const verwacht = { vast: true, klassen: 'zweefvak vast', focusbaar: false, punaise: true };
		expect(celToestand({ ...rust, vastgezet: true, overloopt: true })).toEqual(verwacht);
		expect(celToestand({ ...rust, vastgezet: true, overloopt: true, open: true })).toEqual(verwacht);
		expect(celToestand({ ...rust, vastgezet: true, naslagOpen: true })).toEqual(verwacht);
	});
});
