import type { Opslag } from '../bewerken/tussenstand';

/** De vaste waarde van `optie` bij een antwoord dat geen van de opties van de vraag is maar een eigen, genuanceerd antwoord. */
export const EIGEN_ANTWOORD = 'eigen antwoord';

/**
 * Een antwoord op een vertaalvraag, gegeven in deze browser. De vraag heeft geen vast id: de kwestie-tekst uit `open-vragen.md` is de sleutel.
 * Onder een antwoord hangen nul, één of meer toegepaste structurele keuzes (`keuzeIds`); een antwoord zonder keuzes is bv. "houden" of een regel die alleen in de toelichting staat.
 * Het besluit in `open-vragen.md` verandert hierdoor niet; dat doet Claude bij het terugvoeren, na akkoord van de eigenaar.
 */
export type Antwoord = {
	kwestie: string;
	/** De gekozen optie zoals hij in de vraag staat, bv. "a) genade, zoals de vertaler in 1:45/1:48", of `EIGEN_ANTWOORD`. */
	optie: string;
	/** Wanneer te kiezen wat; verplicht bij een eigen antwoord, anders leeg of een aanvulling. Input voor regels of precedentvoorstellen. */
	toelichting: string;
	keuzeIds: string[];
	/** ISO-tijd waarop optie en toelichting voor het laatst zijn vastgelegd; bij samenvoegen van een back-up wint per kwestie de nieuwste. */
	gegeven: string;
};

/** De sleutel waaronder de antwoorden van een boek in de opslag staan. */
export function antwoordenSleutel(boek: string): string {
	return `bet-antwoorden/${boek}`;
}

/**
 * Leest één antwoord uit opgeslagen JSON; `null` bij een onbruikbare vorm.
 * Een oud antwoord (met `keuzeId: string | null` en zonder toelichting) wordt `keuzeIds` met nul of één keuze en een lege toelichting.
 */
export function alsAntwoord(waarde: unknown): Antwoord | null {
	if (typeof waarde !== 'object' || waarde === null || Array.isArray(waarde)) return null;
	const { kwestie, optie, gegeven, keuzeIds, keuzeId, toelichting } = waarde as Record<string, unknown>;
	if (typeof kwestie !== 'string' || typeof optie !== 'string' || typeof gegeven !== 'string') return null;
	if (toelichting !== undefined && typeof toelichting !== 'string') return null;
	const ids = alsKeuzeIds(keuzeIds, keuzeId);
	return ids === null ? null : { kwestie, optie, toelichting: toelichting ?? '', keuzeIds: ids, gegeven };
}

function alsKeuzeIds(keuzeIds: unknown, oudKeuzeId: unknown): string[] | null {
	if (keuzeIds === undefined) {
		if (oudKeuzeId === null) return [];
		return typeof oudKeuzeId === 'string' ? [oudKeuzeId] : null;
	}
	if (!Array.isArray(keuzeIds) || !keuzeIds.every((id) => typeof id === 'string')) return null;
	return [...new Set<string>(keuzeIds)];
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

export type Uitkomst = { gelukt: true } | { gelukt: false; melding: string };

const OPSLAG_VOL = 'Het antwoord kon niet worden bewaard, waarschijnlijk is de opslag vol.';
const TOELICHTING_VERPLICHT = 'Bij een eigen antwoord is een toelichting of regel verplicht.';

/** Wat de vertaler invult bij het vastleggen van een antwoord. */
type Vastlegging = { kwestie: string; optie: string; toelichting: string };

function vastgelegd(opslag: Opslag, boek: string, antwoord: Antwoord): Uitkomst {
	return bewaarAntwoord(opslag, boek, antwoord) ? { gelukt: true } : { gelukt: false, melding: OPSLAG_VOL };
}

/**
 * Legt een antwoord vast zonder toegepaste keuze. Bij een eigen antwoord is de toelichting verplicht.
 * Bestaat er al een antwoord op de kwestie, dan weigert dit: een bestaand antwoord met keuzes verandert niet van optie.
 */
export function legAntwoordVast(opslag: Opslag, boek: string, { kwestie, optie, toelichting }: Vastlegging, nu: Date): Uitkomst {
	const schoon = toelichting.trim();
	if (optie === EIGEN_ANTWOORD && schoon === '') return { gelukt: false, melding: TOELICHTING_VERPLICHT };
	if (leesAntwoorden(opslag, boek).some((bestaand) => bestaand.kwestie === kwestie)) {
		return { gelukt: false, melding: 'Er is al een antwoord op deze vraag. Trek dat eerst in, of pas de toelichting aan.' };
	}
	return vastgelegd(opslag, boek, { kwestie, optie, toelichting: schoon, keuzeIds: [], gegeven: nu.toISOString() });
}

/** Vervangt de toelichting van het antwoord op een kwestie; bij een eigen antwoord mag ze niet leeg worden. */
export function pasToelichtingAan(opslag: Opslag, boek: string, kwestie: string, toelichting: string, nu: Date): Uitkomst {
	const bestaand = leesAntwoorden(opslag, boek).find((antwoord) => antwoord.kwestie === kwestie);
	if (bestaand === undefined) return { gelukt: false, melding: 'Er is geen antwoord op deze vraag.' };
	const schoon = toelichting.trim();
	if (bestaand.optie === EIGEN_ANTWOORD && schoon === '') return { gelukt: false, melding: TOELICHTING_VERPLICHT };
	return vastgelegd(opslag, boek, { ...bestaand, toelichting: schoon, gegeven: nu.toISOString() });
}

/**
 * Hangt een toegepaste keuze onder het antwoord op een kwestie. Bestaat dat antwoord, dan blijven optie en toelichting staan;
 * anders komt er een antwoord met de gegeven optie, een lege toelichting en de keuze. Geeft onwaar als de opslag weigert.
 */
export function voegKeuzeToe(opslag: Opslag, boek: string, vraag: { kwestie: string; optie: string }, keuzeId: string, nu: Date): boolean {
	const bestaand = leesAntwoorden(opslag, boek).find((antwoord) => antwoord.kwestie === vraag.kwestie);
	if (bestaand === undefined) {
		return bewaarAntwoord(opslag, boek, { kwestie: vraag.kwestie, optie: vraag.optie, toelichting: '', keuzeIds: [keuzeId], gegeven: nu.toISOString() });
	}
	return bewaarAntwoord(opslag, boek, { ...bestaand, keuzeIds: [...new Set([...bestaand.keuzeIds, keuzeId])] });
}

/**
 * Haalt een (teruggedraaide) keuze uit alle antwoorden die ernaar wijzen. Een antwoord dat daarna geen keuzes en geen toelichting meer heeft, verdwijnt;
 * met toelichting blijft het staan.
 */
export function haalKeuzeUitAntwoorden(opslag: Opslag, boek: string, keuzeId: string): void {
	const overgebleven = leesAntwoorden(opslag, boek).flatMap((antwoord): Antwoord[] => {
		if (!antwoord.keuzeIds.includes(keuzeId)) return [antwoord];
		const keuzeIds = antwoord.keuzeIds.filter((id) => id !== keuzeId);
		return keuzeIds.length === 0 && antwoord.toelichting === '' ? [] : [{ ...antwoord, keuzeIds }];
	});
	schrijfAntwoorden(opslag, boek, overgebleven);
}

/** De keuzes onder het antwoord die nog bestaan; een keuze die verdwenen is (bv. na een back-up) telt niet mee. */
export function levendeKeuzeIds(antwoord: Antwoord, bestaandeKeuzes: ReadonlySet<string>): string[] {
	return antwoord.keuzeIds.filter((id) => bestaandeKeuzes.has(id));
}

/** Trekt het antwoord op een kwestie in. Weigert zolang er nog bestaande keuzes onder hangen: die moeten eerst terug. */
export function trekAntwoordIn(opslag: Opslag, boek: string, kwestie: string, bestaandeKeuzes: ReadonlySet<string>): Uitkomst {
	const antwoorden = leesAntwoorden(opslag, boek);
	const antwoord = antwoorden.find((kandidaat) => kandidaat.kwestie === kwestie);
	if (antwoord === undefined) return { gelukt: true };
	if (levendeKeuzeIds(antwoord, bestaandeKeuzes).length > 0) {
		return { gelukt: false, melding: 'Er hangen nog keuzes onder dit antwoord. Draai die eerst terug onder Zoeken en vervangen.' };
	}
	return schrijfAntwoorden(opslag, boek, antwoorden.filter((kandidaat) => kandidaat !== antwoord)) ? { gelukt: true } : { gelukt: false, melding: OPSLAG_VOL };
}
