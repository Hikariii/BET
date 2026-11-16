import type { VersAlineadeel, VersInhoud } from '../bewerken/types';
import type { VersRef } from '../data/types';
import { DOMEINEN } from '../formaat/types';
import type { Domein, Tekststuk } from '../formaat/types';
import type { HoofdstukVerzen, Vondst } from './types';
import { variantPatroon, variantSleutel } from './varianten';
import { platteTekst, stukBereiken, vervangInVers, zoekVondsten, zoekVondstenMetPatroon } from './zoekEnVervang';

/** Waar gezocht wordt: het hele boek, of alleen de verzen van een vertaalvraag. */
export type Bereik = { soort: 'boek' } | { soort: 'verzen'; verzen: readonly VersRef[] };

/**
 * Wat Zoeken en vervangen doet: de tekst vervangen, of alleen de markering op dezelfde woorden wisselen (domein `van` wordt `naar`).
 * Bij een markeringswissel blijft de tekst gelijk en ook de overige opmaak (onderwijs, highlight, vet, onderstreept).
 */
export type Zoekopdracht =
	| { soort: 'tekst'; zoekterm: string; nieuw: string; bereik: Bereik }
	| { soort: 'markering'; zoekterm: string; van: Domein; naar: Domein; bereik: Bereik };

/**
 * Een plek voor een zoekopdracht. `variant` is de gevonden vorm (kleine letters) als die afwijkt van de zoekterm
 * (ander of geen lidwoord, meervoud, vervoeging); `null` voor de zoekterm zelf. `vervangbaar` geldt voor deze opdracht.
 */
export type Plek = Vondst & { variant: string | null };

function inBereik(hoofdstukken: readonly HoofdstukVerzen[], bereik: Bereik): HoofdstukVerzen[] {
	if (bereik.soort === 'boek') return [...hoofdstukken];
	return hoofdstukken.map((hoofdstuk) => ({
		...hoofdstuk,
		verzen: hoofdstuk.verzen.filter((vers) => bereik.verzen.some((ref) => ref.hoofdstuk === hoofdstuk.hoofdstuk && ref.vers === vers.vers)),
	}));
}

function raaktPlek(stuk: { van: number; tot: number }, van: number, tot: number): boolean {
	return stuk.van < tot && stuk.tot > van;
}

function domeinVanStuk(stuk: Tekststuk): Domein | null {
	return DOMEINEN.find((domein) => stuk.opmaak.includes(domein)) ?? null;
}

/** Het domein van elk stuk dat de plek raakt, in volgorde; `null` voor een stuk zonder domein. */
function domeinenOpPlek(hoofdstukken: readonly HoofdstukVerzen[], vondst: Vondst): (Domein | null)[] {
	const deel = hoofdstukken.find((hoofdstuk) => hoofdstuk.hoofdstuk === vondst.hoofdstuk)?.verzen.find((vers) => vers.vers === vondst.vers)?.inhoud.delen[vondst.deel];
	if (deel === undefined) return [];
	return stukBereiken(deel.stukken)
		.filter((stuk) => raaktPlek(stuk, vondst.van, vondst.tot))
		.map((stuk) => domeinVanStuk(stuk.stuk));
}

function overlapt(a: Vondst, b: Vondst): boolean {
	return a.hoofdstuk === b.hoofdstuk && a.vers === b.vers && a.deel === b.deel && a.van < b.tot && b.van < a.tot;
}

function volgorde(a: Vondst, b: Vondst): number {
	return a.hoofdstuk - b.hoofdstuk || a.vers - b.vers || a.deel - b.deel || a.van - b.van;
}

/** Bij een markering alleen de plekken waar het van-domein ligt; vervangbaar als dat domein de hele plek dekt. */
function opMarkering(hoofdstukken: readonly HoofdstukVerzen[], plekken: readonly Plek[], van: Domein): Plek[] {
	return plekken.flatMap((plek) => {
		const domeinen = domeinenOpPlek(hoofdstukken, plek);
		if (!domeinen.includes(van)) return [];
		return [{ ...plek, vervangbaar: domeinen.every((domein) => domein === van) }];
	});
}

/** Alle plekken voor de opdracht binnen het bereik, met de varianten erbij, op volgorde van hoofdstuk, vers en positie. */
export function zoekPlekken(hoofdstukken: readonly HoofdstukVerzen[], opdracht: Zoekopdracht): Plek[] {
	const binnenBereik = inBereik(hoofdstukken, opdracht.bereik);
	const hoofdvormen = zoekVondsten(binnenBereik, opdracht.zoekterm);
	const patroon = variantPatroon(opdracht.zoekterm);
	const varianten = (patroon === null ? [] : zoekVondstenMetPatroon(binnenBereik, patroon)).filter((vondst) => !hoofdvormen.some((hoofdvorm) => overlapt(vondst, hoofdvorm)));
	const plekken = [
		...hoofdvormen.map((vondst): Plek => ({ ...vondst, variant: null })),
		...varianten.map((vondst): Plek => ({ ...vondst, variant: variantSleutel(vondst.gevonden) })),
	].toSorted(volgorde);
	return opdracht.soort === 'markering' ? opMarkering(binnenBereik, plekken, opdracht.van) : plekken;
}

/** Zet in de stukken van een deel het domein `van` op [van, tot) om in `naar`; `null` als een stuk op die plek een ander domein heeft of de plek er niet is. */
function wisselDomein(stukken: readonly Tekststuk[], plek: Plek, van: Domein, naar: Domein): Tekststuk[] | null {
	const bereiken = stukBereiken(stukken);
	const geraakt = bereiken.filter((bereik) => raaktPlek(bereik, plek.van, plek.tot));
	if (geraakt.length === 0 || geraakt.some((bereik) => domeinVanStuk(bereik.stuk) !== van)) return null;
	return bereiken.flatMap(({ stuk, van: stukVan, tot: stukTot }) => {
		if (!raaktPlek({ van: stukVan, tot: stukTot }, plek.van, plek.tot)) return [stuk];
		const knipVan = Math.max(plek.van, stukVan) - stukVan;
		const knipTot = Math.min(plek.tot, stukTot) - stukVan;
		const opmaakNaar = stuk.opmaak.map((opmaak) => (opmaak === van ? naar : opmaak));
		return [
			{ soort: 'tekst', tekst: stuk.tekst.slice(0, knipVan), opmaak: stuk.opmaak },
			{ soort: 'tekst', tekst: stuk.tekst.slice(knipVan, knipTot), opmaak: opmaakNaar },
			{ soort: 'tekst', tekst: stuk.tekst.slice(knipTot), opmaak: stuk.opmaak },
		].filter((deelstuk): deelstuk is Tekststuk => deelstuk.tekst !== '');
	});
}

/** Wisselt de markering op de vervangbare plekken van één vers. Een plek die niet meer klopt (andere tekst of ander domein) blijft ongemoeid. */
function wijzigMarkering(inhoud: VersInhoud, plekken: readonly Plek[], van: Domein, naar: Domein): VersInhoud {
	const delen = inhoud.delen.map((deel, nummerDeel): VersAlineadeel => {
		const tekst = platteTekst(deel);
		let stukken = deel.stukken;
		for (const plek of plekken.filter((kandidaat) => kandidaat.deel === nummerDeel && tekst.slice(kandidaat.van, kandidaat.tot) === kandidaat.gevonden)) {
			stukken = wisselDomein(stukken, plek, van, naar) ?? stukken;
		}
		return { stijl: deel.stijl, stukken: [...stukken] };
	});
	return { delen };
}

/** Vervangt de plekken van één vers één voor één, van achter naar voren, zodat een eerdere plek niet verschuift. */
function wijzigTekst(inhoud: VersInhoud, plekken: readonly Plek[], nieuw: string, variantVervangingen: ReadonlyMap<string, string>): VersInhoud {
	let uitkomst = inhoud;
	for (const plek of plekken.toSorted((a, b) => b.deel - a.deel || b.van - a.van)) {
		const vervanging = plek.variant === null ? nieuw : (variantVervangingen.get(plek.variant) ?? '');
		if (plek.variant !== null && vervanging === '') continue;
		uitkomst = vervangInVers(uitkomst, [plek], vervanging);
	}
	return uitkomst;
}

/**
 * Past de opdracht toe op de aangevinkte plekken van één vers; de aanroeper geeft alleen de plekken van dit vers mee, en alleen de vervangbare doen mee.
 * Bij tekst: hoofdvorm wordt `nieuw`, een variant wordt de vervanging uit `variantVervangingen` (ontbreekt of leeg: niet toepassen).
 * Bij markering: domein `van` wordt `naar` op de plek, ook voor varianten; tekst en overige opmaak blijven.
 */
export function wijzigVers(inhoud: VersInhoud, plekken: readonly Plek[], opdracht: Zoekopdracht, variantVervangingen: ReadonlyMap<string, string>): VersInhoud {
	const vervangbaar = plekken.filter((plek) => plek.vervangbaar);
	return opdracht.soort === 'tekst'
		? wijzigTekst(inhoud, vervangbaar, opdracht.nieuw, variantVervangingen)
		: wijzigMarkering(inhoud, vervangbaar, opdracht.van, opdracht.naar);
}

/** De domeinen die binnen het bereik op de zoekterm liggen, zonder dubbele, in de volgorde van `DOMEINEN`; om het van-domein alleen vooraf in te vullen als het er één is. */
export function domeinenOpZoekterm(hoofdstukken: readonly HoofdstukVerzen[], zoekterm: string, bereik: Bereik): Domein[] {
	const binnenBereik = inBereik(hoofdstukken, bereik);
	const gevonden = new Set(zoekVondsten(binnenBereik, zoekterm).flatMap((vondst) => domeinenOpPlek(binnenBereik, vondst)));
	return DOMEINEN.filter((domein) => gevonden.has(domein));
}
