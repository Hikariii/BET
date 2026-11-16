import { describe, expect, it } from 'vitest';
import type { HoofdstukInfo } from '../../data/types';
import { kortHoofdstukLabel, stripStatusWoord } from './hoofdstukLabel';

const HOOFDSTUK: HoofdstukInfo = { nummer: 4, status: 'goedgekeurd', versie: '', herkomst: '', opmerking: '' };

describe('kortHoofdstukLabel', () => {
	it('noemt nummer, status en het aantal open vragen', () => {
		expect(kortHoofdstukLabel(HOOFDSTUK, 3)).toBe('Hoofdstuk 4, goedgekeurd, 3 open vragen');
		expect(kortHoofdstukLabel(HOOFDSTUK, 1)).toBe('Hoofdstuk 4, goedgekeurd, 1 open vraag');
	});

	it('laat de vragen weg als er geen zijn en toont elke status', () => {
		expect(kortHoofdstukLabel({ ...HOOFDSTUK, status: 'review' }, 0)).toBe('Hoofdstuk 4, review');
	});
});

describe('stripStatusWoord', () => {
	it('noemt de status altijd bij het open hoofdstuk, ook als die de gewone is', () => {
		expect(stripStatusWoord('review', 'review', true)).toBe('review');
		expect(stripStatusWoord('goedgekeurd', 'review', true)).toBe('goedgekeurd');
	});

	it('laat bij de andere hoofdstukken de gewone status en goedgekeurd weg', () => {
		expect(stripStatusWoord('review', 'review', false)).toBeNull();
		expect(stripStatusWoord('goedgekeurd', 'review', false)).toBeNull();
	});

	it('noemt bij de andere hoofdstukken een status die afwijkt', () => {
		expect(stripStatusWoord('bij editor', 'review', false)).toBe('bij editor');
		expect(stripStatusWoord('verwerkt', null, false)).toBe('verwerkt');
	});
});
