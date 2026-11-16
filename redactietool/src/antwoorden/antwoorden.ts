import type { Opslag } from '../bewerken/tussenstand';

/**
 * Een antwoord op een vertaalvraag, gegeven in deze browser. De vraag heeft geen vast id: de kwestie-tekst uit `open-vragen.md` is de sleutel.
 * `keuzeId` wijst naar de toegepaste structurele keuze; `null` bij een antwoord zonder wijziging (bv. "houden").
 * Het besluit in `open-vragen.md` verandert hierdoor niet; dat doet Claude bij het terugvoeren, na akkoord van de eigenaar.
 */
export type Antwoord = {
	kwestie: string;
	/** De gekozen optie zoals hij in de vraag staat, bv. "a) genade, zoals de vertaler in 1:45/1:48". */
	optie: string;
	keuzeId: string | null;
	/** ISO-tijd. */
	gegeven: string;
};

/** De sleutel waaronder de antwoorden van een boek in de opslag staan. */
export function antwoordenSleutel(boek: string): string {
	return `bet-antwoorden/${boek}`;
}

/** Alle antwoorden van een boek; onleesbare opslag geeft een lege lijst. Wordt ingevuld. */
export function leesAntwoorden(_opslag: Opslag, _boek: string): Antwoord[] {
	return [];
}

/** Bewaart een antwoord; een eerder antwoord op dezelfde kwestie wordt vervangen. Geeft onwaar als de opslag weigert. Wordt ingevuld. */
export function bewaarAntwoord(_opslag: Opslag, _boek: string, _antwoord: Antwoord): boolean {
	return false;
}

/** Haalt het antwoord op een kwestie weg. Wordt ingevuld. */
export function verwijderAntwoord(_opslag: Opslag, _boek: string, _kwestie: string): void {}

/** Haalt de antwoorden weg die naar een (teruggedraaide) keuze wijzen. Wordt ingevuld. */
export function verwijderAntwoordenVanKeuze(_opslag: Opslag, _boek: string, _keuzeId: string): void {}
