/** Hoofdstuknummer met voorloopnul, zoals in `lukas-04.md` en `hoofdstuk-04.json`. */
export function nummerMetNul(nummer: number): string {
	return String(nummer).padStart(2, '0');
}

/** Naam van het JSON-bestand dat het bouwscript voor een hoofdstuk schrijft en de app laadt. */
export function hoofdstukJsonNaam(nummer: number): string {
	return `hoofdstuk-${nummerMetNul(nummer)}.json`;
}
