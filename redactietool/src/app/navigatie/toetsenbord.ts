import type { Richting } from '../../editor/versEditorPlugins';

/**
 * Het vers waar een sprong naartoe gaat: het volgende (`1`) of vorige (`-1`) uit `nummers`, in oplopende volgorde.
 * Zonder huidig vers (`null`) is dat het eerste, bij terug het laatste. Staat het huidige vers niet in de lijst
 * (het is niet te bewerken), dan telt het eerstvolgende bewerkbare vers in die richting.
 * Geeft `null` aan het eind van de lijst: dan is er geen buur.
 */
export function buurVers(nummers: readonly number[], huidig: number | null, richting: Richting): number | null {
	if (huidig === null) return (richting === 1 ? nummers[0] : nummers[nummers.length - 1]) ?? null;
	const kandidaten = richting === 1 ? nummers.filter((nummer) => nummer > huidig) : nummers.filter((nummer) => nummer < huidig);
	return (richting === 1 ? kandidaten[0] : kandidaten[kandidaten.length - 1]) ?? null;
}

/** Wat een toets nodig heeft van het element waar hij op viel; een echt `Element` past hierop. */
export type Toetsdoel = {
	tagName: string;
	isContentEditable: boolean;
	closest: (selector: string) => unknown;
};

/** Een toets, zoals een `KeyboardEvent` hem geeft. */
export type Toets = {
	key: string;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
};

const INVOERVELDEN = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const VENSTER = 'dialog, [role="dialog"]';

/** Of een letter die typt (zoals `j`) hier gewoon tekst is en dus niet als sneltoets telt. */
function typtTekst(doel: Toetsdoel | null): boolean {
	if (doel === null) return false;
	return INVOERVELDEN.has(doel.tagName) || doel.isContentEditable;
}

/**
 * De sprong op de pagina: `j` naar het volgende vers, `k` naar het vorige.
 * Geen sprong met een hulptoets erbij, in een invoerveld of de editor, of in een venster dat open staat.
 */
export function sprongRichting(toets: Toets, doel: Toetsdoel | null): Richting | null {
	if (toets.altKey || toets.ctrlKey || toets.metaKey || toets.shiftKey) return null;
	if (typtTekst(doel) || (doel !== null && doel.closest(VENSTER) !== null)) return null;
	if (toets.key === 'j') return 1;
	if (toets.key === 'k') return -1;
	return null;
}

/**
 * De volgende stop in de hoofdstukstrip bij een pijltjestoets: links en rechts, Home en End.
 * Blijft aan de randen staan; `null` voor een andere toets.
 */
export function stripStop(huidig: number, aantal: number, toets: string): number | null {
	const laatste = aantal - 1;
	if (toets === 'ArrowRight') return Math.min(huidig + 1, laatste);
	if (toets === 'ArrowLeft') return Math.max(huidig - 1, 0);
	if (toets === 'Home') return 0;
	if (toets === 'End') return laatste;
	return null;
}

/** Of de focus naar de kop van de pagina moet: alleen als de lezer van de ene pagina naar de andere gaat, niet bij het eerste openen. */
export function moetKopFocus(vorigePagina: string | null, pagina: string): boolean {
	return vorigePagina !== null && vorigePagina !== pagina;
}
