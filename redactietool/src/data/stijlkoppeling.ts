// Welke opmaak uit FORMAAT.md bij welke Word-stijl (styleId) hoort.
// De bron is PARA_STYLES en CHAR_STYLES in scripts/md_naar_docx.py (uitgevoerd door scripts/formaat_naar_json.py).
// stijlkoppeling.test.ts bewaakt dat ALINEASTIJL_NAAR_WORD en DOMEIN_NAAR_WORD daaraan gelijk zijn en dat elk styleId in het Word-sjabloon van Lukas bestaat.
// TITEL_WORD, ONDERWIJS_KLEUR en HIGHLIGHT_KLEUR staan in md_naar_docx.py als losse waarden in de code; de test controleert alleen TITEL_WORD tegen het sjabloon.
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
