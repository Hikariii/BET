import type { HoofdstukInfo, Status } from '../../data/types';

/** De volledige naam van een hoofdstuk voor schermlezers, bv. "Hoofdstuk 4, goedgekeurd, 3 open vragen". */
export function kortHoofdstukLabel(hoofdstuk: HoofdstukInfo, aantalOpenVragen: number): string {
	const delen = [`Hoofdstuk ${hoofdstuk.nummer}`, hoofdstuk.status];
	if (aantalOpenVragen > 0) delen.push(`${aantalOpenVragen} open ${aantalOpenVragen === 1 ? 'vraag' : 'vragen'}`);
	return delen.join(', ');
}

/**
 * Het statuswoord dat in de strip naast het nummer staat: altijd bij het open hoofdstuk, verder alleen bij een status die afwijkt van wat de meeste hoofdstukken hebben.
 * Goedgekeurd heeft al een vinkje; de gewone status zou 24 keer hetzelfde woord zijn.
 */
export function stripStatusWoord(status: Status, gewoneStatus: Status | null, huidig: boolean): string | null {
	if (huidig) return status;
	return status === 'goedgekeurd' || status === gewoneStatus ? null : status;
}
