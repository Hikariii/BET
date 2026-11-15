import { pasTussenstandToe } from '../../bewerken/tussenstand';
import { knipVers } from '../../bewerken/versknip';
import type { Tussenstand } from '../../bewerken/types';
import type { BoekData, HoofdstukData } from '../../data/types';
import type { HoofdstukVerzen, Vondst } from '../../vervangen/types';

function versnummers(hoofdstuk: HoofdstukData['vereenvoudigd']): number[] {
	const nummers = new Set<number>();
	for (const alinea of hoofdstuk.alineas) {
		if (alinea.soort !== 'tekst') continue;
		for (const stuk of alinea.stukken) {
			if (stuk.soort === 'vers') nummers.add(stuk.nummer);
		}
	}
	return [...nummers].sort((een, ander) => een - ander);
}

/** De vereenvoudiging van elk hoofdstuk met de tussenstand erin, per vers geknipt, met de status uit STATUS.md. */
export function bouwHoofdstukVerzen(
	hoofdstukken: readonly HoofdstukData[],
	boek: BoekData,
	leesTussenstandVan: (hoofdstuk: number) => Tussenstand,
): HoofdstukVerzen[] {
	return hoofdstukken.map(({ nummer, vereenvoudigd }) => {
		const metTussenstand = pasTussenstandToe(vereenvoudigd, leesTussenstandVan(nummer));
		const verzen = versnummers(metTussenstand).flatMap((vers) => {
			const inhoud = knipVers(metTussenstand, vers);
			const repo = knipVers(vereenvoudigd, vers);
			return inhoud === null || repo === null ? [] : [{ vers, inhoud, repo }];
		});
		const status = boek.hoofdstukken.find((info) => info.nummer === nummer)?.status;
		return { hoofdstuk: nummer, goedgekeurd: status === 'goedgekeurd', verzen };
	});
}

/** Eén vondst herkenbaar over een nieuwe zoekronde heen. */
export function vondstSleutel(vondst: Vondst): string {
	return `${vondst.hoofdstuk}:${vondst.vers}:${vondst.deel}:${vondst.van}`;
}

type HoofdstukVondsten = { hoofdstuk: number; vondsten: Vondst[] };

export type VondstGroepen = {
	/** Vervangbare vondsten in hoofdstukken die nog niet goedgekeurd zijn, per hoofdstuk. */
	open: HoofdstukVondsten[];
	/** Vervangbare vondsten in goedgekeurde hoofdstukken, per hoofdstuk. */
	goedgekeurd: HoofdstukVondsten[];
	/** Vondsten over een opmaakgrens heen, in elk hoofdstuk. */
	metDeHand: Vondst[];
};

function perHoofdstuk(vondsten: readonly Vondst[]): HoofdstukVondsten[] {
	const groepen: HoofdstukVondsten[] = [];
	for (const vondst of vondsten) {
		const laatste = groepen.at(-1);
		if (laatste?.hoofdstuk === vondst.hoofdstuk) laatste.vondsten.push(vondst);
		else groepen.push({ hoofdstuk: vondst.hoofdstuk, vondsten: [vondst] });
	}
	return groepen;
}

/** Deelt de vondsten (in volgorde van hoofdstuk, vers en positie) in over de groepen van het voorbeeldvenster. */
export function groepeerVondsten(vondsten: readonly Vondst[]): VondstGroepen {
	return {
		open: perHoofdstuk(vondsten.filter((vondst) => vondst.vervangbaar && !vondst.goedgekeurd)),
		goedgekeurd: perHoofdstuk(vondsten.filter((vondst) => vondst.vervangbaar && vondst.goedgekeurd)),
		metDeHand: vondsten.filter((vondst) => !vondst.vervangbaar),
	};
}

/** De sleutels van de vondsten die in het voorbeeldvenster standaard aanstaan. */
export function standaardAangevinkt(vondsten: readonly Vondst[]): Set<string> {
	return new Set(vondsten.filter((vondst) => vondst.vervangbaar && !vondst.goedgekeurd).map(vondstSleutel));
}

export function plekken(aantal: number): string {
	return aantal === 1 ? '1 plek' : `${aantal} plekken`;
}
