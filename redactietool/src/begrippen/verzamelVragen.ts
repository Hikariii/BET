import type { HoofdstukData, OpenVraag, VersRef } from '../data/types';
import type { Vertaalvraag, VraagStatus } from './types';

type LogHoofdstuk = Pick<HoofdstukData, 'nummer' | 'log'>;

const GEDACHTENSTREEP = String.fromCharCode(0x2013);
const AANDACHTSSTREEP = String.fromCharCode(0x2014);
const AFKAPPING = String.fromCharCode(0x2026);

/** De vetgedrukte kop van een hoofdstukvraag, eventueel na een prefix in hoofdletters ("VOORLOPIG BESLOTEN DOOR HOOFDSESSIE:"). */
const KOP = /^(?:[A-Z .-]+:\s*)?\*\*(.+?)\*\*/;
/** `4:15`, `7:12-14` of `4:38-5:11`; niet midden in een ander getal (`10:13:15`). */
const VERWIJZING = new RegExp(`(?<![\\d:])(\\d{1,2}):(\\d{1,3})(?:\\s*[-${GEDACHTENSTREEP}${AANDACHTSSTREEP}]\\s*(?:(\\d{1,2}):)?(\\d{1,3}))?`, 'g');
/** "Zie vraag 4", "Zie vraag 9 en 10", "Zie vraag 1 (a), vraag 2 (b) en vraag 22 (c)". */
const ZIE_VRAAG = /zie\s+vraag\s+\d+(?:(?:\s*\([^)]*\))?\s*(?:,|\ben\b)\s*(?:vraag\s+)?\d+)*/gi;
/** "Geen." en "geen (verwerkt na onafhankelijke controle)": een invulling van het veld, geen vraag. */
const LEGE_VERS_VRAAG = /^\W*(?:geen|nee|n\.v\.t|nvt)(?:\s*\([^)]*\))?\W*$/i;
const KWESTIE_MAXIMUM = 90;

const STATUS_OPEN_HOOFDLETTERS = /\bOPEN\b/;
const STATUS_OPEN = /\[open\]|\bnog open\b/i;
const STATUS_VOORLOPIG = /voorlopig besloten|\bbesluit\b/i;

const STATUSVOLGORDE: Record<VraagStatus, number> = { open: 0, onbeslist: 1, 'voorlopig besloten': 2, besloten: 3 };

/**
 * Alle vertaalvragen: het register (open-vragen.md) en de vragen uit de wijzigingslogs.
 * Een vers-vraag "Zie vraag N" is geen eigen vraag: haar verzen gaan naar hoofdstukvraag N van hetzelfde hoofdstuk.
 * Gesorteerd op status (open, onbeslist, voorlopig besloten, besloten), dan register eerst, dan hoofdstuk en eerste vers.
 */
export function verzamelVragen(openVragen: readonly OpenVraag[], hoofdstukken: readonly LogHoofdstuk[]): Vertaalvraag[] {
	const vragen = [...openVragen.map(registerVraag), ...hoofdstukken.flatMap(vragenUitLog)];
	return vragen.sort(vergelijk);
}

function registerVraag(vraag: OpenVraag): Vertaalvraag {
	return {
		herkomst: { soort: 'register' },
		kwestie: vraag.kwestie,
		tekst: vraag.besluit,
		gekozen: vraag.gekozen,
		alternatief: vraag.alternatief,
		status: registerStatus(vraag.status),
		statusAfgeleid: false,
		verzen: sorteerVerzen(vraag.verzen),
	};
}

function registerStatus(kolom: string): VraagStatus {
	const status = kolom.trim().toLowerCase();
	if (status === 'open') return 'open';
	if (status === 'voorlopig besloten') return 'voorlopig besloten';
	if (status.startsWith('besloten')) return 'besloten';
	return 'onbeslist';
}

function vragenUitLog({ nummer: hoofdstuk, log }: LogHoofdstuk): Vertaalvraag[] {
	const hoofdstukVragen = log.algemeneVragen.map((tekst, index) => hoofdstukVraag(hoofdstuk, index + 1, tekst));
	const eigenVersVragen: Vertaalvraag[] = [];
	for (const logVers of log.verzen) {
		const verzen = logVers.verzen.map((vers) => ({ hoofdstuk, vers }));
		for (const tekst of logVers.vragen) {
			const verwezen = verwezenVragen(tekst);
			if (verwezen.length > 0) {
				for (const nummer of verwezen) hoofdstukVragen[nummer - 1]?.verzen.push(...verzen);
			} else if (!LEGE_VERS_VRAAG.test(tekst)) {
				eigenVersVragen.push(versVraag(hoofdstuk, logVers.verzen[0] ?? 0, verzen, tekst));
			}
		}
	}
	for (const vraag of hoofdstukVragen) vraag.verzen = sorteerVerzen(vraag.verzen);
	return [...hoofdstukVragen, ...eigenVersVragen];
}

function hoofdstukVraag(hoofdstuk: number, nummer: number, tekst: string): Vertaalvraag {
	const kop = KOP.exec(tekst)?.[1] ?? null;
	return {
		herkomst: { soort: 'hoofdstuk', hoofdstuk, nummer },
		kwestie: kop === null ? eersteZin(tekst) : kwestieUitKop(kop),
		tekst,
		gekozen: null,
		alternatief: null,
		status: statusUitTekst(tekst),
		statusAfgeleid: true,
		verzen: kop === null ? [] : versRefsUitKop(kop),
	};
}

function versVraag(hoofdstuk: number, vers: number, verzen: VersRef[], tekst: string): Vertaalvraag {
	return {
		herkomst: { soort: 'vers', hoofdstuk, vers },
		kwestie: eersteZin(tekst),
		tekst,
		gekozen: null,
		alternatief: null,
		status: statusUitTekst(tekst),
		statusAfgeleid: true,
		verzen,
	};
}

function statusUitTekst(tekst: string): VraagStatus {
	if (STATUS_OPEN_HOOFDLETTERS.test(tekst) || STATUS_OPEN.test(tekst)) return 'open';
	if (STATUS_VOORLOPIG.test(tekst)) return 'voorlopig besloten';
	return 'onbeslist';
}

/** Een bereik over twee hoofdstukken (`4:38-5:11`) valt weg: de verzen ertussen zijn niet te kennen zonder het aantal verzen per hoofdstuk. */
function versRefsUitKop(kop: string): VersRef[] {
	const verzen: VersRef[] = [];
	for (const [, hoofdstukTekst, eersteTekst, bereikHoofdstuk, laatsteTekst] of kop.matchAll(VERWIJZING)) {
		const hoofdstuk = Number(hoofdstukTekst);
		const eerste = Number(eersteTekst);
		if (laatsteTekst === undefined) {
			verzen.push({ hoofdstuk, vers: eerste });
			continue;
		}
		if (bereikHoofdstuk !== undefined && Number(bereikHoofdstuk) !== hoofdstuk) continue;
		const laatste = Math.max(Number(laatsteTekst), eerste);
		for (let vers = eerste; vers <= laatste; vers++) verzen.push({ hoofdstuk, vers });
	}
	return verzen;
}

/** De kop zonder versverwijzingen: "13:35, woestenij" wordt "woestenij". Blijft er niets over, dan de kop zelf. */
function kwestieUitKop(kop: string): string {
	const zonderVerwijzingen = kop.replace(VERWIJZING, '');
	const kwestie = zonderVerwijzingen === kop ? kop : zonderVerwijzingen.replace(/^(?:[\s,;:]|en\s|\([^)]*\))+/, '');
	const opgeschoond = kwestie.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').replace(/[\s,;:]+$/, '').trim();
	return opgeschoond === '' ? kop.replace(/[\s:]+$/, '') : opgeschoond;
}

function verwezenVragen(tekst: string): number[] {
	return [...tekst.matchAll(ZIE_VRAAG)].flatMap(([verwijzing]) => (verwijzing.replace(/\([^)]*\)/g, '').match(/\d+/g) ?? []).map(Number));
}

function eersteZin(tekst: string): string {
	const platteTekst = tekst.replace(/\*\*/g, '').trim();
	const zin = platteTekst.split(/(?<=[.?!])\s/)[0] ?? platteTekst;
	return zin.length <= KWESTIE_MAXIMUM ? zin : `${zin.slice(0, KWESTIE_MAXIMUM - 1).trimEnd()}${AFKAPPING}`;
}

function sorteerVerzen(verzen: readonly VersRef[]): VersRef[] {
	const uniek = new Map(verzen.map((ref) => [`${ref.hoofdstuk}:${ref.vers}`, ref]));
	return [...uniek.values()].sort((a, b) => a.hoofdstuk - b.hoofdstuk || a.vers - b.vers);
}

type Sorteersleutel = { register: boolean; hoofdstuk: number; vers: number };

function sorteersleutel({ herkomst, verzen }: Vertaalvraag): Sorteersleutel {
	if (herkomst.soort === 'register') {
		return { register: true, hoofdstuk: verzen[0]?.hoofdstuk ?? Infinity, vers: verzen[0]?.vers ?? Infinity };
	}
	if (herkomst.soort === 'vers') return { register: false, hoofdstuk: herkomst.hoofdstuk, vers: herkomst.vers };
	const eerste = verzen.find((ref) => ref.hoofdstuk === herkomst.hoofdstuk);
	return { register: false, hoofdstuk: herkomst.hoofdstuk, vers: eerste?.vers ?? Infinity };
}

/** `Infinity - Infinity` is NaN; vandaar de gelijkheidscontrole. */
function verschil(a: number, b: number): number {
	return a === b ? 0 : a - b;
}

function vergelijk(a: Vertaalvraag, b: Vertaalvraag): number {
	const sleutelA = sorteersleutel(a);
	const sleutelB = sorteersleutel(b);
	return (
		STATUSVOLGORDE[a.status] - STATUSVOLGORDE[b.status] ||
		Number(sleutelB.register) - Number(sleutelA.register) ||
		verschil(sleutelA.hoofdstuk, sleutelB.hoofdstuk) ||
		verschil(sleutelA.vers, sleutelB.vers)
	);
}
