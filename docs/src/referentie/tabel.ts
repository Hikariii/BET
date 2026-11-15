/** Een fout in een referentiebestand, met het regelnummer (vanaf 1) in dat bestand. */
export class ReferentieFout extends Error {
	constructor(
		readonly regel: number,
		reden: string,
	) {
		super(`regel ${regel}: ${reden}`);
		this.name = 'ReferentieFout';
	}
}

export type Tabelregel = {
	regelnummer: number;
	cellen: string[];
};

export type Tabel = {
	/** De laatste `##`-kop vóór de tabel; leeg als die er niet is. */
	sectie: string;
	/** Koppen van de kolommen. */
	kop: string[];
	kopregelnummer: number;
	regels: Tabelregel[];
};

const SCHEIDINGSCEL = /^:?-+:?$/;

/**
 * Splitst een tabelregel op `|`.
 * Een `|` binnen een tweetal backticks of na een backslash is geen celgrens; `\|` wordt `|`.
 */
export function splitsTabelregel(regel: string): string[] {
	const tekst = regel.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
	const cellen: string[] = [];
	let cel = '';
	let binnenBackticks = false;
	for (let index = 0; index < tekst.length; index++) {
		const teken = tekst[index];
		if (teken === '\\' && tekst[index + 1] === '|') {
			cel += '|';
			index++;
		} else if (teken === '`' && (binnenBackticks || tekst.indexOf('`', index + 1) !== -1)) {
			binnenBackticks = !binnenBackticks;
			cel += teken;
		} else if (teken === '|' && !binnenBackticks) {
			cellen.push(cel.trim());
			cel = '';
		} else {
			cel += teken;
		}
	}
	cellen.push(cel.trim());
	return cellen;
}

function isTabelregel(regel: string): boolean {
	return regel.trimStart().startsWith('|');
}

function isScheidingsregel(regel: string): boolean {
	return splitsTabelregel(regel).every((cel) => SCHEIDINGSCEL.test(cel));
}

/**
 * Vindt alle tabellen in een Markdown-bestand.
 * Een tabel is een kopregel, een scheidingsregel en de regels daarna die met `|` beginnen.
 * Elke regel moet evenveel cellen hebben als de kop.
 */
export function leesTabellen(tekst: string): Tabel[] {
	const regels = tekst.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
	const tabellen: Tabel[] = [];
	let sectie = '';
	let huidige: Tabel | null = null;
	let verwachtScheiding = false;

	for (const [index, regel] of regels.entries()) {
		const regelnummer = index + 1;
		const kop = /^## (.*?)\s*$/.exec(regel);
		if (kop?.[1] !== undefined) sectie = kop[1];

		if (!isTabelregel(regel)) {
			huidige = null;
			verwachtScheiding = false;
			continue;
		}
		const cellen = splitsTabelregel(regel);
		if (huidige === null) {
			huidige = { sectie, kop: cellen, kopregelnummer: regelnummer, regels: [] };
			tabellen.push(huidige);
			verwachtScheiding = true;
			continue;
		}
		if (verwachtScheiding) {
			if (!isScheidingsregel(regel)) throw new ReferentieFout(regelnummer, 'na de kop van de tabel hoort een scheidingsregel (|---|)');
			if (cellen.length !== huidige.kop.length) {
				throw new ReferentieFout(regelnummer, `de scheidingsregel heeft ${cellen.length} kolommen, de kop ${huidige.kop.length}`);
			}
			verwachtScheiding = false;
			continue;
		}
		if (cellen.length !== huidige.kop.length) {
			throw new ReferentieFout(regelnummer, `${cellen.length} kolommen, de kop heeft er ${huidige.kop.length}`);
		}
		huidige.regels.push({ regelnummer, cellen });
	}
	return tabellen;
}

/** De plek van een kolom in de kop. Een ontbrekende kolom is een fout. */
export function kolomplaats(tabel: Tabel, kolomnaam: string): number {
	const plek = tabel.kop.indexOf(kolomnaam);
	if (plek === -1) throw new ReferentieFout(tabel.kopregelnummer, `kolom '${kolomnaam}' ontbreekt in de tabel met kop '${tabel.kop.join(' | ')}'`);
	return plek;
}
