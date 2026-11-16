import { Fragment, Slice } from 'prosemirror-model';
import { EditorState, TextSelection, type Command, type Plugin } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import type { VersInhoud } from '../bewerken/types';
import { acties, GEEN_VETTE_OPMAAK } from './editor.testhulp';
import { documentNaarVersInhoud, versInhoudNaarDocument } from './versDocument';
import { schema } from './schema';
import { alsPlatteTekst, versEditorPlugins, versEditorToetsen } from './versEditorPlugins';

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
	return EditorState.create({ doc: versInhoudNaarDocument(TWEE_DELEN), plugins: versEditorPlugins(acties(), GEEN_VETTE_OPMAAK) });
}

function metCursor(state: EditorState, positie: number): EditorState {
	return state.apply(state.tr.setSelection(TextSelection.create(state.doc, positie)));
}

/** Voert een toets uit en geeft of de toets is opgevangen en de stand erna. */
function drukToets(state: EditorState, toets: string): { opgevangen: boolean; na: EditorState } {
	let na = state;
	const command: Command = versEditorToetsen(acties(), GEEN_VETTE_OPMAAK)[toets]!;
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

	describe('opmaaktoetsen', () => {
		const eersteDeel = (state: EditorState) => documentNaarVersInhoud(state.doc, GEEN_VETTE_OPMAAK).delen[0]!.stukken;
		const selecteerEersteDeel = () => {
			const begin = beginstand();
			return begin.apply(begin.tr.setSelection(TextSelection.create(begin.doc, 1, EIND_EERSTE_DEEL)));
		};

		it('Mod-b en Mod-u zetten vet en onderstreept op de selectie', () => {
			const begin = selecteerEersteDeel();
			const vet = drukToets(begin, 'Mod-b');
			expect(vet.opgevangen).toBe(true);
			expect(eersteDeel(vet.na)).toEqual([{ soort: 'tekst', tekst: EERSTE_TEKST, opmaak: ['vet'] }]);
			const onderstreept = drukToets(vet.na, 'Mod-u');
			expect(eersteDeel(onderstreept.na)).toEqual([{ soort: 'tekst', tekst: EERSTE_TEKST, opmaak: ['onderstreept', 'vet'] }]);
		});

		it('Mod-Space wist de opmaak van de selectie', () => {
			const opgemaakt = drukToets(selecteerEersteDeel(), 'Mod-b').na;
			expect(eersteDeel(drukToets(opgemaakt, 'Mod-Space').na)).toEqual([{ soort: 'tekst', tekst: EERSTE_TEKST, opmaak: [] }]);
		});

		it('Mod-i wordt opgevangen en verandert niets', () => {
			const begin = selecteerEersteDeel();
			const { opgevangen, na } = drukToets(begin, 'Mod-i');
			expect(opgevangen).toBe(true);
			expect(na.doc.eq(begin.doc)).toBe(true);
		});

		it('Mod-Space wordt ook opgevangen als er niets te doen is, zodat de browser zelf geen vet maakt', () => {
			const begin = metCursor(beginstand(), 1);
			const { opgevangen, na } = drukToets(begin, 'Mod-Space');
			expect(opgevangen).toBe(true);
			expect(na.doc.eq(begin.doc)).toBe(true);
		});

		it('Alt-k vraagt om het kleurmenu', () => {
			let gevraagd = 0;
			const command = versEditorToetsen(acties({ openKleurmenu: () => (gevraagd += 1) }), GEEN_VETTE_OPMAAK)['Alt-k']!;
			expect(command(beginstand())).toBe(true);
			expect(gevraagd).toBe(1);
		});
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
		expect(documentNaarVersInhoud(na.doc, GEEN_VETTE_OPMAAK)).toEqual({
			delen: [
				TWEE_DELEN.delen[0],
				{ stijl: 'jezus', stukken: [{ soort: 'tekst', tekst: 'nieuwe Tweede deel.', opmaak: ['onderwijs'] }] },
			],
		});
	});

	describe('plakken', () => {
		function plakPlugin(state: EditorState): Plugin {
			const plugin = state.plugins.find((kandidaat) => kandidaat.props.clipboardTextParser !== undefined);
			if (plugin === undefined) throw new Error('geen plakplugin gevonden');
			return plugin;
		}
		/** De plakfuncties gebruiken de view niet, en zonder DOM is er geen echte. */
		const geenView = undefined as never;
		const eersteTekst = (state: EditorState) => documentNaarVersInhoud(state.doc, GEEN_VETTE_OPMAAK).delen[0]!.stukken[0]!.tekst;

		it('regeleinden en opeenvolgende spaties worden één spatie', () => {
			const slice = alsPlatteTekst('eerste\nde  tweede\r\n\n   derde');
			expect(slice.content.textBetween(0, slice.content.size)).toBe('eerste de tweede derde');
		});

		it('een lege tekst geeft een lege slice', () => {
			expect(alsPlatteTekst('').eq(Slice.empty)).toBe(true);
		});

		it("geplakte platte tekst met een regeleinde houdt evenveel alinea's", () => {
			const state = metCursor(beginstand(), EIND_EERSTE_DEEL);
			const plugin = plakPlugin(state);
			const slice = plugin.props.clipboardTextParser!.call(plugin, 'plak\neen  tekst', state.selection.$from, false, geenView);
			const na = state.apply(state.tr.replaceSelection(slice));
			expect(na.doc.childCount).toBe(2);
			expect(eersteTekst(na)).toBe(`${EERSTE_TEKST}plak een tekst`);
		});

		it("geplakte alinea's worden platte tekst in de alinea van de cursor", () => {
			const alinea = (tekst: string) => schema.nodes['alinea']!.create(null, schema.text(tekst));
			const geplakt = new Slice(Fragment.from([alinea('plak'), alinea('twee')]), 1, 1);
			const state = metCursor(beginstand(), EIND_EERSTE_DEEL);
			const plugin = plakPlugin(state);
			const slice = plugin.props.transformPasted!.call(plugin, geplakt, geenView, false);
			const na = state.apply(state.tr.replaceSelection(slice));
			expect(na.doc.childCount).toBe(2);
			expect(eersteTekst(na)).toBe(`${EERSTE_TEKST}plak twee`);
		});
	});
});
