import type { EditorActies } from './versEditorPlugins';
import type { VetteOpmaak } from './vetteOpmaak';

/** Een boek waarin geen enkele opmaak al vet is door haar stijl. */
export const GEEN_VETTE_OPMAAK: VetteOpmaak = { domeinen: new Set(), alineastijlen: new Set() };

/** De acties van de editor, met alleen die ingevuld die een test wil weten. */
export function acties(overschrijf: Partial<EditorActies> = {}): EditorActies {
	return { onSluit: () => {}, naarBuur: () => {}, openKleurmenu: () => {}, ...overschrijf };
}
