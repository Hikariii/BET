import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Fragment, Slice } from 'prosemirror-model';
import { Plugin, type Command } from 'prosemirror-state';
import { schema } from './schema';
import { versnummersZonderOpmaak } from './versnummersZonderOpmaak';

/**
 * Alineagrenzen horen bij de repo: een bewerking houdt evenveel alinea's.
 * Deze plugin weigert elke transactie die alinea's splitst of samenvoegt (Enter, samenvoegen met Backspace of Delete, een selectie over een grens heen).
 */
const aantalAlineasBlijftGelijk = new Plugin({
	filterTransaction: (transactie, state) => !transactie.docChanged || transactie.doc.childCount === state.doc.childCount,
});

/** Naar het volgende (1) of vorige (-1) vers. */
export type Richting = 1 | -1;

/** Vangt de toets op zonder iets te doen, zodat de browser er ook niets mee doet. */
const doeNiets: Command = () => true;

const aanHetBegin: Command = (state) => state.selection.empty && state.selection.$from.parentOffset === 0;
const aanHetEind: Command = (state) =>
	state.selection.empty && state.selection.$from.parentOffset === state.selection.$from.parent.content.size;

/** Toetsen van de vers-editor. Backspace en Delete worden alleen opgevangen waar ze alinea's zouden samenvoegen. */
export function versEditorToetsen(onSluit: () => void, naarBuur: (richting: Richting) => void): Record<string, Command> {
	return {
		Enter: doeNiets,
		'Shift-Enter': doeNiets,
		Backspace: aanHetBegin,
		Delete: aanHetEind,
		'Mod-z': undo,
		'Mod-y': redo,
		'Shift-Mod-z': redo,
		Escape: () => {
			onSluit();
			return true;
		},
		'Alt-ArrowDown': () => {
			naarBuur(1);
			return true;
		},
		'Alt-ArrowUp': () => {
			naarBuur(-1);
			return true;
		},
	};
}

/** Regeleinden en opeenvolgende spaties worden één spatie; een lege uitkomst is een lege Slice. */
export function alsPlatteTekst(tekst: string): Slice {
	const opgeschoond = tekst.replace(/\s+/g, ' ');
	return opgeschoond === '' ? Slice.empty : new Slice(Fragment.from(schema.text(opgeschoond)), 0, 0);
}

/** Geplakte tekst wordt platte tekst binnen de alinea van de cursor: geen alinea's erbij en geen vreemde opmaak. */
const plakAlsPlatteTekst = new Plugin({
	props: {
		transformPasted: (slice) => alsPlatteTekst(slice.content.textBetween(0, slice.content.size, ' ')),
		clipboardTextParser: (tekst) => alsPlatteTekst(tekst),
	},
});

export function versEditorPlugins(onSluit: () => void, naarBuur: (richting: Richting) => void): Plugin[] {
	return [history(), keymap(versEditorToetsen(onSluit, naarBuur)), aantalAlineasBlijftGelijk, versnummersZonderOpmaak, plakAlsPlatteTekst];
}
