import { pasTussenstandToe } from '../../bewerken/tussenstand';
import { knipVers } from '../../bewerken/versknip';
import type { Tussenstand } from '../../bewerken/types';
import type { BoekData, HoofdstukData, VersRef } from '../../data/types';
import type { OvergeslagenPlek, StructureleKeuze } from '../../vervangen/keuzes';
import type { HoofdstukVerzen, Vondst } from '../../vervangen/types';
import type { Bereik, Plek } from '../../vervangen/zoekopdracht';

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

/** Eén plek herkenbaar over een nieuwe zoekronde heen. */
export function vondstSleutel(vondst: Vondst): string {
	return `${vondst.hoofdstuk}:${vondst.vers}:${vondst.deel}:${vondst.van}`;
}

type HoofdstukPlekken = { hoofdstuk: number; plekken: Plek[] };

type VariantGroep = { vorm: string; plekken: Plek[] };

export type PlekGroepen = {
	/** Vervangbare plekken van de zoekterm zelf in hoofdstukken die nog niet goedgekeurd zijn, per hoofdstuk. */
	open: HoofdstukPlekken[];
	/** Vervangbare plekken van de zoekterm zelf in goedgekeurde hoofdstukken, per hoofdstuk. */
	goedgekeurd: HoofdstukPlekken[];
	/** Plekken over een opmaakgrens heen (of deels onder een andere markering), in elk hoofdstuk, ook de varianten. */
	metDeHand: Plek[];
	/** Vervangbare plekken van gevonden vormen die van de zoekterm afwijken, per vorm op alfabet, in elk hoofdstuk. */
	varianten: VariantGroep[];
};

function perHoofdstuk(plekken: readonly Plek[]): HoofdstukPlekken[] {
	const groepen: HoofdstukPlekken[] = [];
	for (const plek of plekken) {
		const laatste = groepen.at(-1);
		if (laatste?.hoofdstuk === plek.hoofdstuk) laatste.plekken.push(plek);
		else groepen.push({ hoofdstuk: plek.hoofdstuk, plekken: [plek] });
	}
	return groepen;
}

function perVorm(plekken: readonly Plek[]): VariantGroep[] {
	const groepen = new Map<string, Plek[]>();
	for (const plek of plekken) {
		if (plek.variant === null) continue;
		groepen.set(plek.variant, [...(groepen.get(plek.variant) ?? []), plek]);
	}
	return [...groepen].sort(([een], [ander]) => een.localeCompare(ander, 'nl')).map(([vorm, vormPlekken]) => ({ vorm, plekken: vormPlekken }));
}

/** Deelt de plekken (in volgorde van hoofdstuk, vers en positie) in over de groepen van het voorbeeldvenster. */
export function groepeerPlekken(plekken: readonly Plek[]): PlekGroepen {
	const vervangbaar = plekken.filter((plek) => plek.vervangbaar);
	const hoofdvorm = vervangbaar.filter((plek) => plek.variant === null);
	return {
		open: perHoofdstuk(hoofdvorm.filter((plek) => !plek.goedgekeurd)),
		goedgekeurd: perHoofdstuk(hoofdvorm.filter((plek) => plek.goedgekeurd)),
		metDeHand: plekken.filter((plek) => !plek.vervangbaar),
		varianten: perVorm(vervangbaar),
	};
}

/** De sleutels van de plekken die in het voorbeeldvenster standaard aanstaan: de zoekterm zelf, vervangbaar, in niet-goedgekeurde hoofdstukken. */
export function standaardAangevinkt(plekken: readonly Plek[]): Set<string> {
	return new Set(plekken.filter((plek) => plek.vervangbaar && !plek.goedgekeurd && plek.variant === null).map(vondstSleutel));
}

type Toe = {
	/** De plekken die de opdracht echt wijzigt. */
	toe: Plek[];
	overgeslagen: OvergeslagenPlek[];
};

/**
 * De reden waarom een plek niet wordt toegepast. Met de hand (opmaakgrens) en goedgekeurd gaan voor: dat zijn besluiten, ook bij een variant.
 * Een variant die verder niet wordt toegepast is niet bewust afgewezen: de vertaler heeft de vorm niet gekozen, dus geen besluit.
 */
function redenOvergeslagen(plek: Plek): OvergeslagenPlek['reden'] {
	if (!plek.vervangbaar) return 'met de hand';
	if (plek.goedgekeurd) return 'goedgekeurd';
	return plek.variant !== null ? 'variant niet toegepast' : 'uitgevinkt';
}

/**
 * Verdeelt de gevonden plekken in wat toegepast wordt en wat overgeslagen wordt, met de reden.
 * Elke variantplek die niet wordt toegepast heeft de reden `variant niet toegepast`; de plekken van de zoekterm zelf houden hun eigen reden.
 * Een aangevinkte variant telt bij een tekstvervanging alleen mee als haar vorm een vervanging heeft;
 * een markeringswissel geldt ook voor varianten, zonder eigen invoer.
 */
export function verdeelPlekken(
	plekken: readonly Plek[],
	aangevinkt: ReadonlySet<string>,
	soort: 'tekst' | 'markering',
	variantVervangingen: ReadonlyMap<string, string>,
): Toe {
	const uitkomst: Toe = { toe: [], overgeslagen: [] };
	for (const plek of plekken) {
		const heeftVervanging = soort === 'markering' || plek.variant === null || (variantVervangingen.get(plek.variant) ?? '') !== '';
		if (plek.vervangbaar && aangevinkt.has(vondstSleutel(plek)) && heeftVervanging) {
			uitkomst.toe.push(plek);
		} else {
			uitkomst.overgeslagen.push({ hoofdstuk: plek.hoofdstuk, vers: plek.vers, gevonden: plek.gevonden, reden: redenOvergeslagen(plek) });
		}
	}
	return uitkomst;
}

type BereikUitkomst = { bereik: Bereik; melding: null } | { bereik: null; melding: string };

/**
 * Het bereik van een zoekopdracht: de verzen van de vraag, of het hele boek (zonder vraag, of als de vertaler dat kiest).
 * Een vraag zonder verzen geeft een melding in plaats van stil het hele boek te doorzoeken.
 */
export function kiesBereik(vraagVerzen: readonly VersRef[] | null, heleBoek: boolean): BereikUitkomst {
	if (vraagVerzen === null || heleBoek) return { bereik: { soort: 'boek' }, melding: null };
	if (vraagVerzen.length === 0) {
		return { bereik: null, melding: 'Deze vraag heeft geen verzen in open-vragen.md. Zet "Hele boek" aan om toch in het hele boek te zoeken.' };
	}
	return { bereik: { soort: 'verzen', verzen: [...vraagVerzen] }, melding: null };
}

export function plekken(aantal: number): string {
	return aantal === 1 ? '1 plek' : `${aantal} plekken`;
}

/** De tekst op ten hoogste `maximum` tekens, op een woordgrens afgekapt met "…"; de kwestie van een vraag is soms een hele alinea. */
export function kortUit(tekst: string, maximum: number): string {
	if (tekst.length <= maximum) return tekst;
	const afgekapt = tekst.slice(0, maximum);
	const laatsteSpatie = afgekapt.lastIndexOf(' ');
	return `${(laatsteSpatie > 0 ? afgekapt.slice(0, laatsteSpatie) : afgekapt).trimEnd()}…`;
}

/** Wat een toegepaste keuze doet, in woorden: `"de Mensenzoon" door "Mensenzoon"` of `markering van "gezegend": eeuwigleven wordt genade`. */
export function keuzeBeschrijving(keuze: Pick<StructureleKeuze, 'soort' | 'zoekterm' | 'nieuw' | 'van' | 'naar'>): string {
	if (keuze.soort === 'markering') return `markering van "${keuze.zoekterm}": ${keuze.van ?? '?'} wordt ${keuze.naar ?? '?'}`;
	return `"${keuze.zoekterm}" door "${keuze.nieuw}"`;
}
