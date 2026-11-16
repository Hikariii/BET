import { describe, expect, it } from 'vitest';
import { isHelpToets, type ToetsDoel } from './toets';

const OP_PAGINA: ToetsDoel = { tagName: 'BODY', isContentEditable: false };

function toets(overrides: Partial<Parameters<typeof isHelpToets>[0]> = {}) {
	return isHelpToets({ key: '?', ctrlKey: false, metaKey: false, altKey: false, doel: OP_PAGINA, ...overrides });
}

describe('isHelpToets', () => {
	it('opent de help bij een losse ? op de pagina', () => {
		expect(toets()).toBe(true);
		expect(toets({ doel: null })).toBe(true);
	});

	it('negeert andere toetsen en toetsen met ctrl, cmd of alt', () => {
		expect(toets({ key: '/' })).toBe(false);
		expect(toets({ ctrlKey: true })).toBe(false);
		expect(toets({ metaKey: true })).toBe(false);
		expect(toets({ altKey: true })).toBe(false);
	});

	it('negeert een ? in een invoerveld, keuzelijst, tekstvak of de editor', () => {
		expect(toets({ doel: { tagName: 'INPUT', isContentEditable: false } })).toBe(false);
		expect(toets({ doel: { tagName: 'TEXTAREA', isContentEditable: false } })).toBe(false);
		expect(toets({ doel: { tagName: 'SELECT', isContentEditable: false } })).toBe(false);
		expect(toets({ doel: { tagName: 'DIV', isContentEditable: true } })).toBe(false);
	});

	it('opent de help ook als een knop of link de focus heeft', () => {
		expect(toets({ doel: { tagName: 'BUTTON', isContentEditable: false } })).toBe(true);
		expect(toets({ doel: { tagName: 'A', isContentEditable: false } })).toBe(true);
	});
});
