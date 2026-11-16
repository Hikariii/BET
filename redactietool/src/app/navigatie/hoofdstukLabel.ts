import type { HoofdstukInfo } from '../../data/types';

/** De volledige naam van een hoofdstuk voor schermlezers, bv. "Hoofdstuk 4, goedgekeurd, 3 open vragen". */
export function kortHoofdstukLabel(hoofdstuk: HoofdstukInfo, aantalOpenVragen: number): string {
	const delen = [`Hoofdstuk ${hoofdstuk.nummer}`, hoofdstuk.status];
	if (aantalOpenVragen > 0) delen.push(`${aantalOpenVragen} open ${aantalOpenVragen === 1 ? 'vraag' : 'vragen'}`);
	return delen.join(', ');
}
