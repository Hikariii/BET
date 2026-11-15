import { ALINEASTIJL_NAAR_WORD, DOMEIN_NAAR_WORD, HIGHLIGHT_KLEUR, ONDERWIJS_KLEUR, TITEL_WORD } from '../data/stijlkoppeling';
import type { WordStijl } from '../data/types';
import {
	ALINEASTIJLEN,
	DOMEINEN,
	type Alinea,
	type Domein,
	type Hoofdstuk,
	type Inlinestuk,
	type Opmaak,
	type Tekstalinea,
} from '../formaat/types';

const GEEN_ALINEASTIJL = 'MsoNormal';
const LEGE_ALINEA = '&nbsp;';
/** Word laat een lege alinea met een rand erboven zien als sectiescheiding. */
const RAND_SECTIESCHEIDING = 'border-top:solid windowtext 1.0pt;padding-top:1.0pt';

const WORD_HTML_BEGIN =
	'<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
	'<head><meta charset="utf-8"><meta name="ProgId" content="Word.Document"><meta name="Generator" content="Microsoft Word 15">';

function escapeTekst(tekst: string): string {
	return tekst.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribuutTekst(tekst: string): string {
	return escapeTekst(tekst).replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
}

function opmaakAlsCss(stijl: WordStijl): string {
	return [
		stijl.kleur === null ? null : `color:#${stijl.kleur}`,
		stijl.vet ? 'font-weight:bold' : null,
		stijl.cursief ? 'font-style:italic' : null,
	]
		.filter((deel) => deel !== null)
		.join(';');
}

function cssTekst(waarde: string): string {
	return waarde.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function eersteDomein(opmaak: readonly Opmaak[]): Domein | null {
	return opmaak.find((soort): soort is Domein => (DOMEINEN as readonly string[]).includes(soort)) ?? null;
}

/**
 * Zet hoofdstukken om naar HTML zoals Word die zelf op het klembord zet.
 * Elke stijl is een klasse met `mso-style-name` (de weergavenaam uit het sjabloon) in een `<style>`-blok;
 * Word koppelt geplakte tekst daarop aan de bestaande stijlen van het document.
 */
class WordHtmlMaker {
	private readonly stijlPerId: ReadonlyMap<string, WordStijl>;

	constructor(stijlen: readonly WordStijl[]) {
		this.stijlPerId = new Map(stijlen.map((stijl) => [stijl.id, stijl]));
	}

	maak(hoofdstukken: readonly Hoofdstuk[]): string {
		const gebruikteStijlen = [
			...ALINEASTIJLEN.map((alineastijl) => ALINEASTIJL_NAAR_WORD[alineastijl]),
			...DOMEINEN.map((domein) => DOMEIN_NAAR_WORD[domein]),
			TITEL_WORD,
		];
		const stijlblok = gebruikteStijlen.map((id) => this.stijlregel(this.stijl(id))).join('\n');
		const lichaam = this.hoofdstukkenAlsAlineas(hoofdstukken).join('');
		return `${WORD_HTML_BEGIN}<style>\n${stijlblok}\n</style></head><body lang="NL"><!--StartFragment-->${lichaam}<!--EndFragment--></body></html>`;
	}

	private stijl(id: string): WordStijl {
		const stijl = this.stijlPerId.get(id);
		if (stijl === undefined) throw new Error(`stijl "${id}" staat niet in het Word-sjabloon`);
		return stijl;
	}

	private stijlregel(stijl: WordStijl): string {
		const kiezer = stijl.soort === 'alinea' ? `p.${stijl.id}, li.${stijl.id}, div.${stijl.id}` : `span.${stijl.id}`;
		return `${kiezer} {mso-style-name:"${cssTekst(stijl.naam)}"; mso-style-unhide:no; mso-style-qformat:yes; ${opmaakAlsCss(stijl)}}`;
	}

	private hoofdstukkenAlsAlineas(hoofdstukken: readonly Hoofdstuk[]): string[] {
		const uit: string[] = [];
		for (const hoofdstuk of hoofdstukken) {
			const vorige = uit.at(-1);
			// Tussen twee hoofdstukken staat een lege alinea, behalve als het vorige hoofdstuk al op een lege regel eindigt.
			if (vorige !== undefined && !vorige.endsWith(`>${LEGE_ALINEA}</p>`)) uit.push(this.alinea('', null));
			uit.push(...this.hoofdstukAlsAlineas(hoofdstuk.alineas));
		}
		return uit;
	}

	/** Opbouw van het Word-bestand: de titel staat inline in de eerste alinea en lege regels worden lege alinea's. */
	private hoofdstukAlsAlineas(alineas: readonly Alinea[]): string[] {
		const uit: string[] = [];
		let index = 0;
		while (index < alineas.length) {
			const alinea = alineas[index]!;
			if (alinea.soort === 'leeg') {
				const aantal = this.aantalLegeRegels(alineas, index);
				// Eén lege regel is één lege alinea; meer is een sectiescheiding: lege alinea's en dan een met rand erboven.
				if (aantal === 1) {
					uit.push(this.alinea('', null));
				} else {
					uit.push(...Array.from({ length: aantal - 1 }, () => this.alinea('', null)));
					uit.push(this.sectiescheiding());
				}
				index += aantal;
			} else if (alinea.soort === 'titel') {
				const titel = this.titel(alinea.tekst);
				const volgende = this.volgendeAlineaNaLegeRegels(alineas, index + 1);
				if (volgende !== null && volgende.alinea.soort === 'tekst' && volgende.alinea.stijl === null) {
					uit.push(this.alinea(`${titel} ${this.stukken(volgende.alinea)}`, null));
					index = volgende.index + 1;
				} else {
					uit.push(this.alinea(titel, null));
					index += 1;
				}
			} else {
				const stijl = alinea.stijl === null ? null : ALINEASTIJL_NAAR_WORD[alinea.stijl];
				uit.push(this.alinea(this.stukken(alinea), stijl));
				index += 1;
			}
		}
		return uit;
	}

	private aantalLegeRegels(alineas: readonly Alinea[], begin: number): number {
		let aantal = 0;
		while (alineas[begin + aantal]?.soort === 'leeg') aantal += 1;
		return aantal;
	}

	private volgendeAlineaNaLegeRegels(alineas: readonly Alinea[], begin: number): { alinea: Alinea; index: number } | null {
		const index = begin + this.aantalLegeRegels(alineas, begin);
		const alinea = alineas[index];
		return alinea === undefined ? null : { alinea, index };
	}

	private alinea(inhoud: string, alineastijl: string | null): string {
		return `<p class="${alineastijl ?? GEEN_ALINEASTIJL}">${inhoud === '' ? LEGE_ALINEA : inhoud}</p>`;
	}

	private sectiescheiding(): string {
		return `<p class="${GEEN_ALINEASTIJL}" style="${RAND_SECTIESCHEIDING}">${LEGE_ALINEA}</p>`;
	}

	private titel(tekst: string): string {
		return `<span class="${TITEL_WORD}">${escapeAttribuutTekst(tekst)}</span>`;
	}

	private stukken(alinea: Tekstalinea): string {
		return alinea.stukken.map((stuk) => this.stuk(stuk)).join('');
	}

	private stuk(stuk: Inlinestuk): string {
		if (stuk.soort === 'vers') return `<sup>${stuk.nummer}</sup>`;

		let html = escapeTekst(stuk.tekst);
		const domein = eersteDomein(stuk.opmaak);
		if (domein !== null) html = `<span class="${DOMEIN_NAAR_WORD[domein]}">${html}</span>`;
		if (stuk.opmaak.includes('cursief')) html = `<i>${html}</i>`;
		if (stuk.opmaak.includes('vet')) html = `<b>${html}</b>`;
		if (stuk.opmaak.includes('onderstreept')) html = `<u>${html}</u>`;
		if (stuk.opmaak.includes('onderwijs')) html = `<span style="color:#${ONDERWIJS_KLEUR}">${html}</span>`;
		if (stuk.opmaak.includes('highlight')) {
			html = `<span style="background:${HIGHLIGHT_KLEUR};mso-highlight:${HIGHLIGHT_KLEUR}">${html}</span>`;
		}
		return html;
	}
}

/** HTML voor het klembord, zie `WordHtmlMaker`. Gooit een fout als een stijl uit `FORMAAT.md` niet in `stijlen` staat. */
export function naarWordHtml(hoofdstukken: readonly Hoofdstuk[], stijlen: readonly WordStijl[]): string {
	return new WordHtmlMaker(stijlen).maak(hoofdstukken);
}

/** Terugval voor programma's die geen HTML plakken: één regel per alinea, zonder opmaak. */
export function naarPlatteTekst(hoofdstukken: readonly Hoofdstuk[]): string {
	return hoofdstukken
		.flatMap((hoofdstuk) => hoofdstuk.alineas)
		.map((alinea) => {
			switch (alinea.soort) {
				case 'titel':
					return alinea.tekst;
				case 'leeg':
					return '';
				case 'tekst':
					return alinea.stukken.map((stuk) => (stuk.soort === 'vers' ? String(stuk.nummer) : stuk.tekst)).join('');
			}
		})
		.join('\n');
}
