import { describe, expect, it } from 'vitest';
import { wisselNaslag, zelfdeNaslag, type Naslag } from './naslag';

const PARAGRAAF_7A: Naslag = { soort: 'richtlijn', paragraaf: '7A' };
const PARAGRAAF_9: Naslag = { soort: 'richtlijn', paragraaf: '9' };
const PRECEDENT_GERUCHT: Naslag = { soort: 'precedenten', regel: '"gerucht" wordt "nieuws"' };
const PRECEDENT_ROEP: Naslag = { soort: 'precedenten', regel: '"roep" wordt "bekendheid"' };

describe('zelfdeNaslag', () => {
	it('kent een paragraaf aan zijn nummer en een precedent aan zijn logregel', () => {
		expect(zelfdeNaslag(PARAGRAAF_7A, { soort: 'richtlijn', paragraaf: '7A' })).toBe(true);
		expect(zelfdeNaslag(PARAGRAAF_7A, PARAGRAAF_9)).toBe(false);
		expect(zelfdeNaslag(PRECEDENT_GERUCHT, { soort: 'precedenten', regel: '"gerucht" wordt "nieuws"' })).toBe(true);
		expect(zelfdeNaslag(PRECEDENT_GERUCHT, PRECEDENT_ROEP)).toBe(false);
	});

	it('houdt een paragraaf en een precedent uit elkaar', () => {
		expect(zelfdeNaslag(PARAGRAAF_7A, PRECEDENT_GERUCHT)).toBe(false);
		expect(zelfdeNaslag(PRECEDENT_GERUCHT, PARAGRAAF_7A)).toBe(false);
	});
});

describe('wisselNaslag', () => {
	it('opent de kaart onder het vers van de verwijzing', () => {
		expect(wisselNaslag(null, 3, PARAGRAAF_7A)).toEqual({ rij: 3, naslag: PARAGRAAF_7A });
	});

	it('laat een tweede verwijzing in hetzelfde vers de kaart vervangen', () => {
		const open = { rij: 3, naslag: PARAGRAAF_7A };
		expect(wisselNaslag(open, 3, PRECEDENT_GERUCHT)).toEqual({ rij: 3, naslag: PRECEDENT_GERUCHT });
		expect(wisselNaslag(open, 3, PARAGRAAF_9)).toEqual({ rij: 3, naslag: PARAGRAAF_9 });
	});

	it('verplaatst de kaart naar het vers van een verwijzing in een andere rij, ook bij dezelfde naslag', () => {
		expect(wisselNaslag({ rij: 3, naslag: PARAGRAAF_7A }, 5, PARAGRAAF_7A)).toEqual({ rij: 5, naslag: PARAGRAAF_7A });
	});

	it('sluit de kaart bij een klik op de verwijzing die hem opende', () => {
		expect(wisselNaslag({ rij: 3, naslag: PARAGRAAF_7A }, 3, PARAGRAAF_7A)).toBeNull();
		expect(wisselNaslag({ rij: 3, naslag: PRECEDENT_GERUCHT }, 3, PRECEDENT_GERUCHT)).toBeNull();
	});
});
