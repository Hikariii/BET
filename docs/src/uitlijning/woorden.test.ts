import { describe, expect, it } from 'vitest';
import { tokeniseer, woordenVan } from './woorden';

describe('tokeniseer', () => {
	it('zet leestekens en aanhalingstekens apart en bewaart hoofdletters', () => {
		const tokens = tokeniseer('Hij zei: “Kom!”');

		expect(tokens.map((token) => `${token.soort}:${token.tekst}`)).toEqual([
			'woord:Hij',
			'woord:zei',
			'leesteken::',
			'leesteken:“',
			'woord:Kom',
			'leesteken:!',
			'leesteken:”',
		]);
	});

	it('vergelijkt zonder hoofdletters', () => {
		expect(woordenVan('De HEERE Zoon').map((woord) => woord.vergelijkvorm)).toEqual(['de', 'heere', 'zoon']);
	});

	it('houdt een apostrof of koppelteken midden in een woord bij het woord, ook met een gekrulde apostrof', () => {
		expect(woordenVan('zo’n Beth-Lehem morgens').map((woord) => woord.vergelijkvorm)).toEqual(["zo'n", 'beth-lehem', 'morgens']);
	});

	it('laat een sluitend enkel aanhalingsteken na een woord los', () => {
		const tokens = tokeniseer('‘Je zult de Heer’');

		expect(tokens.map((token) => token.tekst)).toEqual(['‘', 'Je', 'zult', 'de', 'Heer', '’']);
	});

	it('geeft een lege lijst voor een tekst van alleen witruimte', () => {
		expect(tokeniseer('  ')).toEqual([]);
	});
});
