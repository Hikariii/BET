import type { WordStijl } from '../data/types';

const STIJLELEMENT = /<w:style\b([^>]*?)(?<!\/)>(.*?)<\/w:style>/gs;
const UIT_WAARDEN = new Set(['0', 'false', 'off']);
const XML_TEKENS: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function ontsnapteTekens(tekst: string): string {
	return tekst.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi, (_vondst, hex, decimaal, naam) =>
		naam ? XML_TEKENS[naam.toLowerCase()]! : String.fromCodePoint(hex ? parseInt(hex, 16) : parseInt(decimaal, 10)),
	);
}

function attribuut(attributen: string, naam: string): string | null {
	const vondst = new RegExp(`\\b${naam}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attributen);
	return vondst ? ontsnapteTekens(vondst[1] ?? vondst[2] ?? '') : null;
}

/** De attributen van het eerste element `<w:naam …/>` in de tekst, of null als het element ontbreekt. */
function element(tekst: string, naam: string): string | null {
	const vondst = new RegExp(`<w:${naam}(\\s[^>]*)?/?>`).exec(tekst);
	return vondst ? (vondst[1] ?? '') : null;
}

/** `<w:b/>` is aan; `w:val` met 0, false of off zet het uit. */
function schakelaarAan(tekens: string, naam: string): boolean {
	const attributen = element(tekens, naam);
	if (attributen === null) return false;
	const waarde = attribuut(attributen, 'w:val');
	return waarde === null || !UIT_WAARDEN.has(waarde.toLowerCase());
}

function kleur(tekens: string): string | null {
	const attributen = element(tekens, 'color');
	const waarde = attributen === null ? null : attribuut(attributen, 'w:val');
	return waarde !== null && /^[0-9a-f]{6}$/i.test(waarde) ? waarde.toUpperCase() : null;
}

/**
 * Leest de alinea- en tekenstijlen uit word/styles.xml van het Word-sjabloon (de XML als tekst).
 * Werkt zonder DOM, dus in Node en in de browser.
 * De opmaak is die van `w:rPr` van de stijl zelf; geërfde opmaak (`w:basedOn`) telt niet mee.
 */
export function leesStijlen(stylesXml: string): WordStijl[] {
	const stijlen: WordStijl[] = [];
	for (const vondst of stylesXml.matchAll(STIJLELEMENT)) {
		const attributen = vondst[1] ?? '';
		const inhoud = vondst[2] ?? '';
		const soort = attribuut(attributen, 'w:type');
		const id = attribuut(attributen, 'w:styleId');
		if ((soort !== 'paragraph' && soort !== 'character') || id === null) continue;

		const naamElement = element(inhoud, 'name');
		const naam = naamElement === null ? null : attribuut(naamElement, 'w:val');
		// Alinea-eigenschappen kunnen een eigen w:rPr hebben (voor het alineateken); dat is niet de tekenopmaak.
		const zonderAlineaEigenschappen = inhoud.replace(/<w:pPr>.*?<\/w:pPr>/gs, '');
		const tekens = /<w:rPr>(.*?)<\/w:rPr>/s.exec(zonderAlineaEigenschappen)?.[1] ?? '';
		stijlen.push({
			id,
			naam: naam ?? id,
			soort: soort === 'paragraph' ? 'alinea' : 'teken',
			kleur: kleur(tekens),
			vet: schakelaarAan(tekens, 'b'),
			cursief: schakelaarAan(tekens, 'i'),
		});
	}
	return stijlen;
}
