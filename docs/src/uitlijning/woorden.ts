export type Token = {
	soort: 'woord' | 'leesteken';
	/** Zoals in de tekst, met hoofdletters. */
	tekst: string;
	/** Kleine letters en rechte apostrof: waarop woorden vergeleken worden. */
	vergelijkvorm: string;
};

const WOORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/uy;

function vergelijkvorm(woord: string): string {
	return woord.normalize('NFC').toLowerCase().replaceAll('’', "'");
}

/** Splitst in woorden en losse leestekens (ook aanhalingstekens). Een apostrof of koppelteken midden in een woord ("zo'n", "Beth-Lehem") blijft bij het woord. */
export function tokeniseer(tekst: string): Token[] {
	const tokens: Token[] = [];
	let positie = 0;
	while (positie < tekst.length) {
		WOORD.lastIndex = positie;
		const woord = WOORD.exec(tekst);
		if (woord !== null) {
			tokens.push({ soort: 'woord', tekst: woord[0], vergelijkvorm: vergelijkvorm(woord[0]) });
			positie += woord[0].length;
			continue;
		}
		const teken = String.fromCodePoint(tekst.codePointAt(positie) ?? 0);
		if (teken.trim() !== '') tokens.push({ soort: 'leesteken', tekst: teken, vergelijkvorm: teken });
		positie += teken.length;
	}
	return tokens;
}

/** De woorden van een tekst, zonder leestekens. */
export function woordenVan(tekst: string): Token[] {
	return tokeniseer(tekst).filter((token) => token.soort === 'woord');
}
