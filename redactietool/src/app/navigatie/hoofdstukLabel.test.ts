import { describe, expect, it } from 'vitest';
import type { HoofdstukInfo } from '../../data/types';
import { kortHoofdstukLabel } from './hoofdstukLabel';

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
