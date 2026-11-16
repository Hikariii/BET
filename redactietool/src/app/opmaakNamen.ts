import type { WordStijl } from '../data/types';
import { ALINEASTIJL_NAAR_WORD, DOMEIN_NAAR_WORD } from '../data/stijlkoppeling';
import type { Alineastijl, Domein, Opmaak } from '../formaat/types';

/** Opmaak zonder eigen Word-stijl: directe opmaak in Word. De naam staat hier, want het sjabloon kent hem niet. */
export type DirecteOpmaak = Exclude<Opmaak, Domein>;

export const DIRECTE_OPMAAK: Record<DirecteOpmaak, string> = {
	onderwijs: 'Onderwijs (rode letters)',
	highlight: 'Gele markering',
	onderstreept: 'Onderstreept',
	vet: 'Vet',
	cursief: 'Cursief',
};

function stijlNaam(id: string, stijlen: readonly WordStijl[]): string {
	return stijlen.find((stijl) => stijl.id === id)?.naam ?? id;
}

/** De naam die Word aan de alineastijl geeft, uit het sjabloon van het boek. */
export function alineastijlNaam(stijl: Alineastijl, stijlen: readonly WordStijl[]): string {
	return stijlNaam(ALINEASTIJL_NAAR_WORD[stijl], stijlen);
}

/** De naam die Word aan de tekenstijl van het begripsdomein geeft, uit het sjabloon van het boek. */
export function domeinNaam(domein: Domein, stijlen: readonly WordStijl[]): string {
	return stijlNaam(DOMEIN_NAAR_WORD[domein], stijlen);
}
