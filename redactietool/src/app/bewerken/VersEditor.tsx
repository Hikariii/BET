import { EditorState } from 'prosemirror-state';
import { EditorView, type MarkViewConstructor, type NodeViewConstructor } from 'prosemirror-view';
import { useEffect, useRef } from 'preact/hooks';
import type { WordStijl } from '../../data/types';
import type { VersInhoud } from '../../bewerken/types';
import { documentNaarVersInhoud, versInhoudNaarDocument } from '../../editor/versDocument';
import { versEditorPlugins } from '../../editor/versEditorPlugins';
import { OPMAAK_VOLGORDE, type Alineastijl } from '../../formaat/types';
import { alineaOpmaakstijl, tekststukOpmaakstijl, type Opmaakstijl } from '../stijl';
import { selectieBijPlek, type KlikPlek } from './klikPlek';
import './verseditor.css';

type Props = {
	inhoud: VersInhoud;
	stijlen: readonly WordStijl[];
	/** Naam voor schermlezers, bv. "Vereenvoudigde tekst van vers 18". */
	label: string;
	/** Waar de cursor begint; `null` is aan het eind. */
	startPlek: KlikPlek | null;
	/** Na elke wijziging; de inhoud houdt evenveel delen. */
	onWijzig: (inhoud: VersInhoud) => void;
	onSluit: () => void;
};

function zetOpmaak(element: HTMLElement, opmaak: Opmaakstijl): void {
	Object.assign(element.style, opmaak);
}

/** Zelfde kleuren als het leesscherm: de opmaak komt uit dezelfde functies als in VersTekst. */
function alineaView(stijlen: readonly WordStijl[]): NodeViewConstructor {
	return (node) => {
		const dom = document.createElement('p');
		zetOpmaak(dom, alineaOpmaakstijl(node.attrs['stijl'] as Alineastijl | null, stijlen));
		return { dom, contentDOM: dom };
	};
}

function opmaakViews(stijlen: readonly WordStijl[]): Record<string, MarkViewConstructor> {
	return Object.fromEntries(
		OPMAAK_VOLGORDE.map((opmaak) => {
			const view: MarkViewConstructor = () => {
				const dom = document.createElement('span');
				zetOpmaak(dom, tekststukOpmaakstijl({ soort: 'tekst', tekst: '', opmaak: [opmaak] }, stijlen));
				return { dom, contentDOM: dom };
			};
			return [opmaak, view];
		}),
	);
}

/** ProseMirror-editor voor één vers, met een alinea per deel. */
export function VersEditor({ inhoud, stijlen, label, startPlek, onWijzig, onSluit }: Props) {
	const houder = useRef<HTMLDivElement>(null);
	const laatsteOnWijzig = useRef(onWijzig);
	const laatsteOnSluit = useRef(onSluit);
	laatsteOnWijzig.current = onWijzig;
	laatsteOnSluit.current = onSluit;

	useEffect(() => {
		const doel = houder.current;
		if (doel === null) return;
		const startDocument = versInhoudNaarDocument(inhoud);
		const view = new EditorView(doel, {
			state: EditorState.create({
				doc: startDocument,
				plugins: versEditorPlugins(() => laatsteOnSluit.current()),
				selection: selectieBijPlek(startDocument, startPlek),
			}),
			nodeViews: { alinea: alineaView(stijlen) },
			markViews: opmaakViews(stijlen),
			attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, spellcheck: 'true', lang: 'nl' },
			dispatchTransaction(transactie) {
				const oud = view.state;
				const nieuw = oud.apply(transactie);
				view.updateState(nieuw);
				if (nieuw.doc !== oud.doc) laatsteOnWijzig.current(documentNaarVersInhoud(nieuw.doc));
			},
		});
		view.focus();
		return () => view.destroy();
	}, []);

	return (
		<div class="verseditor">
			<div ref={houder} />
			<p class="verseditor-acties">
				<button type="button" onClick={onSluit}>
					Klaar
				</button>
				<span class="verseditor-tip"> Escape sluit ook. Enter doet niets: alinea's blijven zoals in de repo.</span>
			</p>
		</div>
	);
}
