import { splitsOpenVragen } from '../../begrippen/vragenOverzicht';
import { verzamelVragen } from '../../begrippen/verzamelVragen';
import type { HoofdstukData, Referentie } from '../../data/types';
import { maakAdres, TABBLADEN, versAdres, type Tabblad } from '../adres';
import { meervoud } from '../bewaren/bewaarTekst';

export const TABBLADTITEL: Record<Tabblad, string> = {
	besloten: 'Vertaalkeuzes',
	gevonden: 'Zo vertaald',
	vragen: 'Vertaalvragen',
	vervangen: 'Zoeken en vervangen',
};

/** De plekken in een boek, behalve Bewaard: de hoofdstukken en de vier tabbladen van het scherm Keuzes en vragen. */
export type Plek = 'hoofdstukken' | Tabblad;

/** De volledige naam van elke plek, voor de tabbladen en voor de help. */
export const PLEKNAAM: Record<Plek, string> = { hoofdstukken: 'Hoofdstukken', ...TABBLADTITEL };

/** De naam van de pagina Bewaard; die staat niet als tabblad in de balk maar als link naar de bewaarstatus. */
export const BEWAARD_NAAM = 'Bewaard';

type Aantal = { getal: number; tekst: string };

export type BoekPlek = {
	plek: Plek;
	/** De volledige naam, voor de tabbladen. */
	naam: string;
	adres: string;
	/** Het aantal en wat het telt, bv. `17 open vragen`; `null` als een telling hier niets zegt of nog niet bekend is. */
	aantal: Aantal | null;
};

function aantalVan(getal: number, enkelvoud: string, meervoudsvorm: string): Aantal {
	return { getal, tekst: meervoud(getal, enkelvoud, meervoudsvorm) };
}

/** De open vragen van het register en uit de logs samen, zoals het tabblad Vertaalvragen ze telt. */
function aantalOpenVragenInBoek(referentie: Referentie, hoofdstukken: readonly Pick<HoofdstukData, 'nummer' | 'log'>[]): number {
	return splitsOpenVragen(verzamelVragen(referentie.openVragen, hoofdstukken)).open.length;
}

/**
 * De plekken in een boek, in de volgorde van de balk.
 * Hoofdstukken wijst naar `laatsteHoofdstuk`, het hoofdstuk dat de lezer het laatst open had.
 * Zolang de hoofdstukken nog laden (`null`) is het aantal open vragen niet bekend, want de logs staan in de hoofdstukken.
 */
export function boekPlekken(
	boek: string,
	referentie: Referentie,
	hoofdstukken: readonly Pick<HoofdstukData, 'nummer' | 'log'>[] | null,
	laatsteHoofdstuk: number,
): BoekPlek[] {
	const aantallen: Record<Tabblad, Aantal | null> = {
		besloten: aantalVan(referentie.precedenten.length, 'vertaalkeuze', 'vertaalkeuzes'),
		gevonden: null,
		vragen: hoofdstukken === null ? null : aantalVan(aantalOpenVragenInBoek(referentie, hoofdstukken), 'open vraag', 'open vragen'),
		vervangen: null,
	};
	return [
		{ plek: 'hoofdstukken', naam: PLEKNAAM.hoofdstukken, adres: versAdres(boek, laatsteHoofdstuk), aantal: null },
		...TABBLADEN.map((tabblad) => ({
			plek: tabblad,
			naam: PLEKNAAM[tabblad],
			adres: maakAdres({ soort: 'begrippen', boek, tabblad }),
			aantal: aantallen[tabblad],
		})),
	];
}
