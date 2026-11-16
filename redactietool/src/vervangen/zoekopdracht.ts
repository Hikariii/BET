import type { VersInhoud } from '../bewerken/types';
import type { VersRef } from '../data/types';
import type { Domein } from '../formaat/types';
import type { HoofdstukVerzen, Vondst } from './types';

/** Waar gezocht wordt: het hele boek, of alleen de verzen van een vertaalvraag. */
export type Bereik = { soort: 'boek' } | { soort: 'verzen'; verzen: readonly VersRef[] };

/**
 * Wat Zoeken en vervangen doet: de tekst vervangen, of alleen de markering op dezelfde woorden wisselen (domein `van` wordt `naar`).
 * Bij een markeringswissel blijft de tekst gelijk en ook de overige opmaak (onderwijs, highlight, vet, onderstreept).
 */
export type Zoekopdracht =
	| { soort: 'tekst'; zoekterm: string; nieuw: string; bereik: Bereik }
	| { soort: 'markering'; zoekterm: string; van: Domein; naar: Domein; bereik: Bereik };

/**
 * Een plek voor een zoekopdracht. `variant` is de gevonden vorm (kleine letters) als die afwijkt van de zoekterm
 * (ander of geen lidwoord, meervoud, vervoeging); `null` voor de zoekterm zelf. `vervangbaar` geldt voor deze opdracht.
 */
export type Plek = Vondst & { variant: string | null };

/** Alle plekken voor de opdracht binnen het bereik, met de varianten erbij, op volgorde van hoofdstuk, vers en positie. Wordt ingevuld. */
export function zoekPlekken(_hoofdstukken: readonly HoofdstukVerzen[], _opdracht: Zoekopdracht): Plek[] {
	return [];
}

/**
 * Past de opdracht toe op de aangevinkte plekken van één vers. Bij tekst: hoofdvorm wordt `nieuw`, een variant wordt de vervanging uit
 * `variantVervangingen` (ontbreekt of leeg: niet toepassen). Bij markering: domein `van` wordt `naar` op de plek, ook voor varianten. Wordt ingevuld.
 */
export function wijzigVers(inhoud: VersInhoud, _plekken: readonly Plek[], _opdracht: Zoekopdracht, _variantVervangingen: ReadonlyMap<string, string>): VersInhoud {
	return inhoud;
}

/** De domeinen die binnen het bereik op de zoekterm liggen, zonder dubbele; om het van-domein alleen vooraf in te vullen als het er één is. Wordt ingevuld. */
export function domeinenOpZoekterm(_hoofdstukken: readonly HoofdstukVerzen[], _zoekterm: string, _bereik: Bereik): Domein[] {
	return [];
}
