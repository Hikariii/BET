import { describe, expect, it } from 'vitest';
import type { Bronvorm } from '../../uitlijning/gevonden';
import { filterBronvormen, vertalingLabel } from './gevondenFilter';

function vorm(bronvorm: string, aantal: number, nieuw: string[]): Bronvorm {
	return {
		bronvorm,
		voorbeeld: bronvorm,
		aantal,
		vertalingen: nieuw.map((tekst) => ({ nieuw: tekst, voorbeeld: tekst, gelijk: tekst === bronvorm, aantal: 1, verzen: [] })),
	};
}

const heere = vorm('heere', 87, ['heer', 'de heer']);
const zie = vorm('zie', 25, ['', 'kijk']);
const dikwijls = vorm('dikwijls', 2, ['vaak']);
const alle = [dikwijls, zie, heere];
const verschillend = [zie, heere];

describe('filterBronvormen', () => {
	it('toont alleen de verschillend vertaalde vormen in hun eigen volgorde', () => {
		expect(filterBronvormen(alle, verschillend, { zoekterm: '', alleenVerschillend: true })).toEqual([zie, heere]);
	});

	it('toont zonder die keuze alle vormen, meest voorkomende eerst', () => {
		expect(filterBronvormen(alle, verschillend, { zoekterm: '', alleenVerschillend: false })).toEqual([heere, zie, dikwijls]);
	});

	it('zoekt in alle vormen, ook als alleen verschillende aan staat, met verschillend vertaalde vooraan', () => {
		expect(filterBronvormen(alle, [zie], { zoekterm: 'e', alleenVerschillend: true })).toEqual([zie, heere]);
		expect(filterBronvormen(alle, [zie], { zoekterm: 'dikwijls', alleenVerschillend: true })).toEqual([dikwijls]);
	});

	it('zoekt in de bronvorm en in de vertalingen, zonder hoofdletters', () => {
		expect(filterBronvormen(alle, verschillend, { zoekterm: 'KIJK', alleenVerschillend: false })).toEqual([zie]);
		expect(filterBronvormen(alle, verschillend, { zoekterm: ' dikw ', alleenVerschillend: false })).toEqual([dikwijls]);
	});
});

describe('vertalingLabel', () => {
	it('noemt een gelijk gebleven of weggevallen woord bij naam', () => {
		expect(vertalingLabel({ nieuw: 'heere', voorbeeld: 'Heere', gelijk: true })).toBe('bleef gelijk');
		expect(vertalingLabel({ nieuw: '', voorbeeld: '', gelijk: false })).toBe('weggelaten');
		expect(vertalingLabel({ nieuw: 'heer', voorbeeld: 'Heer', gelijk: false })).toBe('Heer');
	});
});
