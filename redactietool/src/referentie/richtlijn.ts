import type { Markering, MarkeringSoort, Richtlijn, RichtlijnSectie } from '../data/types';

type Niveau = RichtlijnSectie['niveau'];

/** Een sectie in opbouw: `eigenLengte` is het aantal inhoudsregels tot de eerste subsectie, zodra die er is. */
type OpenSectie = { sectie: RichtlijnSectie; inhoud: string[]; eigenLengte: number | null };

const KOP = /^(#{1,6}) (.*?)\s*$/;
const PARAGRAAFNUMMER = /^(\d+[A-Z]?)\.\s+(.*)$/;
const VERSIEMARKERING = /\*{0,2}\[v(\d+(?:\.\d+)*)([^\]]*)\]\*{0,2}/g;
const SCHEIDINGSLIJN_ACHTERAAN = /\n+-{3,}\s*$/;
const CODEHEK = /^\s*(```|~~~)/;
const MARKERINGSOORTEN: readonly MarkeringSoort[] = ['nieuw', 'gewijzigd', 'open'];

function isSectieniveau(aantalHekjes: number): aantalHekjes is Niveau {
	return aantalHekjes === 2 || aantalHekjes === 3;
}

function isMarkeringsoort(tekst: string): tekst is MarkeringSoort {
	return (MARKERINGSOORTEN as readonly string[]).includes(tekst);
}

/**
 * Leest de titel (de eerste kop van niveau 1) en de `##`- en `###`-koppen van de richtlijn met hun inhoud.
 * De inhoud loopt tot de volgende kop van gelijk of hoger niveau, dus een `##`-sectie bevat zijn `###`-secties.
 */
export function leesRichtlijn(tekst: string): Richtlijn {
	const regels = tekst.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
	const secties: RichtlijnSectie[] = [];
	const openSecties: OpenSectie[] = [];
	let titel = '';
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
		if (niveau === 1 && titel === '') titel = kop[2];
		if (isSectieniveau(niveau)) {
			for (const open of openSecties) open.eigenLengte ??= open.inhoud.length;
		}
		for (const { inhoud } of openSecties) inhoud.push(regel);
		if (!isSectieniveau(niveau)) continue;

		const sectie: RichtlijnSectie = { ...leesKop(kop[2]), niveau, markdown: '', eigenMarkdown: '' };
		secties.push(sectie);
		openSecties.push({ sectie, inhoud: [], eigenLengte: null });
	}
	sluitSecties(openSecties);
	return { titel, secties };
}

function sluitSecties(gesloten: OpenSectie[]): void {
	for (const { sectie, inhoud, eigenLengte } of gesloten) {
		sectie.markdown = knipInhoud(inhoud);
		sectie.eigenMarkdown = knipInhoud(inhoud.slice(0, eigenLengte ?? inhoud.length));
	}
}

/** De inhoud zonder witregels aan de randen en zonder de scheidingslijn (`---`) die een sectie afsluit. */
function knipInhoud(regels: readonly string[]): string {
	return regels
		.join('\n')
		.replace(/^\n+|\s+$/g, '')
		.replace(SCHEIDINGSLIJN_ACHTERAAN, '')
		.replace(/\s+$/, '');
}

function leesKop(kopTekst: string): Pick<RichtlijnSectie, 'paragraaf' | 'titel' | 'markering'> {
	const nummer = PARAGRAAFNUMMER.exec(kopTekst);
	const zonderNummer = nummer?.[2] ?? kopTekst;
	return {
		paragraaf: nummer?.[1] ?? '',
		titel: zonderNummer.replace(VERSIEMARKERING, '').replace(/\s+/g, ' ').trim(),
		markering: leesMarkering(zonderNummer),
	};
}

function leesMarkering(kopTekst: string): Markering | null {
	for (const [, versie, soort] of kopTekst.matchAll(VERSIEMARKERING)) {
		const trimmed = soort?.trim() ?? '';
		if (versie !== undefined && isMarkeringsoort(trimmed)) return { versie, soort: trimmed };
	}
	return null;
}
