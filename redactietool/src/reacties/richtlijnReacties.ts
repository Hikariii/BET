import type { Uitkomst } from '../antwoorden/antwoorden';
import { nietOpgeslagen, RUIMTE_MAKEN, TEKST_BLIJFT } from '../bewerken/opslagVol';
import type { Opslag } from '../bewerken/tussenstand';

/**
 * Een reactie van de vertaler op een paragraaf van de richtlijn, of een voorstel voor een nieuwe regel (`paragraaf` is dan `null`).
 * De richtlijn geldt voor alle boeken, dus deze reacties horen bij geen boek.
 * De richtlijn zelf verandert hierdoor niet; dat doet Claude bij het terugvoeren, na akkoord van de eigenaar.
 * Een reactie zonder tekst en zonder `voorstel` bestaat niet.
 */
export type RichtlijnReactie = {
	/** `§17B` voor de reactie op een paragraaf (er is er één per paragraaf), `nieuw-<tijd>` voor een voorstel voor een nieuwe regel. */
	id: string;
	/** Het nummer van de paragraaf zonder §; `null` bij een voorstel voor een nieuwe regel. */
	paragraaf: string | null;
	/** De titel van de paragraaf, zodat Claude ziet welke bedoeld was als de nummering verschuift; leeg bij een nieuwe regel. */
	titel: string;
	tekst: string;
	/** De vertaler stelt een nieuwe of andere regel voor; Claude schrijft er een voorstel voor de richtlijn bij. */
	voorstel: boolean;
	/** ISO-tijd waarop de reactie voor het laatst is vastgelegd; bij samenvoegen van een back-up wint per id de nieuwste. */
	gegeven: string;
};

/** De sleutel waaronder alle reacties op de richtlijn in de opslag staan. */
export const RICHTLIJN_REACTIES_SLEUTEL = 'bet-richtlijn-reacties';

/** Het id van de reactie op een paragraaf, bv. `§17B`. */
export function paragraafReactieId(paragraaf: string): string {
	return `§${paragraaf}`;
}

/** Een id voor een nieuw voorstel: de tijd erin, met een teller erachter als dat id er al is. */
export function nieuweRegelId(nu: Date, bestaand: readonly RichtlijnReactie[]): string {
	const basis = `nieuw-${nu.getTime()}`;
	let id = basis;
	for (let teller = 2; bestaand.some((reactie) => reactie.id === id); teller++) id = `${basis}-${teller}`;
	return id;
}

/** Leest één reactie uit opgeslagen JSON; `null` bij een onbruikbare vorm. */
export function alsRichtlijnReactie(waarde: unknown): RichtlijnReactie | null {
	if (typeof waarde !== 'object' || waarde === null || Array.isArray(waarde)) return null;
	const { id, paragraaf, titel, tekst, voorstel, gegeven } = waarde as Record<string, unknown>;
	if (typeof id !== 'string' || id === '' || typeof titel !== 'string' || typeof tekst !== 'string' || typeof gegeven !== 'string') return null;
	if (paragraaf !== null && typeof paragraaf !== 'string') return null;
	if (typeof voorstel !== 'boolean') return null;
	return { id, paragraaf, titel, tekst, voorstel, gegeven };
}

/** Alle reacties op de richtlijn, op volgorde van bewaren; onleesbare opslag geeft een lege lijst, een onleesbare reactie wordt overgeslagen. */
export function leesRichtlijnReacties(opslag: Opslag): RichtlijnReactie[] {
	try {
		const tekst = opslag.getItem(RICHTLIJN_REACTIES_SLEUTEL);
		if (tekst === null) return [];
		const json: unknown = JSON.parse(tekst);
		if (!Array.isArray(json)) return [];
		return json.flatMap((waarde) => alsRichtlijnReactie(waarde) ?? []);
	} catch {
		return [];
	}
}

/** Schrijft de lijst terug; zonder reacties verdwijnt de sleutel. Geeft `false` als de opslag het weigert. */
export function schrijfRichtlijnReacties(opslag: Opslag, reacties: readonly RichtlijnReactie[]): boolean {
	try {
		if (reacties.length === 0) opslag.removeItem(RICHTLIJN_REACTIES_SLEUTEL);
		else opslag.setItem(RICHTLIJN_REACTIES_SLEUTEL, JSON.stringify(reacties));
		return true;
	} catch {
		return false;
	}
}

const OPSLAG_VOL = `${nietOpgeslagen('De reactie')} ${RUIMTE_MAKEN} ${TEKST_BLIJFT}`;

function opgeslagen(gelukt: boolean): Uitkomst {
	return gelukt ? { gelukt: true } : { gelukt: false, melding: OPSLAG_VOL };
}

/** Haalt de reactie met dit id weg; bestaat er geen, dan gebeurt er niets. */
export function haalRichtlijnReactieWeg(opslag: Opslag, id: string): Uitkomst {
	const reacties = leesRichtlijnReacties(opslag);
	if (!reacties.some((reactie) => reactie.id === id)) return { gelukt: true };
	return opgeslagen(
		schrijfRichtlijnReacties(
			opslag,
			reacties.filter((reactie) => reactie.id !== id),
		),
	);
}

/**
 * Bewaart een reactie; een eerdere reactie met hetzelfde id wordt vervangen.
 * Een reactie met alleen witruimte als tekst en zonder `voorstel` bestaat niet: dan is bewaren hetzelfde als weghalen.
 */
export function bewaarRichtlijnReactie(opslag: Opslag, reactie: RichtlijnReactie): Uitkomst {
	const schoon = { ...reactie, tekst: reactie.tekst.trim() };
	if (schoon.tekst === '' && !schoon.voorstel) return haalRichtlijnReactieWeg(opslag, schoon.id);
	const overige = leesRichtlijnReacties(opslag).filter((bestaand) => bestaand.id !== schoon.id);
	return opgeslagen(schrijfRichtlijnReacties(opslag, [...overige, schoon]));
}
