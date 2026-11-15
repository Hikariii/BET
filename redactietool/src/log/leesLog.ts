import type { Log, LogRegel, LogVers, Verwijzing } from '../data/types';

// Zelfde betekenis als parse_log in scripts/md_naar_docx.py; de pariteitstest bewaakt dat.

const GEDACHTENSTREEP = String.fromCharCode(0x2013);
const AANDACHTSSTREEP = String.fromCharCode(0x2014);

const BOM = new RegExp(`^${String.fromCharCode(0xfeff)}`);
/** De regeleinden van Python `splitlines`: ook \v, \f, \x1c-\x1e, \x85 en de Unicode-regel- en alineascheiding. */
const REGELEINDE = new RegExp(`\\r\\n|[\\n\\r\\v\\f\\x1c-\\x1e\\x85${String.fromCharCode(0x2028, 0x2029)}]`);

const KOP_VRAGEN =/^##\s+Vragen\b/i;
const KOP_VERS = new RegExp(`^##\\s+Vers\\s+(\\d+)(?:\\s*[-${GEDACHTENSTREEP}${AANDACHTSSTREEP}]\\s*(\\d+))?\\s*:?\\s*$`, 'i');
const ITEM_ALGEMENE_VRAAG = /^(?:\d+\.|[-*])\s+(.*)$/;
const VELD = /^[-*]\s+\*\*(.+?):?\*\*:?\s*(.*)$/;
const SUBITEM = /^\s+[-*]\s+(.*)$/;

/** Vraagwaarden die "geen vraag" betekenen, na weghalen van haakjes en spaties. */
const LEGE_VRAGEN = ['', 'optioneel', 'geen', 'nee', 'n.v.t.', 'nvt', '-', AANDACHTSSTREEP];

/** Een paragraafverwijzing (`§7A`) of het woord precedent(en), in volgorde van voorkomen. */
const VERWIJZING = /§(\d+[A-Z]?)|\b[Pp]recedent(?:en)?\b/g;

type Veld = 'wijzigingen' | 'vragen';
type Sectie = { verzen: number[]; regels: string[] };

/** Splitst op dezelfde regeleinden als Python `splitlines` en negeert een BOM aan het begin. */
function splitsRegels(tekst: string): string[] {
	const regels = tekst.replace(BOM, '').split(REGELEINDE);
	if (regels[regels.length - 1] === '') regels.pop();
	return regels;
}

function leesVerwijzingen(tekst: string): Verwijzing[] {
	const verwijzingen: Verwijzing[] = [];
	const gezien = new Set<string>();
	for (const treffer of tekst.matchAll(VERWIJZING)) {
		const paragraaf = treffer[1];
		const sleutel = paragraaf === undefined ? 'precedent' : `§${paragraaf}`;
		if (gezien.has(sleutel)) continue;
		gezien.add(sleutel);
		verwijzingen.push(paragraaf === undefined ? { soort: 'precedent' } : { soort: 'paragraaf', paragraaf });
	}
	return verwijzingen;
}

function veldVanNaam(naam: string): Veld | null {
	if (naam.startsWith('wijziging')) return 'wijzigingen';
	if (naam.startsWith('twijfel') || naam.includes('vraag')) return 'vragen';
	return null;
}

function voegVoortzettingToe(regels: string[], tekst: string): void {
	const laatste = regels.length - 1;
	if (laatste < 0) regels.push(tekst);
	else regels[laatste] += ` ${tekst}`;
}

function isLegeVraag(vraag: string): boolean {
	return LEGE_VRAGEN.includes(vraag.replace(/^[() ]+|[() ]+$/g, '').toLowerCase());
}

function leesSectie(sectie: Sectie): LogVers {
	const velden: Record<Veld, string[]> = { wijzigingen: [], vragen: [] };
	let huidig: Veld | null = null;
	for (const regel of sectie.regels) {
		const kop = VELD.exec(regel);
		if (kop) {
			huidig = veldVanNaam((kop[1] ?? '').trim().toLowerCase().replace(/:+$/, ''));
			const rest = (kop[2] ?? '').trim();
			if (huidig !== null && rest !== '') velden[huidig].push(rest);
			continue;
		}
		if (huidig === null || regel.trim() === '') continue;
		const subitem = SUBITEM.exec(regel);
		if (subitem) velden[huidig].push((subitem[1] ?? '').trim());
		else voegVoortzettingToe(velden[huidig], regel.trim());
	}
	return {
		verzen: sectie.verzen,
		wijzigingen: velden.wijzigingen.map((tekst): LogRegel => ({ tekst, verwijzingen: leesVerwijzingen(tekst) })),
		vragen: velden.vragen.filter((vraag) => !isLegeVraag(vraag)),
	};
}

/** Leest een wijzigingslog (bijbel/<boek>/wijzigingslog/<prefix>-NN.md). */
export function leesLog(tekst: string): Log {
	const secties: Sectie[] = [];
	const algemeneVragen: string[] = [];
	let huidig: Sectie | null = null;
	let inVragen = false;
	for (const regel of splitsRegels(tekst)) {
		if (KOP_VRAGEN.test(regel)) {
			inVragen = true;
			huidig = null;
			continue;
		}
		if (inVragen && !regel.startsWith('#')) {
			const item = ITEM_ALGEMENE_VRAAG.exec(regel);
			if (item) algemeneVragen.push((item[1] ?? '').trim());
			else if (regel.trim() !== '' && algemeneVragen.length > 0 && /^[ \t]/.test(regel)) {
				algemeneVragen[algemeneVragen.length - 1] += ` ${regel.trim()}`;
			}
			continue;
		}
		if (regel.startsWith('#')) inVragen = false;
		const kop = KOP_VERS.exec(regel);
		if (kop) {
			const eerste = Number(kop[1]);
			const laatste = kop[2] === undefined ? eerste : Number(kop[2]);
			huidig = { verzen: Array.from({ length: Math.max(laatste - eerste + 1, 0) }, (_, index) => eerste + index), regels: [] };
			secties.push(huidig);
		} else if (regel.startsWith('#')) {
			huidig = null;
		} else if (huidig !== null) {
			huidig.regels.push(regel);
		}
	}
	return {
		// Een omgekeerde reeks (`## Vers 5-3`) bevat geen verzen; parse_log slaat die over.
		verzen: secties.filter((sectie) => sectie.verzen.length > 0).map(leesSectie),
		algemeneVragen,
	};
}
