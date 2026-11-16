import { EditorState } from 'prosemirror-state';
import { EditorView, type MarkViewConstructor, type NodeViewConstructor } from 'prosemirror-view';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { WordStijl } from '../../data/types';
import type { VersInhoud } from '../../bewerken/types';
import { documentNaarVersInhoud, versInhoudNaarDocument } from '../../editor/versDocument';
import { metRandwitruimte, zonderRandwitruimte } from '../../editor/randwitruimte';
import { versEditorPlugins, type Richting } from '../../editor/versEditorPlugins';
import { vetteOpmaakVan } from '../../editor/vetteOpmaak';
import { commandVoorActie, werkbalkToestand, type WerkbalkActie } from '../../editor/werkbalk';
import { OPMAAK_VOLGORDE, type Alineastijl } from '../../formaat/types';
import { alineaOpmaakstijl, tekststukOpmaakstijl, type Opmaakstijl } from '../stijl';
import { selectieBijPlek, type KlikPlek } from './klikPlek';
import { opMac, sneltoetsTekst } from './sneltoetsen';
import { Werkbalk } from './Werkbalk';
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
	/** Alt+pijl: sluit deze editor en opent die van het volgende (1) of vorige (-1) vers. */
	onNaarBuur: (richting: Richting) => void;
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

/** ProseMirror-editor voor één vers, met een alinea per deel en de opmaakwerkbalk erboven. */
export function VersEditor({ inhoud, stijlen, label, startPlek, onWijzig, onSluit, onNaarBuur }: Props) {
	const houder = useRef<HTMLDivElement>(null);
	const weergave = useRef<EditorView | null>(null);
	const laatsteOnWijzig = useRef(onWijzig);
	const laatsteOnSluit = useRef(onSluit);
	laatsteOnWijzig.current = onWijzig;
	laatsteOnSluit.current = onSluit;
	const laatsteOnNaarBuur = useRef(onNaarBuur);
	laatsteOnNaarBuur.current = onNaarBuur;
	const [vette] = useState(() => vetteOpmaakVan(stijlen));
	const [mac] = useState(opMac);
	const [kleurmenuOpen, zetKleurmenuOpen] = useState(false);
	// De spaties rond het versnummer horen bij het bestand: de editor laat ze weg en zet ze bij elke wijziging terug.
	const [{ inhoud: bewerkbaar, randen }] = useState(() => zonderRandwitruimte(inhoud));
	const [beginstand] = useState(() => {
		const startDocument = versInhoudNaarDocument(bewerkbaar);
		const acties = {
			onSluit: () => laatsteOnSluit.current(),
			naarBuur: (richting: Richting) => laatsteOnNaarBuur.current(richting),
			openKleurmenu: () => zetKleurmenuOpen(true),
		};
		return EditorState.create({ doc: startDocument, plugins: versEditorPlugins(acties, vette), selection: selectieBijPlek(startDocument, startPlek) });
	});
	const [toestand, zetToestand] = useState(() => werkbalkToestand(beginstand, vette));

	useEffect(() => {
		const doel = houder.current;
		if (doel === null) return;
		const view = new EditorView(doel, {
			state: beginstand,
			nodeViews: { alinea: alineaView(stijlen) },
			markViews: opmaakViews(stijlen),
			attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, spellcheck: 'true', lang: 'nl' },
			dispatchTransaction(transactie) {
				const oud = view.state;
				const nieuw = oud.apply(transactie);
				view.updateState(nieuw);
				zetToestand(werkbalkToestand(nieuw, vette));
				if (nieuw.doc !== oud.doc) laatsteOnWijzig.current(metRandwitruimte(documentNaarVersInhoud(nieuw.doc, vette), randen));
			},
		});
		weergave.current = view;
		view.focus();
		doel.scrollIntoView({ block: 'nearest' });
		return () => {
			weergave.current = null;
			view.destroy();
		};
	}, []);

	const voerActieUit = (actie: WerkbalkActie) => {
		const view = weergave.current;
		if (view === null) return;
		commandVoorActie(actie, vette)(view.state, view.dispatch, view);
		zetKleurmenuOpen(false);
		view.focus();
	};

	return (
		<div class="verseditor">
			<Werkbalk
				toestand={toestand}
				stijlen={stijlen}
				mac={mac}
				kleurmenuOpen={kleurmenuOpen}
				onKleurmenu={zetKleurmenuOpen}
				onActie={voerActieUit}
				onTerugNaarEditor={() => weergave.current?.focus()}
			/>
			<div ref={houder} />
			<p class="verseditor-acties">
				<button type="button" onClick={onSluit}>
					Klaar
				</button>
				<span class="verseditor-tip">
					{' '}
					Escape sluit ook. Alt+pijl omlaag of omhoog gaat naar het volgende of vorige vers. Enter doet niets: alinea's blijven zoals Claude ze maakte. Opmaak zet je met de balk: {sneltoetsTekst('vet', mac)} voor vet,{' '}
					{sneltoetsTekst('onderstreept', mac)} voor onderstreept, {sneltoetsTekst('kleur', mac)} voor een kleur.
				</span>
			</p>
		</div>
	);
}
