import type { Bronvorm } from '../../uitlijning/gevonden';

export type GevondenFilter = {
	zoekterm: string;
	alleenVerschillend: boolean;
};

/**
 * De bronvormen die het tabblad toont.
 * Zonder zoekterm: met `alleenVerschillend` de volgorde van `verschillend` (opvallendste bovenaan), anders alle bronvormen op aantal.
 * Met zoekterm altijd in alle bronvormen, verschillend vertaalde vooraan: wie een woord zoekt, wil het vinden, ook als het overal hetzelfde vertaald is.
 * De zoekterm zoekt in de bronvorm en in de vertalingen, zonder hoofdletters.
 */
export function filterBronvormen(alle: readonly Bronvorm[], verschillend: readonly Bronvorm[], filter: GevondenFilter): Bronvorm[] {
	const term = filter.zoekterm.trim().toLowerCase();
	if (term === '') {
		return filter.alleenVerschillend ? [...verschillend] : [...alle].sort((a, b) => b.aantal - a.aantal);
	}
	const isVerschillend = new Set(verschillend);
	const passend = alle.filter(
		(vorm) => vorm.bronvorm.includes(term) || vorm.vertalingen.some((vertaling) => vertaling.nieuw.includes(term)),
	);
	return passend.sort((a, b) => Number(isVerschillend.has(b)) - Number(isVerschillend.has(a)) || b.aantal - a.aantal);
}

/** Hoe een vertaling in de tabel heet: de nieuwe vorm, of dat het woord gelijk bleef of wegviel. */
export function vertalingLabel(vertaling: { nieuw: string; voorbeeld: string; gelijk: boolean }): string {
	if (vertaling.gelijk) return 'bleef gelijk';
	if (vertaling.nieuw === '') return 'weggelaten';
	return vertaling.voorbeeld;
}
