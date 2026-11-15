import {
	ALINEASTIJLEN,
	FormaatFout,
	nestingniveau,
	openTag,
	OPMAAK_MET_TAGNAAM,
	type Alinea,
	type Alineastijl,
	type Hoofdstuk,
	type Inlinestuk,
	type Opmaak,
	type Tekstalinea,
} from './types';

const MAXIMAAL_LEGE_REGELS_ACHTER_ELKAAR = 2;

const OPMAAKTEKEN = /\{(\/?)([^{}\s]*)\}|==|\[(\d+)\]/g;
const KOP = /^# (\S.*?)\s*$/;
const ALINEASTIJL = /^@(\S+)(?:\s(.*))?$/;

function isAlineastijl(naam: string): naam is Alineastijl {
	return (ALINEASTIJLEN as readonly string[]).includes(naam);
}

function isOpmaakMetTagnaam(naam: string): naam is Opmaak {
	return (OPMAAK_MET_TAGNAAM as readonly string[]).includes(naam);
}

/** Zet de tekst van één hoofdstukbestand om in alinea's. Een regel die niet volgens FORMAAT.md is, geeft een FormaatFout met het regelnummer. */
export function parseerHoofdstuk(bestandstekst: string): Hoofdstuk {
	const regels = bestandstekst.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
	if (regels.at(-1) === '') regels.pop();

	let legeRegelsAchterElkaar = 0;
	const alineas = regels.map((regel, index) => {
		const regelnummer = index + 1;
		legeRegelsAchterElkaar = regel === '' ? legeRegelsAchterElkaar + 1 : 0;
		if (legeRegelsAchterElkaar > MAXIMAAL_LEGE_REGELS_ACHTER_ELKAAR) {
			throw new FormaatFout(regelnummer, `meer dan ${MAXIMAAL_LEGE_REGELS_ACHTER_ELKAAR} lege regels achter elkaar`);
		}
		return parseerAlinea(regel, regelnummer);
	});
	return { alineas };
}

function parseerAlinea(regel: string, regelnummer: number): Alinea {
	if (regel === '') return { soort: 'leeg' };
	if (regel.trim() === '') throw new FormaatFout(regelnummer, 'regel met alleen witruimte; een lege regel is helemaal leeg');

	if (regel.startsWith('#')) {
		const kop = KOP.exec(regel);
		if (kop?.[1] === undefined) throw new FormaatFout(regelnummer, "alleen '# Titel' wordt ondersteund (bv. '# Lukas 1')");
		return { soort: 'titel', tekst: kop[1] };
	}

	const stijlMatch = ALINEASTIJL.exec(regel);
	if (stijlMatch?.[1] === undefined) return tekstalinea(null, regel, regelnummer);

	const [, stijlnaam, tekst] = stijlMatch;
	if (!isAlineastijl(stijlnaam)) throw new FormaatFout(regelnummer, `onbekende alineatag '@${stijlnaam}'`);
	if (tekst !== undefined && (tekst === '' || /^\s/.test(tekst))) {
		throw new FormaatFout(regelnummer, `na '@${stijlnaam}' hoort precies één spatie en dan tekst`);
	}
	return tekstalinea(stijlnaam, tekst ?? '', regelnummer);
}

function tekstalinea(stijl: Alineastijl | null, tekst: string, regelnummer: number): Tekstalinea {
	return { soort: 'tekst', stijl, stukken: parseerInline(tekst, regelnummer) };
}

function parseerInline(tekst: string, regelnummer: number): Inlinestuk[] {
	const stukken: Inlinestuk[] = [];
	const open: Opmaak[] = [];

	function voegTekstToe(stuk: string) {
		const vorige = stukken.at(-1);
		if (vorige?.soort === 'tekst' && vorige.opmaak.join() === open.join()) {
			stukken[stukken.length - 1] = { ...vorige, tekst: vorige.tekst + stuk };
		} else {
			stukken.push({ soort: 'tekst', tekst: stuk, opmaak: [...open] });
		}
	}

	function opmaakOpenen(opmaak: Opmaak) {
		if (open.includes(opmaak)) throw new FormaatFout(regelnummer, `${openTag(opmaak)} staat al open`);
		const binnenste = open.at(-1);
		if (binnenste !== undefined && nestingniveau(binnenste) > nestingniveau(opmaak)) {
			throw new FormaatFout(regelnummer, `${openTag(opmaak)} hoort buiten ${openTag(binnenste)}`);
		}
		open.push(opmaak);
	}

	function opmaakSluiten(opmaak: Opmaak, tag: string) {
		const binnenste = open.at(-1);
		if (!open.includes(opmaak)) throw new FormaatFout(regelnummer, `${tag} sluit een tag die niet open staat`);
		if (binnenste !== opmaak) {
			throw new FormaatFout(regelnummer, `${tag} sluit terwijl ${openTag(binnenste ?? opmaak)} nog open staat`);
		}
		open.pop();
	}

	let positie = 0;
	for (const teken of tekst.matchAll(OPMAAKTEKEN)) {
		if (teken.index > positie) voegTekstToe(tekst.slice(positie, teken.index));
		positie = teken.index + teken[0].length;

		const [volledig, sluit, tagnaam, versnummer] = teken;
		if (versnummer !== undefined) {
			if (open.length > 0) {
				throw new FormaatFout(regelnummer, `versnummer ${volledig} staat binnen ${open.map(openTag).join('')}`);
			}
			stukken.push({ soort: 'vers', nummer: Number(versnummer) });
		} else if (volledig === '==') {
			if (open.includes('highlight')) opmaakSluiten('highlight', volledig);
			else opmaakOpenen('highlight');
		} else {
			if (tagnaam === undefined || !isOpmaakMetTagnaam(tagnaam)) throw new FormaatFout(regelnummer, `onbekende tag '${volledig}'`);
			if (sluit === '/') opmaakSluiten(tagnaam, volledig);
			else opmaakOpenen(tagnaam);
		}
	}
	if (positie < tekst.length) voegTekstToe(tekst.slice(positie));
	if (open.length > 0) throw new FormaatFout(regelnummer, `tag(s) niet gesloten aan het eind van de alinea: ${open.map(openTag).join('')}`);
	return stukken;
}
