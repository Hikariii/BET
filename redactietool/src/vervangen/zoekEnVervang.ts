import type { Tekststuk } from '../formaat/types';
import type { VersAlineadeel, VersInhoud } from '../bewerken/types';
import type { HoofdstukVerzen, Vondst } from './types';

/** Zoveel tekens platte tekst staan er ongeveer voor en na een vondst. */
const CONTEXT = 40;

/** Zoveel tekens meer of minder mag de context hebben om een woord heel te houden; een langer woord wordt afgekapt. */
const CONTEXT_MARGE = 12;

const WOORDTEKEN = /[\p{L}\p{N}]/u;
const WITRUIMTE = /\s/u;
const SLUITLEESTEKEN = /[,.;:!?)”’»]/u;

function isWoordteken(teken: string | undefined): boolean {
	return teken !== undefined && WOORDTEKEN.test(teken);
}

/** Waar een tekststuk begint en eindigt in de platte tekst van een deel. */
export type StukBereik = {
	stuk: Tekststuk;
	van: number;
	tot: number;
};

export function stukBereiken(stukken: readonly Tekststuk[]): StukBereik[] {
	let positie = 0;
	return stukken.map((stuk) => {
		const bereik = { stuk, van: positie, tot: positie + stuk.tekst.length };
		positie = bereik.tot;
		return bereik;
	});
}

export function platteTekst(deel: VersAlineadeel): string {
	return deel.stukken.map((stuk) => stuk.tekst).join('');
}

/** Het stuk waarin `van` tot `tot` helemaal valt, of `null` als de plek over een stukgrens loopt. */
function stukVanPlek(bereiken: readonly StukBereik[], van: number, tot: number): StukBereik | null {
	return bereiken.find((bereik) => bereik.van <= van && tot <= bereik.tot) ?? null;
}

export function ontsnapRegexTekens(tekst: string): string {
	return tekst.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Een letter of cijfer (ook met accent) vlak voor of na de vondst telt als geen woordgrens.
 * Begint of eindigt de zoekterm zelf met een ander teken, dan hoeft er aan die kant geen grens te zijn.
 */
function zoekpatroon(zoekterm: string): RegExp {
	const begin = isWoordteken(zoekterm.at(0)) ? '(?<![\\p{L}\\p{N}])' : '';
	const einde = isWoordteken(zoekterm.at(-1)) ? '(?![\\p{L}\\p{N}])' : '';
	return new RegExp(`${begin}${ontsnapRegexTekens(zoekterm)}${einde}`, 'giu');
}

/**
 * De plek het dichtst bij `doel` (hoogstens `CONTEXT_MARGE` ervandaan, tussen `laagst` en `hoogst`) waar `geldig` waar is.
 * Bij gelijke afstand wint de kant van `liefstMeer` (-1: eerder in de tekst, 1: later).
 * Geen enkele plek geldig, dan `doel` zelf.
 */
function dichtstbijzijndePlek(doel: number, liefstMeer: -1 | 1, laagst: number, hoogst: number, geldig: (plek: number) => boolean): number {
	for (let afstand = 0; afstand <= CONTEXT_MARGE; afstand++) {
		for (const plek of [doel + liefstMeer * afstand, doel - liefstMeer * afstand]) {
			if (plek >= laagst && plek <= hoogst && geldig(plek)) return plek;
		}
	}
	return Math.min(Math.max(doel, laagst), hoogst);
}

/** Midden in een woord is geen plek om de context af te knippen. */
function middenInWoord(tekst: string, plek: number): boolean {
	return isWoordteken(tekst[plek - 1]) && isWoordteken(tekst[plek]);
}

/**
 * De tekst vóór de vondst, op een woordgrens afgekapt (ongeveer `CONTEXT` tekens), met "…" ervoor als er iets is weggelaten.
 * Een afgekapte context begint met een woord of openingsteken, niet met witruimte of een sluitend leesteken.
 */
function contextErvoor(tekst: string, van: number): string {
	const begin = dichtstbijzijndePlek(van - CONTEXT, -1, 0, van, (plek) => plek === 0 || (!middenInWoord(tekst, plek) && !WITRUIMTE.test(tekst[plek] ?? '') && !SLUITLEESTEKEN.test(tekst[plek] ?? '')));
	return (begin > 0 ? '…' : '') + tekst.slice(begin, van);
}

/**
 * De tekst na de vondst, op een woordgrens afgekapt (ongeveer `CONTEXT` tekens), met "…" erachter als er iets is weggelaten.
 * Een afgekapte context eindigt op een woord of leesteken, niet op witruimte.
 */
function contextErna(tekst: string, tot: number): string {
	const einde = dichtstbijzijndePlek(tot + CONTEXT, 1, tot, tekst.length, (plek) => plek === tekst.length || (!middenInWoord(tekst, plek) && !WITRUIMTE.test(tekst[plek - 1] ?? '')));
	return tekst.slice(tot, einde) + (einde < tekst.length ? '…' : '');
}

/** Alle plekken van de zoekterm, hoofdletterongevoelig en op woordgrenzen, in volgorde van hoofdstuk, vers, deel en positie. */
export function zoekVondsten(hoofdstukken: readonly HoofdstukVerzen[], zoekterm: string): Vondst[] {
	if (zoekterm.trim() === '') return [];
	return zoekVondstenMetPatroon(hoofdstukken, zoekpatroon(zoekterm));
}

/** Zoals `zoekVondsten`, voor een eigen patroon (met vlaggen `g`, `i` en `u`) in plaats van een zoekterm; zo delen varianten de context en de vervangbaarheid. */
export function zoekVondstenMetPatroon(hoofdstukken: readonly HoofdstukVerzen[], patroon: RegExp): Vondst[] {
	const vondsten: Vondst[] = [];
	for (const { hoofdstuk, goedgekeurd, verzen } of hoofdstukken) {
		for (const { vers, inhoud } of verzen) {
			inhoud.delen.forEach((deel, nummerDeel) => {
				const tekst = platteTekst(deel);
				const bereiken = stukBereiken(deel.stukken);
				for (const treffer of tekst.matchAll(patroon)) {
					const van = treffer.index;
					const tot = van + treffer[0].length;
					const bereik = stukVanPlek(bereiken, van, tot);
					// Een heel stuk met opmaak: onduidelijk of de markering mee moet, dus met de hand.
					const heelGemarkeerdStuk = bereik !== null && bereik.stuk.opmaak.length > 0 && bereik.van === van && bereik.tot === tot;
					vondsten.push({
						hoofdstuk,
						vers,
						deel: nummerDeel,
						van,
						tot,
						gevonden: treffer[0],
						ervoor: contextErvoor(tekst, van),
						erna: contextErna(tekst, tot),
						vervangbaar: bereik !== null && !heelGemarkeerdStuk,
						goedgekeurd,
					});
				}
			});
		}
	}
	return vondsten;
}

/**
 * Vóór de vondst alleen witruimte en openingstekens, na het begin van het deel of een zinseinde (eventueel met sluitende aanhalingstekens).
 * Een dubbele punt telt als zinseinde, voor directe rede; na een opsomming met een dubbele punt geeft dat soms ten onrechte een hoofdletter.
 */
const ZINSBEGIN = /(?:^|[.?!:…][”’"»)]*)[\s"'“‘„«(]*$/u;

function metHoofdletterAanZinsbegin(tekstErvoor: string, gevonden: string, nieuw: string): string {
	const eerste = gevonden.charAt(0);
	const hoofdletterAanZinsbegin = eerste !== eerste.toLowerCase() && ZINSBEGIN.test(tekstErvoor);
	return hoofdletterAanZinsbegin ? nieuw.charAt(0).toUpperCase() + nieuw.slice(1) : nieuw;
}

/**
 * Vervangt in een vers de vondsten (alleen vervangbare, binnen één opmaak) door `nieuw`, met de opmaak van de vervangen tekst.
 * De aanroeper geeft alleen de vondsten van dit vers mee; een vondst waarvan deel, positie of tekst niet meer klopt
 * (het vers veranderde sinds het zoeken), wordt overgeslagen.
 * Staat de vondst aan het begin van een zin met een hoofdletter, dan krijgt de nieuwe tekst die ook; verder komt hij letterlijk in het vers.
 */
export function vervangInVers(inhoud: VersInhoud, vondsten: readonly Vondst[], nieuw: string): VersInhoud {
	const delen = inhoud.delen.map((deel, nummerDeel): VersAlineadeel => {
		const tekst = platteTekst(deel);
		const bereiken = stukBereiken(deel.stukken);
		const teVervangen = vondsten
			.filter((vondst) => vondst.vervangbaar && vondst.deel === nummerDeel && tekst.slice(vondst.van, vondst.tot) === vondst.gevonden)
			.toSorted((a, b) => b.van - a.van);
		const stukken = deel.stukken.map((stuk) => ({ ...stuk }));
		let vorigeVan = Infinity;
		for (const vondst of teVervangen) {
			if (vondst.tot > vorigeVan) continue;
			const bereik = stukVanPlek(bereiken, vondst.van, vondst.tot);
			const stuk = bereik === null ? undefined : stukken[bereiken.indexOf(bereik)];
			if (bereik === null || stuk === undefined) continue;
			stuk.tekst = stuk.tekst.slice(0, vondst.van - bereik.van) + metHoofdletterAanZinsbegin(tekst.slice(0, vondst.van), vondst.gevonden, nieuw) + stuk.tekst.slice(vondst.tot - bereik.van);
			vorigeVan = vondst.van;
		}
		return { stijl: deel.stijl, stukken };
	});
	return { delen };
}
