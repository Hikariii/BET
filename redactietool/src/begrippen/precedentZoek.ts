import { tokeniseer } from '../uitlijning/woorden';

/** Staat in een lijst woorden op de plek van een einde van een zin: een vorm loopt daar niet overheen. */
const ZINSEINDE = '|';
const ZINSEINDE_TEKENS = new Set(['.', '!', '?', ';', ':']);

/** Een woord uit een zoekvorm: kort of zonder uitgang exact, anders de stam waar een buigingsuitgang achter mag. */
type Zoekwoord = { exact: string; stam: string | null };

export type Zoekvorm = {
	woorden: Zoekwoord[];
	/** Hoeveel andere woorden tussen twee woorden van de vorm mogen staan. */
	maximaalTussen: number;
};

/** De rest die achter de stam van een woord mag staan (zonde, zonden; zondaar, zondaars; melaats, melaatsen). */
const TOEGESTANE_RESTEN = new Set(['', 'e', 'en', 'n', 's', 'se', 'sen', 't', 'te', 'de', 'd']);
/** Zonder "s": "slechts" mag niet "slecht" vinden. */
const UITGANGEN = ['en', 'te', 'de', 'e', 'n', 't', 'd'];
/** Woorden korter dan dit zijn exact te zoeken, anders vallen "dezen" en "deze" samen. */
const MINIMUM_LENGTE_STAM = 4;
const MINIMUM_LENGTE_VOOR_STAM = 5;
const MINIMUM_WOORDEN_MET_TUSSENRUIMTE = 3;

/** De Statenvertaling schrijft "Heere", de vereenvoudiging en de precedenten "Heer". */
function normaliseer(woord: string): string {
	return woord === 'heere' ? 'heer' : woord;
}

function stamVan(woord: string): string | null {
	if (woord.length < MINIMUM_LENGTE_VOOR_STAM) return null;
	const uitgang = UITGANGEN.find((kandidaat) => woord.endsWith(kandidaat));
	if (uitgang === undefined) return woord;
	const stam = woord.slice(0, woord.length - uitgang.length);
	return stam.length >= MINIMUM_LENGTE_STAM ? stam : null;
}

/** De woorden van een tekst zoals de zoekfuncties ze verwachten, met een scheiding op elk einde van een zin. */
export function zoekWoorden(tekst: string): string[] {
	const woorden: string[] = [];
	for (const token of tokeniseer(tekst)) {
		if (token.soort === 'woord') woorden.push(normaliseer(token.vergelijkvorm));
		else if (ZINSEINDE_TEKENS.has(token.tekst)) woorden.push(ZINSEINDE);
	}
	return woorden;
}

/** Een vorm van twee woorden moet aaneengesloten staan: met ruimte ertussen vinden korte woorden als "al de" overal iets. */
export function maakZoekvorm(woorden: readonly string[], maximaalTussen: number): Zoekvorm {
	return {
		woorden: woorden.map((woord) => ({ exact: woord, stam: stamVan(woord) })),
		maximaalTussen: woorden.length >= MINIMUM_WOORDEN_MET_TUSSENRUIMTE ? maximaalTussen : 0,
	};
}

function woordPast(tekstwoord: string, zoekwoord: Zoekwoord): boolean {
	if (tekstwoord === zoekwoord.exact) return true;
	if (zoekwoord.stam === null || !tekstwoord.startsWith(zoekwoord.stam)) return false;
	return TOEGESTANE_RESTEN.has(tekstwoord.slice(zoekwoord.stam.length));
}

function volgtVanaf(tekst: readonly string[], vorige: number, vorm: Zoekvorm, index: number): boolean {
	const zoekwoord = vorm.woorden[index];
	if (zoekwoord === undefined) return true;
	const laatste = Math.min(tekst.length - 1, vorige + 1 + vorm.maximaalTussen);
	for (let plek = vorige + 1; plek <= laatste; plek++) {
		const tekstwoord = tekst[plek] ?? ZINSEINDE;
		if (tekstwoord === ZINSEINDE) return false;
		if (woordPast(tekstwoord, zoekwoord) && volgtVanaf(tekst, plek, vorm, index + 1)) return true;
	}
	return false;
}

/** Staat de vorm in de tekst (woorden uit `zoekWoorden`)? Zonder hoofdletters, op woordgrenzen, met buigingsuitgangen. */
export function komtVoor(tekst: readonly string[], vorm: Zoekvorm): boolean {
	const eerste = vorm.woorden[0];
	if (eerste === undefined) return false;
	for (let plek = 0; plek < tekst.length; plek++) {
		const tekstwoord = tekst[plek] ?? ZINSEINDE;
		if (woordPast(tekstwoord, eerste) && volgtVanaf(tekst, plek, vorm, 1)) return true;
	}
	return false;
}

export function komtEenVanVoor(tekst: readonly string[], vormen: readonly Zoekvorm[]): boolean {
	return vormen.some((vorm) => komtVoor(tekst, vorm));
}
