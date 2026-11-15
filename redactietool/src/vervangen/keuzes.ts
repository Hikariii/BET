import type { Opslag } from '../bewerken/tussenstand';
import type { VersInhoud } from '../bewerken/types';
import type { HoofdstukVerzen, Vondst } from './types';

/** Een toegepaste structurele keuze, bewaard om hem in één keer terug te draaien. */
export type StructureleKeuze = {
	id: string;
	zoekterm: string;
	nieuw: string;
	toegepast: string;
	/** Per vers de inhoud voor en na de vervanging. */
	verzen: { hoofdstuk: number; vers: number; voor: VersInhoud; na: VersInhoud }[];
};

export type ToepasUitkomst = { keuze: StructureleKeuze; meldingen: string[] };

/**
 * Past de aangevinkte vondsten toe: per vers `vervangInVers`, bewaard in de tussenstand met herkomst "structurele keuze"
 * en het keuze-id, en de keuze zelf bewaard voor terugdraaien. Verzen met een verouderde bewerking worden overgeslagen
 * (met melding); een volle opslag stopt met een melding. Wordt ingevuld.
 */
export function pasKeuzeToe(
	_opslag: Opslag,
	_boek: string,
	_hoofdstukken: readonly HoofdstukVerzen[],
	_zoekterm: string,
	_nieuw: string,
	_aangevinkt: readonly Vondst[],
	_nu: Date,
): ToepasUitkomst {
	throw new Error('nog niet gebouwd');
}

/** De bewaarde structurele keuzes van een boek, nieuwste eerst. Wordt ingevuld. */
export function leesKeuzes(_opslag: Opslag, _boek: string): StructureleKeuze[] {
	return [];
}

/**
 * Draait een keuze terug: alleen verzen waarvan de huidige inhoud nog gelijk is aan "na" (anders overgeslagen met melding,
 * want dan heeft de vertaler het vers daarna zelf bewerkt). Wordt ingevuld.
 */
export function draaiKeuzeTerug(_opslag: Opslag, _boek: string, _keuzeId: string): string[] {
	return [];
}
