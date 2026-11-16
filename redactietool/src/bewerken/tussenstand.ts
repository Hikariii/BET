import { ALINEASTIJLEN, OPMAAK_VOLGORDE } from '../formaat/types';
import type { Alineastijl, Hoofdstuk, Opmaak, Tekststuk } from '../formaat/types';
import type { BewerktVers, Tussenstand, VersAlineadeel, VersInhoud } from './types';
import { nietOpgeslagen, RUIMTE_MAKEN } from './opslagVol';
import { knipVers, vervangVers } from './versknip';

/** Het deel van de browseropslag dat de tussenstand gebruikt; in tests een eenvoudige vervanger. */
export type Opslag = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** De sleutel waaronder de tussenstand van een hoofdstuk in de opslag staat. */
export function tussenstandSleutel(boek: string, hoofdstuk: number): string {
	return `bet-tussenstand/${boek}/${hoofdstuk}`;
}

function isObject(waarde: unknown): waarde is Record<string, unknown> {
	return typeof waarde === 'object' && waarde !== null && !Array.isArray(waarde);
}

function isOpmaak(waarde: unknown): waarde is Opmaak {
	return OPMAAK_VOLGORDE.some((opmaak) => opmaak === waarde);
}

function isAlineastijl(waarde: unknown): waarde is Alineastijl {
	return ALINEASTIJLEN.some((stijl) => stijl === waarde);
}

function alsTekststuk(waarde: unknown): Tekststuk | null {
	if (!isObject(waarde) || waarde['soort'] !== 'tekst' || typeof waarde['tekst'] !== 'string') return null;
	if (waarde['tekst'].includes('\n')) return null;
	const opmaak = waarde['opmaak'];
	if (!Array.isArray(opmaak) || !opmaak.every(isOpmaak)) return null;
	return { soort: 'tekst', tekst: waarde['tekst'], opmaak };
}

function alsDeel(waarde: unknown): VersAlineadeel | null {
	if (!isObject(waarde)) return null;
	const stijl = waarde['stijl'];
	const stukken = waarde['stukken'];
	if (stijl !== null && !isAlineastijl(stijl)) return null;
	if (!Array.isArray(stukken)) return null;
	const tekststukken: Tekststuk[] = [];
	for (const stuk of stukken) {
		const tekststuk = alsTekststuk(stuk);
		if (tekststuk === null) return null;
		tekststukken.push(tekststuk);
	}
	return { stijl, stukken: tekststukken };
}

/** Leest een VersInhoud uit opgeslagen JSON; `null` bij een onbruikbare vorm. */
export function alsInhoud(waarde: unknown): VersInhoud | null {
	if (!isObject(waarde) || !Array.isArray(waarde['delen'])) return null;
	const delen: VersAlineadeel[] = [];
	for (const deel of waarde['delen']) {
		const alineadeel = alsDeel(deel);
		if (alineadeel === null) return null;
		delen.push(alineadeel);
	}
	return { delen };
}

/** Leest één bewerkt vers uit opgeslagen JSON; `null` bij een onbruikbare vorm. */
export function alsBewerktVers(waarde: unknown): BewerktVers | null {
	if (!isObject(waarde) || typeof waarde['bewaard'] !== 'string') return null;
	const inhoud = alsInhoud(waarde['inhoud']);
	const basis = alsInhoud(waarde['basis']);
	if (inhoud === null || basis === null) return null;
	const { bewaard } = waarde;
	if (waarde['herkomst'] === 'zelf getypt') return { inhoud, basis, bewaard, herkomst: 'zelf getypt' };
	if (waarde['herkomst'] === 'structurele keuze' && typeof waarde['keuzeId'] === 'string') {
		return { inhoud, basis, bewaard, herkomst: 'structurele keuze', keuzeId: waarde['keuzeId'] };
	}
	return null;
}

/** Leest de tussenstand van een hoofdstuk; leeg als er niets bewaard is of de opslag onleesbaar is. Een vers met een onbruikbare vorm valt weg. */
export function leesTussenstand(opslag: Opslag, boek: string, hoofdstuk: number): Tussenstand {
	const leeg: Tussenstand = { verzen: {} };
	let tekst: string | null;
	try {
		tekst = opslag.getItem(tussenstandSleutel(boek, hoofdstuk));
	} catch {
		return leeg;
	}
	if (tekst === null) return leeg;
	let json: unknown;
	try {
		json = JSON.parse(tekst);
	} catch {
		return leeg;
	}
	if (!isObject(json) || !isObject(json['verzen'])) return leeg;
	const verzen: Record<number, BewerktVers> = {};
	for (const [sleutelTekst, waarde] of Object.entries(json['verzen'])) {
		const nummer = Number(sleutelTekst);
		const vers = alsBewerktVers(waarde);
		if (Number.isInteger(nummer) && nummer > 0 && vers !== null) verzen[nummer] = vers;
	}
	return { verzen };
}

export type BewaarUitkomst = { gelukt: true } | { gelukt: false; melding: string };

function schrijfVers(opslag: Opslag, boek: string, hoofdstuk: number, vers: number, bewerkt: BewerktVers): BewaarUitkomst {
	const tussenstand = leesTussenstand(opslag, boek, hoofdstuk);
	tussenstand.verzen[vers] = bewerkt;
	try {
		opslag.setItem(tussenstandSleutel(boek, hoofdstuk), JSON.stringify(tussenstand));
		return { gelukt: true };
	} catch {
		return {
			gelukt: false,
			melding: `${nietOpgeslagen(`Vers ${vers}`)} Kopieer je tekst voordat je op Klaar drukt. ${RUIMTE_MAKEN}`,
		};
	}
}

/** Bewaart de bewerkte inhoud van één vers met de repo-inhoud waarop hij begon (herkomst 'zelf getypt'); een volle opslag geeft een melding. */
export function bewaarVers(
	opslag: Opslag,
	boek: string,
	hoofdstuk: number,
	vers: number,
	inhoud: VersInhoud,
	basis: VersInhoud,
): BewaarUitkomst {
	return schrijfVers(opslag, boek, hoofdstuk, vers, { inhoud, basis, bewaard: new Date().toISOString(), herkomst: 'zelf getypt' });
}

/**
 * Bewaart een vers dat een structurele keuze veranderde, met herkomst 'structurele keuze' en het keuze-id.
 * `huidig` is de inhoud vóór de vervanging: een vers zonder bewerking krijgt die als basis (de repo-inhoud),
 * een bewerkt vers houdt zijn oude basis. Past die basis niet meer op `huidig` (ander aantal delen), dan geeft dat een melding.
 */
export function bewaarKeuzeVers(
	opslag: Opslag,
	boek: string,
	hoofdstuk: number,
	vers: number,
	nieuw: VersInhoud,
	repo: VersInhoud,
	keuzeId: string,
): BewaarUitkomst {
	const bestaand = leesTussenstand(opslag, boek, hoofdstuk).verzen[vers];
	if (bestaand !== undefined && (!pastOpRepo(repo, bestaand) || isVerouderd(repo, bestaand.basis))) {
		return {
			gelukt: false,
			melding: `Vers ${hoofdstuk}:${vers} is overgeslagen: de bewerking hoort bij een oudere tekst van Claude. Kijk het vers eerst na.`,
		};
	}
	const basis = bestaand === undefined ? repo : bestaand.basis;
	return schrijfVers(opslag, boek, hoofdstuk, vers, {
		inhoud: nieuw,
		basis,
		bewaard: new Date().toISOString(),
		herkomst: 'structurele keuze',
		keuzeId,
	});
}

/** Of een bewaarde bewerking dezelfde indeling in alinea's heeft als het vers in de repo; zo niet, dan kan ze er niet in worden gezet. */
export function pastOpRepo(repo: VersInhoud, bewerkt: BewerktVers): boolean {
	return repo.delen.length === bewerkt.inhoud.delen.length;
}

/** Haalt één vers uit de tussenstand (terug naar de versie uit de repo). */
export function wisVers(opslag: Opslag, boek: string, hoofdstuk: number, vers: number): void {
	const tussenstand = leesTussenstand(opslag, boek, hoofdstuk);
	if (!(vers in tussenstand.verzen)) return;
	delete tussenstand.verzen[vers];
	if (Object.keys(tussenstand.verzen).length === 0) {
		opslag.removeItem(tussenstandSleutel(boek, hoofdstuk));
		return;
	}
	opslag.setItem(tussenstandSleutel(boek, hoofdstuk), JSON.stringify(tussenstand));
}

function opmaakSleutel(stuk: Tekststuk): string {
	return stuk.opmaak.join(' ');
}

/** Voegt aaneensluitende stukken met dezelfde opmaak samen en laat lege stukken weg, zodat alleen de inhoud telt. */
function samengevoegd(stukken: readonly Tekststuk[]): Tekststuk[] {
	const uitkomst: Tekststuk[] = [];
	for (const stuk of stukken) {
		if (stuk.tekst === '') continue;
		const vorige = uitkomst[uitkomst.length - 1];
		if (vorige !== undefined && opmaakSleutel(vorige) === opmaakSleutel(stuk)) {
			uitkomst[uitkomst.length - 1] = {
				...vorige,
				tekst: vorige.tekst + stuk.tekst,
			};
		} else {
			uitkomst.push(stuk);
		}
	}
	return uitkomst;
}

/** Of twee inhouden hetzelfde zeggen: gelijke stijl, tekst en opmaak per deel, ongeacht hoe de stukken verdeeld zijn. */
export function zelfdeInhoud(a: VersInhoud, b: VersInhoud): boolean {
	if (a.delen.length !== b.delen.length) return false;
	return a.delen.every((deel, plek) => {
		const ander = b.delen[plek];
		if (ander === undefined || deel.stijl !== ander.stijl) return false;
		const links = samengevoegd(deel.stukken);
		const rechts = samengevoegd(ander.stukken);
		return (
			links.length === rechts.length &&
			links.every((stuk, nr) => {
				const tegenover = rechts[nr];
				return tegenover !== undefined && stuk.tekst === tegenover.tekst && opmaakSleutel(stuk) === opmaakSleutel(tegenover);
			})
		);
	});
}

/** Of de repo-inhoud van een bewaard vers niet meer gelijk is aan de basis van de bewerking (stijl, tekst en opmaak per stuk). */
export function isVerouderd(repo: VersInhoud, basis: VersInhoud): boolean {
	return !zelfdeInhoud(repo, basis);
}

/** Of een bewaarde bewerking verouderd is: het vers is uit de repo verdwenen (`repo` is `null`), heeft een andere indeling of heeft een andere tekst dan waarop de bewerking begon. */
export function isBewerkingVerouderd(repo: VersInhoud | null, bewerkt: BewerktVers): boolean {
	return repo === null || !pastOpRepo(repo, bewerkt) || isVerouderd(repo, bewerkt.basis);
}

/** Het hoofdstuk met de bewerkte verzen uit de tussenstand erin; een vers dat niet bestaat of een ander aantal delen heeft, blijft zoals het was. */
export function pasTussenstandToe(hoofdstuk: Hoofdstuk, tussenstand: Tussenstand): Hoofdstuk {
	let resultaat = hoofdstuk;
	for (const [nummerTekst, bewerkt] of Object.entries(tussenstand.verzen)) {
		const nummer = Number(nummerTekst);
		const huidig = knipVers(resultaat, nummer);
		if (huidig === null || !pastOpRepo(huidig, bewerkt)) continue;
		resultaat = vervangVers(resultaat, nummer, bewerkt.inhoud);
	}
	return resultaat;
}
