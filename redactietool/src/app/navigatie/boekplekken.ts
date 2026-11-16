import type { Referentie } from '../../data/types';
import { maakAdres, TABBLADEN, versAdres, type Tabblad } from '../adres';
import { meervoud } from '../bewaren/bewaarTekst';
import { aantalOpenVragenInBoek } from '../vertaalvragen';

export const TABBLADTITEL: Record<Tabblad, string> = {
	besloten: 'Vertaalkeuzes',
	gevonden: 'Zo vertaald',
	vragen: 'Vertaalvragen',
	vervangen: 'Zoeken en vervangen',
};

/** De plekken in een boek, behalve Opgeslagen: de hoofdstukken, de vier tabbladen van het scherm Keuzes en vragen en de pagina Richtlijn. */
export type Plek = 'hoofdstukken' | Tabblad | 'richtlijn';

/** De volledige naam van elke plek, voor de tabbladen en voor de help. */
export const PLEKNAAM: Record<Plek, string> = { hoofdstukken: 'Hoofdstukken', ...TABBLADTITEL, richtlijn: 'Richtlijn' };

/** De naam van de pagina Bewaard; die staat niet als tabblad in de balk maar als link naar de bewaarstatus. */
export const BEWAARD_NAAM = 'Opgeslagen';

type Aantal = { getal: number; tekst: string };

export type BoekPlek = {
	plek: Plek;
	/** De volledige naam, voor de tabbladen. */
	naam: string;
	adres: string;
	/** Het aantal en wat het telt, bv. `9 open vragen`; `null` als een telling hier niets zegt. */
	aantal: Aantal | null;
};

function aantalVan(getal: number, enkelvoud: string, meervoudsvorm: string): Aantal {
	return { getal, tekst: meervoud(getal, enkelvoud, meervoudsvorm) };
}

/**
 * De plekken in een boek, in de volgorde van de balk.
 * Hoofdstukken wijst naar `laatsteHoofdstuk`, het hoofdstuk dat de lezer het laatst open had.
 * Het aantal bij Vertaalvragen telt de open vragen uit het register: de vragen die de redactie kan beantwoorden.
 */
export function boekPlekken(boek: string, referentie: Referentie, laatsteHoofdstuk: number): BoekPlek[] {
	const aantallen: Record<Tabblad, Aantal | null> = {
		besloten: aantalVan(referentie.precedenten.length, 'vertaalkeuze', 'vertaalkeuzes'),
		gevonden: null,
		vragen: aantalVan(aantalOpenVragenInBoek(referentie.openVragen), 'open vraag', 'open vragen'),
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
		{ plek: 'richtlijn', naam: PLEKNAAM.richtlijn, adres: maakAdres({ soort: 'richtlijn', boek, paragraaf: null }), aantal: null },
	];
}
