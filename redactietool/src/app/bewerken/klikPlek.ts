import type { Node } from 'prosemirror-model';
import { Selection, TextSelection } from 'prosemirror-state';

/**
 * Waar in de vers-tekst geklikt is: het alinea-deel (vanaf 0) en het aantal tekens vóór de klik in dat deel.
 * De weergave laat de spaties aan het begin van een deel weg; de editor houdt ze, dus `teken` telt vanaf het eerste zichtbare teken.
 */
export type KlikPlek = {
	alinea: number;
	teken: number;
};

/** De cursor van de editor: op de klikplek, of aan het eind als er geen plek is of de plek niet (meer) bestaat. */
export function selectieBijPlek(document: Node, plek: KlikPlek | null): Selection {
	const alinea = plek === null ? null : document.maybeChild(plek.alinea);
	if (plek === null || alinea === null) return Selection.atEnd(document);
	let alineaBegin = 0;
	for (let index = 0; index < plek.alinea; index++) alineaBegin += document.child(index).nodeSize;
	const spatiesVooraan = alinea.textContent.length - alinea.textContent.trimStart().length;
	const teken = Math.min(spatiesVooraan + plek.teken, alinea.content.size);
	return TextSelection.create(document, alineaBegin + 1 + teken);
}

/**
 * Zoekt in de weergegeven alinea's van `tekst` de plek onder de muis.
 * Geeft `null` als de browser geen tekenpositie kent of de klik buiten de alinea's viel.
 */
export function plekVanKlik(klik: MouseEvent, tekst: HTMLElement): KlikPlek | null {
	if (typeof document.caretPositionFromPoint !== 'function') return null;
	const positie = document.caretPositionFromPoint(klik.clientX, klik.clientY);
	if (positie === null) return null;
	const knoop = positie.offsetNode;
	const alineaElement = (knoop instanceof Element ? knoop : knoop.parentElement)?.closest('p');
	if (!alineaElement || !tekst.contains(alineaElement)) return null;
	const voorDeKlik = document.createRange();
	voorDeKlik.selectNodeContents(alineaElement);
	voorDeKlik.setEnd(knoop, positie.offset);
	return { alinea: [...tekst.querySelectorAll('p')].indexOf(alineaElement), teken: voorDeKlik.toString().length };
}
