import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import type { VersInhoud } from '../bewerken/types';
import { versInhoudNaarDocument } from './versDocument';
import { acties, GEEN_VETTE_OPMAAK } from './editor.testhulp';
import { versEditorToetsen, type Richting } from './versEditorPlugins';

const INHOUD: VersInhoud = {
	delen: [{ stijl: null, stukken: [{ soort: 'tekst', tekst: 'Eerste deel.', opmaak: [] }] }],
};

describe('Alt+pijl in de vers-editor', () => {
	it('vraagt het volgende vers bij Alt+pijl omlaag en het vorige bij Alt+pijl omhoog', () => {
		const gevraagd: Richting[] = [];
		const toetsen = versEditorToetsen(acties({ naarBuur: (richting) => gevraagd.push(richting) }), GEEN_VETTE_OPMAAK);
		const state = EditorState.create({ doc: versInhoudNaarDocument(INHOUD) });
		const midden = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 4)));

		expect(gevraagd).toEqual([]);
		expect(toetsen['Alt-ArrowDown']?.(midden)).toBe(true);
		expect(toetsen['Alt-ArrowUp']?.(midden)).toBe(true);
		expect(gevraagd).toEqual([1, -1]);
	});

	it('sluit de editor niet zelf: dat doet de aanroeper bij het openen van het buurvers', () => {
		let gesloten = 0;
		const toetsen = versEditorToetsen(acties({ onSluit: () => (gesloten += 1) }), GEEN_VETTE_OPMAAK);
		const state = EditorState.create({ doc: versInhoudNaarDocument(INHOUD) });

		toetsen['Alt-ArrowDown']?.(state);

		expect(gesloten).toBe(0);
	});
});
