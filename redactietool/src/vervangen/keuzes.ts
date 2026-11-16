import { alsInhoud, bewaarKeuzeVers, bewaarVers, leesTussenstand, wisVers, zelfdeInhoud } from '../bewerken/tussenstand';
import type { Opslag } from '../bewerken/tussenstand';
import type { VersInhoud } from '../bewerken/types';
import { haalKeuzeUitAntwoorden, voegKeuzeToe } from '../antwoorden/antwoorden';
import { vervangInVers } from './zoekEnVervang';
import { DOMEINEN, type Domein } from '../formaat/types';
import type { HoofdstukVerzen, Vondst } from './types';
import { wijzigVers, type Plek, type Zoekopdracht } from './zoekopdracht';

/** Een toegepaste structurele keuze, bewaard om hem in één keer terug te draaien. */
export type StructureleKeuze = {
	id: string;
	/** `tekst`: zoekterm wordt `nieuw`. `markering`: op de zoekterm wordt domein `van` vervangen door `naar` (de tekst blijft). */
	soort: 'tekst' | 'markering';
	zoekterm: string;
	/** De vervangende tekst; leeg bij een markeringswissel. */
	nieuw: string;
	van: Domein | null;
	naar: Domein | null;
	/** Per gevonden variant (kleine letters) de vervanging die is toegepast; bij een markeringswissel leeg, de wissel geldt dan ook voor varianten. */
	varianten: KeuzeVariant[];
	/** ISO-tijd van toepassen. */
	toegepast: string;
	/** Per vers de inhoud voor en na de vervanging. */
	verzen: KeuzeVers[];
	/** Plekken die bij toepassen bewust niet zijn meegenomen, met de reden; Claude behandelt die bij het terugvoeren als bewust anders. */
	overgeslagen: OvergeslagenPlek[];
	/** De kwestie van de vertaalvraag die met deze keuze beantwoord is; `null` als de keuze niet vanuit een vraag kwam. */
	vraag: string | null;
};

export type KeuzeVariant = { vorm: string; nieuw: string };

/**
 * Waarom een plek niet is meegenomen.
 * `variant niet toegepast` is geen besluit: de vertaler heeft de vorm niet gekozen, ook niet bewust afgewezen.
 * `teruggedraaid`: het vers is na het toepassen weer teruggedraaid, `gevonden` is dan de zoekterm.
 */
export type OvergeslagenPlek = { hoofdstuk: number; vers: number; gevonden: string; reden: 'goedgekeurd' | 'met de hand' | 'uitgevinkt' | 'variant niet toegepast' | 'teruggedraaid' };

type KeuzeVers = { hoofdstuk: number; vers: number; voor: VersInhoud; na: VersInhoud };

export type ToepasUitkomst = { keuze: StructureleKeuze; meldingen: string[] };

/** De sleutel waaronder de keuzes van een boek in de opslag staan. */
export function keuzesSleutel(boek: string): string {
	return `bet-keuzes/${boek}`;
}

function isObject(waarde: unknown): waarde is Record<string, unknown> {
	return typeof waarde === 'object' && waarde !== null && !Array.isArray(waarde);
}

function alsKeuzeVers(waarde: unknown): KeuzeVers | null {
	if (!isObject(waarde)) return null;
	const { hoofdstuk, vers } = waarde;
	if (typeof hoofdstuk !== 'number' || typeof vers !== 'number') return null;
	const voor = alsInhoud(waarde['voor']);
	const na = alsInhoud(waarde['na']);
	if (voor === null || na === null) return null;
	return { hoofdstuk, vers, voor, na };
}

function alsDomein(waarde: unknown): Domein | null {
	return DOMEINEN.find((domein) => domein === waarde) ?? null;
}

function alsVarianten(waarde: unknown): KeuzeVariant[] | null {
	if (!Array.isArray(waarde)) return null;
	const varianten: KeuzeVariant[] = [];
	for (const variant of waarde) {
		if (!isObject(variant) || typeof variant['vorm'] !== 'string' || typeof variant['nieuw'] !== 'string') return null;
		varianten.push({ vorm: variant['vorm'], nieuw: variant['nieuw'] });
	}
	return varianten;
}

const REDENEN: readonly OvergeslagenPlek['reden'][] = ['goedgekeurd', 'met de hand', 'uitgevinkt', 'variant niet toegepast', 'teruggedraaid'];

function alsOvergeslagen(waarde: unknown): OvergeslagenPlek[] | null {
	if (!Array.isArray(waarde)) return null;
	const plekken: OvergeslagenPlek[] = [];
	for (const plek of waarde) {
		if (!isObject(plek)) return null;
		const { hoofdstuk, vers, gevonden } = plek;
		const reden = REDENEN.find((kandidaat) => kandidaat === plek['reden']);
		if (typeof hoofdstuk !== 'number' || typeof vers !== 'number' || typeof gevonden !== 'string' || reden === undefined) return null;
		plekken.push({ hoofdstuk, vers, gevonden, reden });
	}
	return plekken;
}

/** Leest één keuze uit opgeslagen JSON; `null` bij een onbruikbare vorm. Velden die oude keuzes (van vóór fase 8) niet hebben, krijgen hun standaard. */
export function alsKeuze(waarde: unknown): StructureleKeuze | null {
	if (!isObject(waarde) || !Array.isArray(waarde['verzen'])) return null;
	const { id, zoekterm, nieuw, toegepast } = waarde;
	if (typeof id !== 'string' || typeof zoekterm !== 'string' || typeof nieuw !== 'string' || typeof toegepast !== 'string') return null;
	const verzen: KeuzeVers[] = [];
	for (const vers of waarde['verzen']) {
		const keuzeVers = alsKeuzeVers(vers);
		if (keuzeVers === null) return null;
		verzen.push(keuzeVers);
	}
	const soort = waarde['soort'] ?? 'tekst';
	if (soort !== 'tekst' && soort !== 'markering') return null;
	const van = waarde['van'] ?? null;
	const naar = waarde['naar'] ?? null;
	const vraag = waarde['vraag'] ?? null;
	if ((van !== null && alsDomein(van) === null) || (naar !== null && alsDomein(naar) === null)) return null;
	if (vraag !== null && typeof vraag !== 'string') return null;
	const varianten = alsVarianten(waarde['varianten'] ?? []);
	const overgeslagen = alsOvergeslagen(waarde['overgeslagen'] ?? []);
	if (varianten === null || overgeslagen === null) return null;
	return { id, soort, zoekterm, nieuw, van: alsDomein(van), naar: alsDomein(naar), varianten, toegepast, verzen, overgeslagen, vraag };
}

/** Alle bewaarde keuzes op volgorde van toepassen (oudste eerst); onleesbare opslag geeft een lege lijst. */
function leesOpVolgorde(opslag: Opslag, boek: string): StructureleKeuze[] {
	try {
		const tekst = opslag.getItem(keuzesSleutel(boek));
		if (tekst === null) return [];
		const json: unknown = JSON.parse(tekst);
		if (!Array.isArray(json)) return [];
		return json.flatMap((waarde) => alsKeuze(waarde) ?? []);
	} catch {
		return [];
	}
}

/** Schrijft de lijst terug; zonder keuzes verdwijnt de sleutel. Geeft `false` als de opslag het weigert. */
export function schrijfKeuzes(opslag: Opslag, boek: string, keuzes: readonly StructureleKeuze[]): boolean {
	try {
		if (keuzes.length === 0) opslag.removeItem(keuzesSleutel(boek));
		else opslag.setItem(keuzesSleutel(boek), JSON.stringify(keuzes));
		return true;
	} catch {
		return false;
	}
}

function versNaam(hoofdstuk: number, vers: number): string {
	return `${hoofdstuk}:${vers}`;
}

/** De vervangbare vondsten per hoofdstuk en vers, op oplopend hoofdstuk en vers. */
function groepeerPerVers<T extends Vondst>(vondsten: readonly T[]): { hoofdstuk: number; vers: number; vondsten: T[] }[] {
	const groepen = new Map<string, { hoofdstuk: number; vers: number; vondsten: T[] }>();
	for (const vondst of vondsten) {
		if (!vondst.vervangbaar) continue;
		const naam = versNaam(vondst.hoofdstuk, vondst.vers);
		const groep = groepen.get(naam) ?? { hoofdstuk: vondst.hoofdstuk, vers: vondst.vers, vondsten: [] };
		groep.vondsten.push(vondst);
		groepen.set(naam, groep);
	}
	return [...groepen.values()].sort((a, b) => a.hoofdstuk - b.hoofdstuk || a.vers - b.vers);
}

function nieuwId(nu: Date, bestaand: readonly StructureleKeuze[]): string {
	const basis = String(nu.getTime());
	let id = basis;
	for (let teller = 2; bestaand.some((keuze) => keuze.id === id); teller++) id = `${basis}-${teller}`;
	return id;
}

function legeKeuze(id: string, nu: Date): StructureleKeuze {
	return {
		id,
		soort: 'tekst',
		zoekterm: '',
		nieuw: '',
		van: null,
		naar: null,
		varianten: [],
		toegepast: nu.toISOString(),
		verzen: [],
		overgeslagen: [],
		vraag: null,
	};
}

/**
 * Zet per vers de gewijzigde inhoud in de tussenstand (herkomst "structurele keuze", met het keuze-id) en de verzen in `keuze`.
 * Bewaart daarna `keuze` achter de `bewaard`e keuzes als er verzen veranderd zijn.
 * Een vers waarvan de bewaarde bewerking niet meer past of bij een oudere repo-tekst hoort, wordt overgeslagen met een melding. Een mislukte opslag
 * geeft een melding per vers; alleen de verzen die lukten staan in de keuze.
 */
function pasVerzenToe<T extends Vondst>(
	opslag: Opslag,
	boek: string,
	hoofdstukken: readonly HoofdstukVerzen[],
	keuze: StructureleKeuze,
	bewaard: readonly StructureleKeuze[],
	aangevinkt: readonly T[],
	wijzig: (inhoud: VersInhoud, plekken: T[]) => VersInhoud,
): { meldingen: string[]; keuzeBewaard: boolean } {
	const meldingen: string[] = [];
	for (const groep of groepeerPerVers(aangevinkt)) {
		const gevonden = hoofdstukken.find((h) => h.hoofdstuk === groep.hoofdstuk)?.verzen.find((v) => v.vers === groep.vers);
		if (gevonden === undefined) {
			meldingen.push(`Vers ${versNaam(groep.hoofdstuk, groep.vers)} staat niet in het hoofdstuk en is overgeslagen.`);
			continue;
		}
		const huidig = gevonden.inhoud;
		const na = wijzig(huidig, groep.vondsten);
		if (zelfdeInhoud(na, huidig)) continue;
		const uitkomst = bewaarKeuzeVers(opslag, boek, groep.hoofdstuk, groep.vers, na, gevonden.repo, keuze.id);
		if (!uitkomst.gelukt) {
			meldingen.push(uitkomst.melding);
			continue;
		}
		keuze.verzen.push({ hoofdstuk: groep.hoofdstuk, vers: groep.vers, voor: huidig, na });
	}
	const keuzeBewaard = keuze.verzen.length > 0 && schrijfKeuzes(opslag, boek, [...bewaard, keuze]);
	if (keuze.verzen.length > 0 && !keuzeBewaard) {
		meldingen.push('De keuze kon niet worden bewaard, waarschijnlijk is de opslag vol. Terugdraaien in één keer kan niet.');
	}
	return { meldingen, keuzeBewaard };
}

/**
 * Past de aangevinkte vondsten toe: per vers `vervangInVers` op de huidige inhoud (met tussenstand), bewaard in de
 * tussenstand met herkomst "structurele keuze" en het keuze-id, en de keuze zelf bewaard voor terugdraaien.
 */
export function pasKeuzeToe(
	opslag: Opslag,
	boek: string,
	hoofdstukken: readonly HoofdstukVerzen[],
	zoekterm: string,
	nieuw: string,
	aangevinkt: readonly Vondst[],
	nu: Date,
): ToepasUitkomst {
	const bewaard = leesOpVolgorde(opslag, boek);
	const keuze = { ...legeKeuze(nieuwId(nu, bewaard), nu), zoekterm, nieuw };
	const { meldingen } = pasVerzenToe(opslag, boek, hoofdstukken, keuze, bewaard, aangevinkt, (inhoud, vondsten) => vervangInVers(inhoud, vondsten, nieuw));
	return { keuze, meldingen };
}

/** De bewaarde structurele keuzes van een boek, nieuwste eerst. */
export function leesKeuzes(opslag: Opslag, boek: string): StructureleKeuze[] {
	return leesOpVolgorde(opslag, boek).reverse();
}

/** Wat er met één vers van een keuze gebeurt bij terugdraaien: een melding als er iets te melden is, en of het vers bij de keuze blijft. */
type VersTerugUitkomst = { melding: string | null; blijftBijKeuze: boolean };

/**
 * Draait één vers van een keuze terug: alleen als de huidige inhoud nog gelijk is aan "na" (anders blijft het staan met melding,
 * want dan heeft de vertaler het vers daarna zelf bewerkt). Een vers waarvan "voor" gelijk is aan de basis van de
 * bewerking (de repo-inhoud) verdwijnt uit de tussenstand; anders komt "voor" terug als eigen bewerking.
 * Een vers dat een latere keuze nog bezit, blijft bij de keuze, zodat die later alsnog terug kan.
 */
function draaiKeuzeVersTerug(opslag: Opslag, boek: string, keuzes: readonly StructureleKeuze[], keuze: StructureleKeuze, keuzeVers: KeuzeVers): VersTerugUitkomst {
	const { hoofdstuk, vers, voor, na } = keuzeVers;
	const naam = versNaam(hoofdstuk, vers);
	const bewerkt = leesTussenstand(opslag, boek, hoofdstuk).verzen[vers];
	if (bewerkt === undefined) return { melding: `Vers ${naam} staat al weer op de repo-tekst.`, blijftBijKeuze: false };
	const latereKeuze = keuzes.find((k) => k.id === bewerkt.keuzeId && k.id !== keuze.id);
	if (latereKeuze !== undefined) {
		return { melding: `Vers ${naam} is daarna veranderd door de keuze "${latereKeuze.zoekterm}"; draai die eerst terug.`, blijftBijKeuze: true };
	}
	if (!zelfdeInhoud(bewerkt.inhoud, na)) return { melding: `Vers ${naam} is na de keuze zelf bewerkt en blijft staan.`, blijftBijKeuze: false };
	const kanNietTerug = { melding: `Vers ${naam} kon niet worden teruggezet en blijft staan.`, blijftBijKeuze: true };
	if (zelfdeInhoud(voor, bewerkt.basis)) {
		try {
			wisVers(opslag, boek, hoofdstuk, vers);
		} catch {
			return kanNietTerug;
		}
		return { melding: null, blijftBijKeuze: false };
	}
	if (!bewaarVers(opslag, boek, hoofdstuk, vers, voor, bewerkt.basis).gelukt) return kanNietTerug;
	return { melding: null, blijftBijKeuze: false };
}

/**
 * Schrijft de keuzelijst met alleen `overgebleven` verzen en de `overgeslagen` plekken voor `keuze`; zonder verzen is de keuze uit de lijst
 * en ook uit de antwoorden die ernaar wijzen (een antwoord zonder keuzes en zonder toelichting verdwijnt dan).
 */
function bewaarKeuzeNaTerugdraaien(
	opslag: Opslag,
	boek: string,
	keuzes: readonly StructureleKeuze[],
	keuze: StructureleKeuze,
	overgebleven: StructureleKeuze['verzen'],
	overgeslagen: StructureleKeuze['overgeslagen'],
): void {
	const nieuweLijst = keuzes.flatMap((k) => {
		if (k.id !== keuze.id) return [k];
		return overgebleven.length === 0 ? [] : [{ ...k, verzen: overgebleven, overgeslagen }];
	});
	if (schrijfKeuzes(opslag, boek, nieuweLijst) && overgebleven.length === 0) haalKeuzeUitAntwoorden(opslag, boek, keuze.id);
}

const KEUZE_ONTBREEKT = 'Deze keuze staat niet meer in de lijst.';

/**
 * Draait een keuze terug, vers voor vers met de regels van `draaiKeuzeVersTerug`. Verzen die blijven staan zonder bij de keuze te blijven
 * (door een eigen bewerking) verdwijnen uit de keuze. Zijn er geen verzen meer over, dan is de keuze uit de lijst en uit het antwoord dat ernaar wees.
 * Geeft de meldingen terug.
 */
export function draaiKeuzeTerug(opslag: Opslag, boek: string, keuzeId: string): string[] {
	const keuzes = leesOpVolgorde(opslag, boek);
	const keuze = keuzes.find((k) => k.id === keuzeId);
	if (keuze === undefined) return [KEUZE_ONTBREEKT];
	const uitkomsten = keuze.verzen.map((keuzeVers) => ({ keuzeVers, ...draaiKeuzeVersTerug(opslag, boek, keuzes, keuze, keuzeVers) }));
	const overgebleven = uitkomsten.filter((uitkomst) => uitkomst.blijftBijKeuze).map((uitkomst) => uitkomst.keuzeVers);
	bewaarKeuzeNaTerugdraaien(opslag, boek, keuzes, keuze, overgebleven, keuze.overgeslagen);
	return uitkomsten.flatMap((uitkomst) => uitkomst.melding ?? []);
}

/**
 * Draait één vers van een keuze terug, met dezelfde regels als `draaiKeuzeTerug` (niet als een latere keuze of eigen bewerking
 * het vers veranderde). Het vers gaat uit de keuze, behalve als het niet terug kon of een latere keuze het bezit; gaat het laatste vers eruit,
 * dan verdwijnt de keuze en gaat hij ook uit het antwoord dat ernaar wijst. Een vers dat echt terugging komt bij de overgeslagen plekken van de keuze, met reden `teruggedraaid`.
 * Geeft de meldingen.
 */
export function draaiVersTerug(opslag: Opslag, boek: string, keuzeId: string, hoofdstuk: number, vers: number): string[] {
	const keuzes = leesOpVolgorde(opslag, boek);
	const keuze = keuzes.find((k) => k.id === keuzeId);
	if (keuze === undefined) return [KEUZE_ONTBREEKT];
	const keuzeVers = keuze.verzen.find((v) => v.hoofdstuk === hoofdstuk && v.vers === vers);
	if (keuzeVers === undefined) return [`Vers ${versNaam(hoofdstuk, vers)} hoort niet (meer) bij deze keuze.`];
	const uitkomst = draaiKeuzeVersTerug(opslag, boek, keuzes, keuze, keuzeVers);
	const overgebleven = keuze.verzen.filter((v) => v !== keuzeVers || uitkomst.blijftBijKeuze);
	const teruggedraaid: OvergeslagenPlek = { hoofdstuk, vers, gevonden: keuze.zoekterm, reden: 'teruggedraaid' };
	const overgeslagen = uitkomst.melding === null && !uitkomst.blijftBijKeuze ? [...keuze.overgeslagen, teruggedraaid] : keuze.overgeslagen;
	bewaarKeuzeNaTerugdraaien(opslag, boek, keuzes, keuze, overgebleven, overgeslagen);
	return uitkomst.melding === null ? [] : [uitkomst.melding];
}

/** De vraag die met een keuze beantwoord wordt, met de gekozen optie zoals hij in de vraag staat. */
type BeantwoordeVraag = { kwestie: string; optie: string };

/** Alles wat bij het toepassen van een zoekopdracht hoort, buiten de opslag en de tijd. */
export type Toepassing = {
	hoofdstukken: readonly HoofdstukVerzen[];
	opdracht: Zoekopdracht;
	aangevinkt: readonly Plek[];
	overgeslagen: readonly OvergeslagenPlek[];
	/** Per variant (kleine letters) de vervanging uit het voorbeeldvenster; leeg of ontbrekend betekent niet toepassen. */
	variantVervangingen: ReadonlyMap<string, string>;
	/** De vraag die hiermee beantwoord wordt, of `null`. */
	vraag: BeantwoordeVraag | null;
};

/** De varianten waarvan een plek is aangevinkt en die een niet-lege vervanging hebben, in de volgorde van de vervangingen. */
function gebruikteVarianten(toepassing: Toepassing): KeuzeVariant[] {
	if (toepassing.opdracht.soort === 'markering') return [];
	const gevonden = new Set(toepassing.aangevinkt.flatMap((plek) => plek.variant ?? []));
	return [...toepassing.variantVervangingen].flatMap(([vorm, nieuw]) => (nieuw !== '' && gevonden.has(vorm) ? [{ vorm, nieuw }] : []));
}

/**
 * Past een zoekopdracht (tekst of markering, met varianten) toe zoals `pasKeuzeToe`, en bewaart de keuze met soort, varianten,
 * overgeslagen plekken en vraag. Hoort er een vraag bij, dan komt de keuze onder het antwoord op die vraag:
 * bestaat dat al, dan komt de keuze erbij (optie en toelichting blijven); anders wordt er een antwoord met de optie van de vraag bewaard.
 * Is er niets veranderd of kon de keuze niet bewaard worden, dan is er ook geen antwoord.
 */
export function pasOpdrachtToe(opslag: Opslag, boek: string, toepassing: Toepassing, nu: Date): ToepasUitkomst {
	const { opdracht, vraag } = toepassing;
	const bewaard = leesOpVolgorde(opslag, boek);
	const keuze: StructureleKeuze = {
		...legeKeuze(nieuwId(nu, bewaard), nu),
		soort: opdracht.soort,
		zoekterm: opdracht.zoekterm,
		nieuw: opdracht.soort === 'tekst' ? opdracht.nieuw : '',
		van: opdracht.soort === 'markering' ? opdracht.van : null,
		naar: opdracht.soort === 'markering' ? opdracht.naar : null,
		varianten: gebruikteVarianten(toepassing),
		overgeslagen: [...toepassing.overgeslagen],
		vraag: vraag === null ? null : vraag.kwestie,
	};
	const { meldingen, keuzeBewaard } = pasVerzenToe(opslag, boek, toepassing.hoofdstukken, keuze, bewaard, toepassing.aangevinkt, (inhoud, plekken) =>
		wijzigVers(inhoud, plekken, opdracht, toepassing.variantVervangingen),
	);
	if (vraag !== null && keuzeBewaard) {
		if (!voegKeuzeToe(opslag, boek, vraag, keuze.id, nu)) meldingen.push('Het antwoord op de vraag kon niet worden bewaard, waarschijnlijk is de opslag vol.');
	}
	return { keuze, meldingen };
}
