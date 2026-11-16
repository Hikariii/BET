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

/** Leest één antwoord uit opgeslagen JSON; `null` bij een onbruikbare vorm. */
export function alsAntwoord(waarde: unknown): Antwoord | null {
	if (typeof waarde !== 'object' || waarde === null || Array.isArray(waarde)) return null;
	const { kwestie, optie, keuzeId, gegeven } = waarde as Record<string, unknown>;
	if (typeof kwestie !== 'string' || typeof optie !== 'string' || typeof gegeven !== 'string') return null;
	if (keuzeId !== null && typeof keuzeId !== 'string') return null;
	return { kwestie, optie, keuzeId, gegeven };
}

/** Alle antwoorden van een boek, op volgorde van bewaren; onleesbare opslag geeft een lege lijst, een onleesbaar antwoord wordt overgeslagen. */
export function leesAntwoorden(opslag: Opslag, boek: string): Antwoord[] {
	try {
		const tekst = opslag.getItem(antwoordenSleutel(boek));
		if (tekst === null) return [];
		const json: unknown = JSON.parse(tekst);
		if (!Array.isArray(json)) return [];
		return json.flatMap((waarde) => alsAntwoord(waarde) ?? []);
	} catch {
		return [];
	}
}

/** Schrijft de lijst terug; zonder antwoorden verdwijnt de sleutel. Geeft `false` als de opslag het weigert. */
export function schrijfAntwoorden(opslag: Opslag, boek: string, antwoorden: readonly Antwoord[]): boolean {
	try {
		if (antwoorden.length === 0) opslag.removeItem(antwoordenSleutel(boek));
		else opslag.setItem(antwoordenSleutel(boek), JSON.stringify(antwoorden));
		return true;
	} catch {
		return false;
	}
}

/** Bewaart een antwoord; een eerder antwoord op dezelfde kwestie wordt vervangen. Geeft onwaar als de opslag weigert. */
export function bewaarAntwoord(opslag: Opslag, boek: string, antwoord: Antwoord): boolean {
	const overige = leesAntwoorden(opslag, boek).filter((bestaand) => bestaand.kwestie !== antwoord.kwestie);
	return schrijfAntwoorden(opslag, boek, [...overige, antwoord]);
}

/** Haalt het antwoord op een kwestie weg. */
export function verwijderAntwoord(opslag: Opslag, boek: string, kwestie: string): void {
	schrijfAntwoorden(opslag, boek, leesAntwoorden(opslag, boek).filter((antwoord) => antwoord.kwestie !== kwestie));
}

/** Haalt de antwoorden weg die naar een (teruggedraaide) keuze wijzen. */
export function verwijderAntwoordenVanKeuze(opslag: Opslag, boek: string, keuzeId: string): void {
	schrijfAntwoorden(opslag, boek, leesAntwoorden(opslag, boek).filter((antwoord) => antwoord.keuzeId !== keuzeId));
}

/**
 * Hoe een vraag nu beantwoord is: `met keuze` alleen als de keuze waar het antwoord naar wijst nog bestaat;
 * een antwoord naar een verdwenen keuze telt als zonder keuze, zodat het in te trekken is en Kiezen weer kan.
 */
export function antwoordToestand(antwoord: Antwoord | null, bestaandeKeuzes: ReadonlySet<string>): 'geen' | 'zonder keuze' | 'met keuze' {
	if (antwoord === null) return 'geen';
	return antwoord.keuzeId !== null && bestaandeKeuzes.has(antwoord.keuzeId) ? 'met keuze' : 'zonder keuze';
}
