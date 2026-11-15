import { pasTussenstandToe } from '../../bewerken/tussenstand';
import type { Tussenstand, VersInhoud } from '../../bewerken/types';
import { knipVers } from '../../bewerken/versknip';
import type { HoofdstukData } from '../../data/types';

/** Wat de voorproef van één vers toont: de vereenvoudiging zoals de vertaler hem ziet (met tussenstand) en de bron. */
export type VersVoorproef = {
	hoofdstuk: number;
	vers: number;
	vereenvoudigd: VersInhoud;
	bron: VersInhoud | null;
	/** Of de vereenvoudiging een bewerking uit de tussenstand bevat. */
	bewerkt: boolean;
};

/**
 * Zoekt een vers op voor de voorproef. `null` als het hoofdstuk of vers niet bestaat.
 * De tussenstand wordt per hoofdstuk via `leesTussenstand` opgevraagd, zodat de voorproef laat zien wat de vertaler in de tool ziet.
 */
export function zoekVersVoorproef(
	hoofdstukken: readonly HoofdstukData[],
	leesTussenstand: (hoofdstuk: number) => Tussenstand,
	hoofdstuk: number,
	vers: number,
): VersVoorproef | null {
	const data = hoofdstukken.find((kandidaat) => kandidaat.nummer === hoofdstuk);
	if (data === undefined) return null;
	const tussenstand = leesTussenstand(hoofdstuk);
	const vereenvoudigd = knipVers(pasTussenstandToe(data.vereenvoudigd, tussenstand), vers);
	if (vereenvoudigd === null) return null;
	return { hoofdstuk, vers, vereenvoudigd, bron: knipVers(data.bron, vers), bewerkt: tussenstand.verzen[vers] !== undefined };
}
