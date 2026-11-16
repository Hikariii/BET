import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Fragment, Slice } from 'prosemirror-model';
import { Plugin, type Command } from 'prosemirror-state';
import { schema } from './schema';
import { versnummersZonderOpmaak } from './versnummersZonderOpmaak';
import type { VetteOpmaak } from './vetteOpmaak';
import { schakelOpmaak, schakelVet, wisOpmaak } from './werkbalk';

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

/** Voert het command uit en vangt de toets altijd op, ook als het command niets deed: anders maakt de browser er zelf vet of onderstreept van. */
function opgevangen(command: Command): Command {
	return (state, dispatch, view) => {
		command(state, dispatch, view);
		return true;
	};
}

/** Wat de editor aan de rest van de pagina vraagt. */
export type EditorActies = {
	onSluit: () => void;
	/** Alt+pijl: naar het volgende of vorige vers. */
	naarBuur: (richting: Richting) => void;
	/** Alt+k: opent het kleurmenu van de werkbalk. */
	openKleurmenu: () => void;
};

const aanHetBegin: Command = (state) => state.selection.empty && state.selection.$from.parentOffset === 0;
const aanHetEind: Command = (state) =>
	state.selection.empty && state.selection.$from.parentOffset === state.selection.$from.parent.content.size;

/** Toetsen van de vers-editor. Backspace en Delete worden alleen opgevangen waar ze alinea's zouden samenvoegen. */
export function versEditorToetsen({ onSluit, naarBuur, openKleurmenu }: EditorActies, vette: VetteOpmaak): Record<string, Command> {
	return {
		'Mod-b': opgevangen(schakelVet(vette)),
		'Mod-u': opgevangen(schakelOpmaak('onderstreept')),
		'Mod-Space': opgevangen(wisOpmaak),
		/** Op een Mac neemt Spotlight Cmd+Spatie; Cmd+\ doet daar hetzelfde. */
		'Mod-\\': opgevangen(wisOpmaak),
		/** Er is geen cursief in de werkbalk; zonder dit zet de browser zelf cursief. */
		'Mod-i': doeNiets,
		'Alt-k': () => {
			openKleurmenu();
			return true;
		},
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

export function versEditorPlugins(acties: EditorActies, vette: VetteOpmaak): Plugin[] {
	return [history(), keymap(versEditorToetsen(acties, vette)), aantalAlineasBlijftGelijk, versnummersZonderOpmaak, plakAlsPlatteTekst];
}
