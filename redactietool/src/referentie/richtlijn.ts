import type { RichtlijnSectie } from '../data/types';

type Niveau = RichtlijnSectie['niveau'];

const KOP = /^(#{1,6}) (.*?)\s*$/;
const PARAGRAAFNUMMER = /^(\d+[A-Z]?)\.\s+(.*)$/;
const VERSIEMARKERING = /\*{0,2}\[v\d+(?:\.\d+)*[^\]]*\]\*{0,2}/g;
const CODEHEK = /^\s*(```|~~~)/;

function isSectieniveau(aantalHekjes: number): aantalHekjes is Niveau {
	return aantalHekjes === 2 || aantalHekjes === 3;
}

/**
 * Leest de `##`- en `###`-koppen van de richtlijn met hun inhoud.
 * De inhoud loopt tot de volgende kop van gelijk of hoger niveau, dus een `##`-sectie bevat zijn `###`-secties.
 */
export function leesRichtlijn(tekst: string): RichtlijnSectie[] {
	const regels = tekst.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
	const secties: RichtlijnSectie[] = [];
	const openSecties: { sectie: RichtlijnSectie; inhoud: string[] }[] = [];
	let binnenCodeblok = false;

	for (const regel of regels) {
		if (CODEHEK.test(regel)) binnenCodeblok = !binnenCodeblok;
		const kop = binnenCodeblok ? null : KOP.exec(regel);
		const niveau = kop?.[1]?.length;

		if (kop?.[2] === undefined || niveau === undefined) {
			for (const { inhoud } of openSecties) inhoud.push(regel);
			continue;
		}

		const sluitVanaf = openSecties.findIndex(({ sectie }) => sectie.niveau >= niveau);
		if (sluitVanaf !== -1) sluitSecties(openSecties.splice(sluitVanaf));
		for (const { inhoud } of openSecties) inhoud.push(regel);
		if (!isSectieniveau(niveau)) continue;

		const sectie: RichtlijnSectie = { ...leesKop(kop[2]), niveau, markdown: '' };
		secties.push(sectie);
		openSecties.push({ sectie, inhoud: [] });
	}
	sluitSecties(openSecties);
	return secties;
}

function sluitSecties(gesloten: { sectie: RichtlijnSectie; inhoud: string[] }[]): void {
	for (const { sectie, inhoud } of gesloten) sectie.markdown = inhoud.join('\n').replace(/^\n+|\s+$/g, '');
}

function leesKop(kopTekst: string): { paragraaf: string; titel: string } {
	const nummer = PARAGRAAFNUMMER.exec(kopTekst);
	const zonderNummer = nummer?.[2] ?? kopTekst;
	return {
		paragraaf: nummer?.[1] ?? '',
		titel: zonderNummer.replace(VERSIEMARKERING, '').replace(/\s+/g, ' ').trim(),
	};
}
