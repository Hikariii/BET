/** Welke kant de hoofdstukstrip nog op kan schuiven; een pijltje staat er alleen als het iets doet. */
export type Schuifstand = { terug: boolean; verder: boolean };

/** Afronding van de browser (subpixels, zoom) mag geen pijltje laten staan dat niets meer doet. */
const SPELING_PX = 2;

export function schuifstand(scrollLinks: number, zichtbareBreedte: number, totaleBreedte: number): Schuifstand {
	return {
		terug: scrollLinks > SPELING_PX,
		verder: scrollLinks + zichtbareBreedte < totaleBreedte - SPELING_PX,
	};
}

/** Een klik op een pijltje schuift ongeveer een strookbreedte op, met een stukje overlap zodat je ziet waar je was. */
export function schuifAfstand(zichtbareBreedte: number): number {
	return Math.max(1, Math.round(zichtbareBreedte * 0.8));
}

type Vak = { links: number; breedte: number };

/**
 * Hoe ver de strip moet schuiven zodat het open hoofdstuk goed in beeld staat, of `null` als hij kan blijven staan.
 * Staat het hoofdstuk al in beeld, met `rand` ruimte tot de vervaagde randen, dan schuift er niets: zo springt de strip niet bij elke klik naar een buurhoofdstuk.
 * Anders komt het hoofdstuk in het midden.
 */
export function scrollVoorHuidig(scrollLinks: number, zichtbareBreedte: number, huidig: Vak, rand: number): number | null {
	const inBeeld = huidig.links - scrollLinks >= rand && huidig.links + huidig.breedte - scrollLinks <= zichtbareBreedte - rand;
	return inBeeld ? null : huidig.links - (zichtbareBreedte - huidig.breedte) / 2;
}
