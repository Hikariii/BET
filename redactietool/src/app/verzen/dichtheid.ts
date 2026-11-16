/** De drie manieren om de verzen dicht op elkaar te zetten; `?verzen=d2` kiest er één. Combineerbaar met `?ontwerp=`. */
export const DICHTHEDEN = ['d1', 'd2', 'd3'] as const;
export type Dichtheid = (typeof DICHTHEDEN)[number];

export const DICHTHEID_TITELS: Record<Dichtheid, string> = {
	d1: 'Overloop zweeft',
	d2: 'Samenvatting',
	d3: 'Kanttekeningen',
};

function isDichtheid(waarde: string | null): waarde is Dichtheid {
	return DICHTHEDEN.some((naam) => naam === waarde);
}

/** Leest `?verzen=d1` tot `d3` uit het zoekdeel van het adres; een onbekende waarde telt als geen. */
export function leesDichtheid(zoekdeel: string): Dichtheid | null {
	const waarde = new URLSearchParams(zoekdeel).get('verzen');
	return isDichtheid(waarde) ? waarde : null;
}

/** Het adres van de huidige pagina met een andere (of geen) dichtheid; `?ontwerp=` en de hash blijven staan. */
export function adresMetDichtheid(huidig: string, dichtheid: Dichtheid | null): string {
	const adres = new URL(huidig);
	if (dichtheid === null) adres.searchParams.delete('verzen');
	else adres.searchParams.set('verzen', dichtheid);
	return adres.href;
}

/** Een kanttekening zoals de pagina hem meet, in pixels. */
export type Notitiemeting = {
	/** De bovenkant van het vers waar de notitie bij hoort. */
	gewenstBoven: number;
	hoogte: number;
};

/**
 * Plaatst kanttekeningen naast hun vers zonder dat ze over elkaar vallen: elke notitie staat op zijn vers
 * of, als de vorige nog doorloopt, direct eronder. Notities schuiven alleen omlaag en houden hun volgorde.
 * Geeft de bovenkant van elke notitie terug.
 */
export function plaatsNotities(metingen: readonly Notitiemeting[], tussenruimte: number): number[] {
	const plaatsen: number[] = [];
	let vrijVanaf = Number.NEGATIVE_INFINITY;
	for (const meting of metingen) {
		const boven = Math.max(meting.gewenstBoven, vrijVanaf);
		plaatsen.push(boven);
		vrijVanaf = boven + meting.hoogte + tussenruimte;
	}
	return plaatsen;
}
