import type { Precedent } from '../data/types';

/** Een korte bron of een algemene vereenvoudiging als "blijft" zou bijna elke logregel raken. */
const MINIMALE_LENGTE_BRON = 5;
const MINIMALE_LENGTE_VEREENVOUDIGD = 7;

/**
 * De zoektermen van een tabelcel: de varianten gescheiden door `/` of `;`, zonder uitleg tussen haakjes.
 * "discipel(en)" wordt "discipel" en "melaats(heid)" wordt "melaats", zodat de stam ook "discipelen" vindt.
 */
function zoektermen(cel: string, minimaleLengte: number): string[] {
	return cel
		.split(/[/;]/)
		.map((deel) => deel.replace(/\([^)]*\)/g, '').replace(/["“”„']/g, '').trim().toLowerCase())
		.filter((term) => term.length >= minimaleLengte);
}

function komtVoor(term: string, tekst: string): boolean {
	const alsPatroon = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`(?<!\\p{L})${alsPatroon}`, 'u').test(tekst);
}

/**
 * De precedenten waar een logregel over gaat, op volgorde van de tabel.
 * De verwijzing "precedent" in het log noemt geen regel uit de tabel, dus dit raadt: de bron of de vereenvoudiging van het precedent komt aan het begin van een woord in de logregel voor.
 */
export function precedentenBijRegel(regel: string, precedenten: readonly Precedent[]): number[] {
	const tekst = regel.toLowerCase();
	return precedenten.flatMap((precedent, index) =>
		[...zoektermen(precedent.bron, MINIMALE_LENGTE_BRON), ...zoektermen(precedent.vereenvoudigd, MINIMALE_LENGTE_VEREENVOUDIGD)].some((term) => komtVoor(term, tekst)) ? [index] : [],
	);
}
