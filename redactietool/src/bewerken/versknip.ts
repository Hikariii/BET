import type { Hoofdstuk } from '../formaat/types';
import type { VersInhoud } from './types';

/** Knipt de inhoud van een vers uit het hoofdstuk; `null` als het vers niet voorkomt. Wordt ingevuld. */
export function knipVers(_hoofdstuk: Hoofdstuk, _nummer: number): VersInhoud | null {
	return null;
}

/**
 * Zet nieuwe inhoud op de plek van een vers; alles buiten dat vers blijft precies gelijk.
 * De nieuwe inhoud moet evenveel delen hebben als het vers in het hoofdstuk. Wordt ingevuld.
 */
export function vervangVers(hoofdstuk: Hoofdstuk, _nummer: number, _inhoud: VersInhoud): Hoofdstuk {
	return hoofdstuk;
}
