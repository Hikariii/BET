import type { WordStijl } from '../data/types';
import type { Hoofdstuk } from '../formaat/types';
import { naarPlatteTekst, naarWordHtml } from './naarWordHtml';

/** Wat een `copy`-gebeurtenis van de browser aan de handler laat zien; een deel van `ClipboardEvent`. */
export type KopieerGebeurtenis = {
	clipboardData: { setData(formaat: string, gegevens: string): void } | null;
	preventDefault(): void;
};

export type KlembordInhoud = {
	html: string;
	tekst: string;
};

export function maakKlembordInhoud(hoofdstukken: readonly Hoofdstuk[], stijlen: readonly WordStijl[]): KlembordInhoud {
	return { html: naarWordHtml(hoofdstukken, stijlen), tekst: naarPlatteTekst(hoofdstukken) };
}

/**
 * De eigen copy-handler: zet de Word-HTML en de platte tekst op het klembord in plaats van de standaardkopie.
 * De standaardkopie van de browser laat de stijlnamen weg, waardoor Word de stijlen niet herkent.
 * Een knop start de kopie met `document.execCommand('copy')` (in Chromium is geen selectie nodig);
 * een andere manier om een `copy`-gebeurtenis te laten afgaan bestaat niet.
 */
export function vulKopieerGebeurtenis(gebeurtenis: KopieerGebeurtenis, inhoud: KlembordInhoud): void {
	if (gebeurtenis.clipboardData === null) throw new Error('de copy-gebeurtenis heeft geen clipboardData');
	gebeurtenis.clipboardData.setData('text/html', inhoud.html);
	gebeurtenis.clipboardData.setData('text/plain', inhoud.tekst);
	gebeurtenis.preventDefault();
}
