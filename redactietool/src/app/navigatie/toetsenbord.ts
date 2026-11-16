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
/** De editor met zijn werkbalk: een letter op een knop van de werkbalk is geen sprong naar een ander vers. */
const VERSEDITOR = '.verseditor';

/** Of een letter die typt (zoals `j`) hier gewoon tekst is en dus niet als sneltoets telt. */
function typtTekst(doel: Toetsdoel | null): boolean {
	if (doel === null) return false;
	return INVOERVELDEN.has(doel.tagName) || doel.isContentEditable;
}

/**
 * De sprong op de pagina: `j` naar het volgende vers, `k` naar het vorige.
 * Geen sprong met een hulptoets erbij, in een invoerveld, in de editor of zijn werkbalk, of in een venster dat open staat.
 */
export function sprongRichting(toets: Toets, doel: Toetsdoel | null): Richting | null {
	if (toets.altKey || toets.ctrlKey || toets.metaKey || toets.shiftKey) return null;
	if (typtTekst(doel) || (doel !== null && (doel.closest(VENSTER) !== null || doel.closest(VERSEDITOR) !== null))) return null;
	if (toets.key === 'j') return 1;
	if (toets.key === 'k') return -1;
	return null;
}

/**
 * De volgende stop in een raster met `kolommen` per rij bij een pijltjestoets: links, rechts, omhoog, omlaag, Home en End.
 * Links en rechts lopen over de rijgrens heen. Omlaag vanuit een rij boven een kortere laatste rij gaat naar de laatste stop.
 * Aan de randen (begin en eind van de lijst, eerste en laatste rij) blijft de focus staan.
 * `null` voor een andere toets.
 */
export function rasterStop(huidig: number, aantal: number, kolommen: number, toets: string): number | null {
	const laatste = aantal - 1;
	if (toets === 'ArrowRight') return Math.min(huidig + 1, laatste);
	if (toets === 'ArrowLeft') return Math.max(huidig - 1, 0);
	if (toets === 'ArrowUp') return huidig - kolommen >= 0 ? huidig - kolommen : huidig;
	if (toets === 'ArrowDown') {
		if (huidig + kolommen <= laatste) return huidig + kolommen;
		const opLaatsteRij = Math.floor(huidig / kolommen) === Math.floor(laatste / kolommen);
		return opLaatsteRij ? huidig : laatste;
	}
	if (toets === 'Home') return 0;
	if (toets === 'End') return laatste;
	return null;
}

/** Of de focus naar de kop van de pagina moet: alleen als de lezer van de ene pagina naar de andere gaat, niet bij het eerste openen. */
export function moetKopFocus(vorigePagina: string | null, pagina: string): boolean {
	return vorigePagina !== null && vorigePagina !== pagina;
}
