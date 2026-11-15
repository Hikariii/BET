import { EditorState, TextSelection, type Command } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import type { VersInhoud } from '../bewerken/types';
import { documentNaarVersInhoud, versInhoudNaarDocument } from './versDocument';
import { versEditorPlugins, versEditorToetsen } from './versEditorPlugins';

const EERSTE_TEKST = 'Eerste deel.';
const TWEE_DELEN: VersInhoud = {
	delen: [
		{ stijl: null, stukken: [{ soort: 'tekst', tekst: EERSTE_TEKST, opmaak: [] }] },
		{ stijl: 'jezus', stukken: [{ soort: 'tekst', tekst: 'Tweede deel.', opmaak: ['onderwijs'] }] },
	],
};

const EIND_EERSTE_DEEL = 1 + EERSTE_TEKST.length;
const BEGIN_TWEEDE_DEEL = EIND_EERSTE_DEEL + 2;

function beginstand(): EditorState {
	return EditorState.create({ doc: versInhoudNaarDocument(TWEE_DELEN), plugins: versEditorPlugins(() => {}) });
}

function metCursor(state: EditorState, positie: number): EditorState {
	return state.apply(state.tr.setSelection(TextSelection.create(state.doc, positie)));
}

/** Voert een toets uit en geeft of de toets is opgevangen en de stand erna. */
function drukToets(state: EditorState, toets: string): { opgevangen: boolean; na: EditorState } {
	let na = state;
	const command: Command = versEditorToetsen(() => {})[toets]!;
	const opgevangen = command(state, (transactie) => {
		na = state.apply(transactie);
	});
	return { opgevangen, na };
}

describe('de plugins van de vers-editor', () => {
	it('Enter wordt opgevangen en verandert niets', () => {
		const state = metCursor(beginstand(), EIND_EERSTE_DEEL);
		expect(state.doc.childCount).toBe(2);
		const { opgevangen, na } = drukToets(state, 'Enter');
		expect(opgevangen).toBe(true);
		expect(na.doc.eq(state.doc)).toBe(true);
	});

	it('Backspace aan het begin van een deel wordt opgevangen, midden in een deel niet', () => {
		const stand = beginstand();
		expect(drukToets(metCursor(stand, BEGIN_TWEEDE_DEEL), 'Backspace').opgevangen).toBe(true);
		expect(drukToets(metCursor(stand, BEGIN_TWEEDE_DEEL + 3), 'Backspace').opgevangen).toBe(false);
	});

	it('Delete aan het eind van een deel wordt opgevangen, midden in een deel niet', () => {
		const stand = beginstand();
		expect(drukToets(metCursor(stand, EIND_EERSTE_DEEL), 'Delete').opgevangen).toBe(true);
		expect(drukToets(metCursor(stand, EIND_EERSTE_DEEL - 3), 'Delete').opgevangen).toBe(false);
	});

	it('een bewerking die delen splitst of samenvoegt wordt geweigerd', () => {
		const state = beginstand();
		const gesplitst = state.apply(state.tr.split(3));
		const samengevoegd = state.apply(state.tr.delete(EIND_EERSTE_DEEL - 2, BEGIN_TWEEDE_DEEL + 2));
		expect(gesplitst.doc.eq(state.doc)).toBe(true);
		expect(samengevoegd.doc.eq(state.doc)).toBe(true);
	});

	it('tekst typen binnen een deel lukt en houdt stijl en opmaak', () => {
		const state = beginstand();
		const na = state.apply(state.tr.insertText('nieuwe ', BEGIN_TWEEDE_DEEL));
		expect(documentNaarVersInhoud(na.doc)).toEqual({
			delen: [
				TWEE_DELEN.delen[0],
				{ stijl: 'jezus', stukken: [{ soort: 'tekst', tekst: 'nieuwe Tweede deel.', opmaak: ['onderwijs'] }] },
			],
		});
	});
});
