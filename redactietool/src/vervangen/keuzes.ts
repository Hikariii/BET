import { alsInhoud, bewaarKeuzeVers, bewaarVers, leesTussenstand, wisVers, zelfdeInhoud } from '../bewerken/tussenstand';
import type { Opslag } from '../bewerken/tussenstand';
import type { VersInhoud } from '../bewerken/types';
import { vervangInVers } from './zoekEnVervang';
import type { HoofdstukVerzen, Vondst } from './types';

/** Een toegepaste structurele keuze, bewaard om hem in één keer terug te draaien. */
export type StructureleKeuze = {
	id: string;
	zoekterm: string;
	nieuw: string;
	/** ISO-tijd van toepassen. */
	toegepast: string;
	/** Per vers de inhoud voor en na de vervanging. */
	verzen: KeuzeVers[];
};

type KeuzeVers = { hoofdstuk: number; vers: number; voor: VersInhoud; na: VersInhoud };

export type ToepasUitkomst = { keuze: StructureleKeuze; meldingen: string[] };

function sleutel(boek: string): string {
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

function alsKeuze(waarde: unknown): StructureleKeuze | null {
	if (!isObject(waarde) || !Array.isArray(waarde['verzen'])) return null;
	const { id, zoekterm, nieuw, toegepast } = waarde;
	if (typeof id !== 'string' || typeof zoekterm !== 'string' || typeof nieuw !== 'string' || typeof toegepast !== 'string') return null;
	const verzen: KeuzeVers[] = [];
	for (const vers of waarde['verzen']) {
		const keuzeVers = alsKeuzeVers(vers);
		if (keuzeVers === null) return null;
		verzen.push(keuzeVers);
	}
	return { id, zoekterm, nieuw, toegepast, verzen };
}

/** Alle bewaarde keuzes op volgorde van toepassen (oudste eerst); onleesbare opslag geeft een lege lijst. */
function leesOpVolgorde(opslag: Opslag, boek: string): StructureleKeuze[] {
	try {
		const tekst = opslag.getItem(sleutel(boek));
		if (tekst === null) return [];
		const json: unknown = JSON.parse(tekst);
		if (!Array.isArray(json)) return [];
		return json.flatMap((waarde) => alsKeuze(waarde) ?? []);
	} catch {
		return [];
	}
}

/** Schrijft de lijst terug; zonder keuzes verdwijnt de sleutel. Geeft `false` als de opslag het weigert. */
function schrijfKeuzes(opslag: Opslag, boek: string, keuzes: readonly StructureleKeuze[]): boolean {
	try {
		if (keuzes.length === 0) opslag.removeItem(sleutel(boek));
		else opslag.setItem(sleutel(boek), JSON.stringify(keuzes));
		return true;
	} catch {
		return false;
	}
}

function versNaam(hoofdstuk: number, vers: number): string {
	return `${hoofdstuk}:${vers}`;
}

/** De vervangbare vondsten per hoofdstuk en vers, op oplopend hoofdstuk en vers. */
function groepeerPerVers(vondsten: readonly Vondst[]): { hoofdstuk: number; vers: number; vondsten: Vondst[] }[] {
	const groepen = new Map<string, { hoofdstuk: number; vers: number; vondsten: Vondst[] }>();
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

/**
 * Past de aangevinkte vondsten toe: per vers `vervangInVers` op de huidige inhoud (met tussenstand), bewaard in de
 * tussenstand met herkomst "structurele keuze" en het keuze-id, en de keuze zelf bewaard voor terugdraaien.
 * Een vers waarvan de bewaarde bewerking niet meer past, wordt overgeslagen met een melding. Een mislukte opslag
 * geeft een melding per vers; alleen de verzen die lukten staan in de keuze.
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
	const keuze: StructureleKeuze = { id: nieuwId(nu, bewaard), zoekterm, nieuw, toegepast: nu.toISOString(), verzen: [] };
	const meldingen: string[] = [];
	for (const groep of groepeerPerVers(aangevinkt)) {
		const huidig = hoofdstukken.find((h) => h.hoofdstuk === groep.hoofdstuk)?.verzen.find((v) => v.vers === groep.vers)?.inhoud;
		if (huidig === undefined) {
			meldingen.push(`Vers ${versNaam(groep.hoofdstuk, groep.vers)} staat niet in het hoofdstuk en is overgeslagen.`);
			continue;
		}
		const na = vervangInVers(huidig, groep.vondsten, nieuw);
		if (zelfdeInhoud(na, huidig)) continue;
		const uitkomst = bewaarKeuzeVers(opslag, boek, groep.hoofdstuk, groep.vers, na, huidig, keuze.id);
		if (!uitkomst.gelukt) {
			meldingen.push(uitkomst.melding);
			continue;
		}
		keuze.verzen.push({ hoofdstuk: groep.hoofdstuk, vers: groep.vers, voor: huidig, na });
	}
	if (keuze.verzen.length > 0 && !schrijfKeuzes(opslag, boek, [...bewaard, keuze])) {
		meldingen.push('De keuze kon niet worden bewaard, waarschijnlijk is de opslag vol. Terugdraaien in één keer kan niet.');
	}
	return { keuze, meldingen };
}

/** De bewaarde structurele keuzes van een boek, nieuwste eerst. */
export function leesKeuzes(opslag: Opslag, boek: string): StructureleKeuze[] {
	return leesOpVolgorde(opslag, boek).reverse();
}

/**
 * Draait een keuze terug: alleen verzen waarvan de huidige inhoud nog gelijk is aan "na" (anders overgeslagen met melding,
 * want dan heeft de vertaler het vers daarna zelf bewerkt). Een vers waarvan "voor" gelijk is aan de basis van de
 * bewerking (de repo-inhoud) verdwijnt uit de tussenstand; anders komt "voor" terug als eigen bewerking.
 * Daarna is de keuze uit de lijst. Geeft de meldingen terug.
 */
export function draaiKeuzeTerug(opslag: Opslag, boek: string, keuzeId: string): string[] {
	const keuzes = leesOpVolgorde(opslag, boek);
	const keuze = keuzes.find((k) => k.id === keuzeId);
	if (keuze === undefined) return ['Deze keuze staat niet meer in de lijst.'];
	const meldingen: string[] = [];
	for (const { hoofdstuk, vers, voor, na } of keuze.verzen) {
		const naam = versNaam(hoofdstuk, vers);
		const bewerkt = leesTussenstand(opslag, boek, hoofdstuk).verzen[vers];
		if (bewerkt === undefined || !zelfdeInhoud(bewerkt.inhoud, na)) {
			meldingen.push(`Vers ${naam} is na de keuze zelf bewerkt en blijft staan.`);
			continue;
		}
		if (zelfdeInhoud(voor, bewerkt.basis)) {
			try {
				wisVers(opslag, boek, hoofdstuk, vers);
			} catch {
				meldingen.push(`Vers ${naam} kon niet worden teruggezet en blijft staan.`);
			}
			continue;
		}
		if (!bewaarVers(opslag, boek, hoofdstuk, vers, voor, bewerkt.basis).gelukt) {
			meldingen.push(`Vers ${naam} kon niet worden teruggezet en blijft staan.`);
		}
	}
	schrijfKeuzes(
		opslag,
		boek,
		keuzes.filter((k) => k.id !== keuzeId),
	);
	return meldingen;
}
