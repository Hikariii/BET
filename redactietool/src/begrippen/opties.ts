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

/** Alle woorden tussen aanhalingstekens in de kwestie die letterlijk te zoeken zijn (geen weglatingspunten), zonder dubbele, in volgorde. */
function zoektermenUitKwestie(kwestie: string): string[] {
	const termen = [...kwestie.matchAll(AANHALING)].map((treffer) => (treffer[1] ?? treffer[2] ?? treffer[3] ?? '').trim());
	return [...new Set(termen)].filter((term) => term !== '' && !ELLIPS.test(term));
}

/** Het woord of de woorden tussen aanhalingstekens in de kwestie, als dat er precies één is en het letterlijk te zoeken is (geen weglatingspunten). */
export function zoektermUitKwestie(kwestie: string): string | null {
	const termen = zoektermenUitKwestie(kwestie);
	const [enige] = termen;
	return termen.length === 1 && enige !== undefined ? enige : null;
}

/** Een optie die zegt dat het blijft zoals het is ("… houden", "laten staan", "blijft"): kiezen legt alleen het antwoord vast, zonder wijziging. */
const HOUDEN = /\b(houden|laten staan|blijft|blijven)\b/i;

export function isHoudOptie(optie: string): boolean {
	return HOUDEN.test(optie);
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
	const naar = domeinInOptie(optie);
	const termen = zoektermenUitKwestie(vraag.kwestie);
	if (naar === null) {
		const zoekterm = termen.length === 1 ? (termen[0] ?? '') : '';
		return { kwestie: vraag.kwestie, optie, zoekterm, verzen: [...vraag.verzen], opdracht: 'tekst', nieuw: '', van: null, naar: null };
	}
	// Noemt de kwestie meer termen (bv. "Gezegend" uit "zalig"), dan de enige die op de verzen een markering heeft.
	const gemarkeerd = termen.filter((term) => domeinenOpZoekterm(term).length > 0);
	const zoekterm = gemarkeerd.length === 1 ? (gemarkeerd[0] ?? '') : termen.length === 1 ? (termen[0] ?? '') : '';
	// Van: het enige domein op de zoekterm dat niet al het doeldomein is.
	const anders = zoekterm === '' ? [] : domeinenOpZoekterm(zoekterm).filter((domein) => domein !== naar);
	const van = anders.length === 1 ? (anders[0] ?? null) : null;
	return { kwestie: vraag.kwestie, optie, zoekterm, verzen: [...vraag.verzen], opdracht: 'markering', nieuw: '', van, naar };
}
