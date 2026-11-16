import type { VersRef } from '../data/types';
import { DOMEINEN, type Domein } from '../formaat/types';
import type { Voorstel } from '../vervangen/voorstel';

const LETTEROPTIE_BEGIN = /^\s*[a-z]\)\s/;
/** Een volgende letteroptie begint na een puntkomma: `; b) …`. */
const VOLGENDE_LETTEROPTIE = /;\s*(?=[a-z]\)\s)/;
/** Een schuine streep met spaties eromheen scheidt alternatieven; `1:45/1:48` niet. */
const SCHUINE_STREEP = /\s+\/\s+/;
const ELLIPS = /…|\.\.\./;

const AANHALING = /"([^"]+)"|“([^”]+)”|(?<![\p{L}\p{N}])'([^']+)'(?![\p{L}\p{N}])/gu;

/**
 * Splitst de kolom Alternatief van een vraag in opties: `a) …; b) …; c) …` in drie, `x / y` in twee, anders één optie.
 * Een letteroptie houdt haar letter, zoals de optie in de vraag staat. Een leeg alternatief geeft geen opties.
 */
export function splitsOpties(alternatief: string | null): string[] {
	const tekst = (alternatief ?? '').trim();
	if (tekst === '') return [];
	const delen = LETTEROPTIE_BEGIN.test(tekst) ? tekst.split(VOLGENDE_LETTEROPTIE) : tekst.split(SCHUINE_STREEP);
	return delen.map((deel) => deel.trim()).filter((deel) => deel !== '');
}

/** Het woord of de woorden tussen aanhalingstekens in de kwestie, als dat er precies één is en het letterlijk te zoeken is (geen weglatingspunten). */
export function zoektermUitKwestie(kwestie: string): string | null {
	const termen = new Set([...kwestie.matchAll(AANHALING)].map((treffer) => (treffer[1] ?? treffer[2] ?? treffer[3] ?? '').trim()));
	const [enige] = termen;
	if (termen.size !== 1 || enige === undefined || enige === '' || ELLIPS.test(enige)) return null;
	return enige;
}

/** De markering die de optie noemt, als dat er precies één is. */
export function domeinInOptie(optie: string): Domein | null {
	const genoemd = DOMEINEN.filter((domein) => new RegExp(`(?<![\\p{L}\\p{N}])${domein}(?![\\p{L}\\p{N}])`, 'iu').test(optie));
	const [enige] = genoemd;
	return genoemd.length === 1 && enige !== undefined ? enige : null;
}

type VraagVoorVoorstel = { kwestie: string; verzen: readonly VersRef[] };

/**
 * Wat Zoeken en vervangen vooraf krijgt als de vertaler een optie kiest: alleen wat zeker is.
 * Bereik zijn de verzen van de vraag; zoekterm het enige woord tussen aanhalingstekens in de kwestie.
 * Noemt de optie een markering, dan wisselt de opdracht de markering naar die ene (`van` alleen als `domeinenOpZoekterm` er precies één geeft);
 * anders een tekstopdracht zonder vervanging, want de optietekst is meestal geen letterlijke tekst.
 */
export function maakVoorstel(vraag: VraagVoorVoorstel, optie: string, domeinenOpZoekterm: (zoekterm: string) => readonly Domein[]): Voorstel {
	const zoekterm = zoektermUitKwestie(vraag.kwestie) ?? '';
	const naar = domeinInOptie(optie);
	const basis = { kwestie: vraag.kwestie, optie, zoekterm, verzen: [...vraag.verzen] };
	if (naar === null) return { ...basis, opdracht: 'tekst', nieuw: '', van: null, naar: null };
	const aanwezig = zoekterm === '' ? [] : domeinenOpZoekterm(zoekterm);
	const [enige] = aanwezig;
	return { ...basis, opdracht: 'markering', nieuw: '', van: aanwezig.length === 1 && enige !== undefined && enige !== naar ? enige : null, naar };
}
