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
