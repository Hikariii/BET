// Welke opmaak uit FORMAAT.md bij welke Word-stijl (styleId) hoort.
// Gelijk aan PARA_STYLES, CHAR_STYLES en RED in scripts/md_naar_docx.py.
import type { Alineastijl, Domein } from '../formaat/types';

export const ALINEASTIJL_NAAR_WORD: Record<Alineastijl, string> = {
	jezus: 'Jezuswoorden',
	god: 'GodsStem',
	engel: 'engelenwoord',
	'citaat-ot': 'citaatOT',
};

export const DOMEIN_NAAR_WORD: Record<Domein, string> = {
	eeuwigleven: 'eeuwigleven',
	genade: 'genade',
	geloof: 'geloof',
	oordeel: 'oordeel',
	rechtvaardig: 'rechtvaardig',
	zonde: 'zonde',
	torah: 'Torah',
	dag: 'dag',
};

/** Tekenstijl van de hoofdstuktitel ("Lukas 4"), inline aan het begin van de eerste alinea. */
export const TITEL_WORD = 'Bblhfdstk';

/** {onderwijs} is geen stijl maar directe rode letterkleur; highlight is directe gele markering. */
export const ONDERWIJS_KLEUR = 'FF0000';
export const HIGHLIGHT_KLEUR = 'yellow';
