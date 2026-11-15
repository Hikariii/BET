import type { VersInhoud } from '../bewerken/types';
import type { HoofdstukVerzen, Vondst } from './types';

/** Alle plekken van de zoekterm, hoofdletterongevoelig en op woordgrenzen, in volgorde van hoofdstuk, vers en positie. Wordt ingevuld. */
export function zoekVondsten(_hoofdstukken: readonly HoofdstukVerzen[], _zoekterm: string): Vondst[] {
	return [];
}

/**
 * Vervangt in een vers de vondsten (alleen vervangbare, binnen één opmaak) door `nieuw`, met de opmaak van de vervangen tekst.
 * Vondsten in andere verzen worden genegeerd. Wordt ingevuld.
 */
export function vervangInVers(inhoud: VersInhoud, _vondsten: readonly Vondst[], _nieuw: string): VersInhoud {
	return inhoud;
}
