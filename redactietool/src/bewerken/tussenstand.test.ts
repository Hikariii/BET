import { describe, expect, it } from 'vitest';
import type { Hoofdstuk, Tekstalinea } from '../formaat/types';
import { bewaarVers, isVerouderd, leesTussenstand, pasTussenstandToe, wisVers } from './tussenstand';
import type { Opslag } from './tussenstand';
import type { Tussenstand, VersInhoud } from './types';
import { knipVers } from './versknip';

const SLEUTEL = 'bet-tussenstand/lukas/3';

class GeheugenOpslag implements Opslag {
	readonly items = new Map<string, string>();
	getItem(sleutel: string): string | null {
		return this.items.get(sleutel) ?? null;
	}
	setItem(sleutel: string, waarde: string): void {
		this.items.set(sleutel, waarde);
	}
	removeItem(sleutel: string): void {
		this.items.delete(sleutel);
	}
}

class VolleOpslag extends GeheugenOpslag {
	override setItem(): void {
		throw new DOMException('De opslag is vol', 'QuotaExceededError');
	}
}

function inhoud(tekst: string, opmaak: 'genade' | null = null): VersInhoud {
	return {
		delen: [
			{
				stijl: null,
				stukken: [{ soort: 'tekst', tekst, opmaak: opmaak === null ? [] : [opmaak] }],
			},
		],
	};
}

describe('leesTussenstand', () => {
	it('is leeg als er niets bewaard is', () => {
		expect(leesTussenstand(new GeheugenOpslag(), 'lukas', 3)).toEqual({
			verzen: {},
		});
	});

	it('geeft terug wat bewaarVers bewaarde', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 3, 2, inhoud(' nieuw'), inhoud(' oud'));
		const tussenstand = leesTussenstand(opslag, 'lukas', 3);
		expect(Object.keys(tussenstand.verzen)).toEqual(['2']);
		expect(tussenstand.verzen[2]?.inhoud).toEqual(inhoud(' nieuw'));
		expect(tussenstand.verzen[2]?.basis).toEqual(inhoud(' oud'));
		expect(Number.isNaN(Date.parse(tussenstand.verzen[2]?.bewaard ?? ''))).toBe(false);
	});

	it('houdt boeken en hoofdstukken gescheiden', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 3, 2, inhoud(' nieuw'), inhoud(' oud'));
		expect(leesTussenstand(opslag, 'lukas', 4).verzen).toEqual({});
		expect(leesTussenstand(opslag, 'johannes', 3).verzen).toEqual({});
	});

	it.each([
		['geen JSON', '{dit is geen json'],
		['JSON van een andere vorm', '[1, 2, 3]'],
		['een object zonder verzen', '{"iets": 1}'],
		['verzen die geen object zijn', '{"verzen": "tekst"}'],
	])('geeft een lege tussenstand bij %s', (_naam, tekst) => {
		const opslag = new GeheugenOpslag();
		opslag.setItem(SLEUTEL, tekst);
		expect(leesTussenstand(opslag, 'lukas', 3)).toEqual({ verzen: {} });
	});

	it('laat een vers met een onbruikbare vorm weg en houdt de andere', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 3, 2, inhoud(' goed'), inhoud(' oud'));
		const bewaard = JSON.parse(opslag.getItem(SLEUTEL) ?? '') as {
			verzen: Record<string, unknown>;
		};
		bewaard.verzen['5'] = { inhoud: 'kapot', basis: 1, bewaard: 3 };
		bewaard.verzen['x'] = bewaard.verzen['2'];
		opslag.setItem(SLEUTEL, JSON.stringify(bewaard));
		expect(Object.keys(leesTussenstand(opslag, 'lukas', 3).verzen)).toEqual(['2']);
	});

	it('is leeg als de opslag zelf een fout geeft', () => {
		const kapot: Opslag = {
			getItem() {
				throw new DOMException('Geen toegang', 'SecurityError');
			},
			setItem() {},
			removeItem() {},
		};
		expect(leesTussenstand(kapot, 'lukas', 3)).toEqual({ verzen: {} });
	});
});

describe('bewaarVers', () => {
	it('bewaart meerdere verzen naast elkaar en overschrijft een vers dat opnieuw bewaard wordt', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 3, 1, inhoud(' een'), inhoud(' oud een'));
		bewaarVers(opslag, 'lukas', 3, 2, inhoud(' twee'), inhoud(' oud twee'));
		bewaarVers(opslag, 'lukas', 3, 1, inhoud(' een, anders'), inhoud(' oud een'));
		const tussenstand = leesTussenstand(opslag, 'lukas', 3);
		expect(Object.keys(tussenstand.verzen)).toEqual(['1', '2']);
		expect(tussenstand.verzen[1]?.inhoud).toEqual(inhoud(' een, anders'));
		expect(tussenstand.verzen[2]?.inhoud).toEqual(inhoud(' twee'));
	});

	it('bewaart de opmaak van de stukken', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 3, 1, inhoud('genade', 'genade'), inhoud(' oud'));
		expect(leesTussenstand(opslag, 'lukas', 3).verzen[1]?.inhoud).toEqual(inhoud('genade', 'genade'));
	});

	it('overschrijft onleesbare inhoud van een eerdere keer', () => {
		const opslag = new GeheugenOpslag();
		opslag.setItem(SLEUTEL, 'rommel');
		expect(bewaarVers(opslag, 'lukas', 3, 1, inhoud(' een'), inhoud(' oud'))).toEqual({ gelukt: true });
		expect(Object.keys(leesTussenstand(opslag, 'lukas', 3).verzen)).toEqual(['1']);
	});

	it('meldt in het Nederlands dat de opslag vol is, zonder te crashen', () => {
		const uitkomst = bewaarVers(new VolleOpslag(), 'lukas', 3, 7, inhoud(' een'), inhoud(' oud'));
		expect(uitkomst).toEqual({
			gelukt: false,
			melding: expect.stringContaining('Vers 7 kon niet in de browser worden bewaard'),
		});
	});
});

describe('wisVers', () => {
	it('haalt één vers weg en laat de andere staan', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 3, 1, inhoud(' een'), inhoud(' oud een'));
		bewaarVers(opslag, 'lukas', 3, 2, inhoud(' twee'), inhoud(' oud twee'));
		wisVers(opslag, 'lukas', 3, 1);
		expect(Object.keys(leesTussenstand(opslag, 'lukas', 3).verzen)).toEqual(['2']);
	});

	it('ruimt de sleutel op als het laatste vers weg is', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 3, 1, inhoud(' een'), inhoud(' oud een'));
		wisVers(opslag, 'lukas', 3, 1);
		expect(opslag.items.size).toBe(0);
	});

	it('doet niets met een vers dat niet bewaard is', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 3, 1, inhoud(' een'), inhoud(' oud een'));
		const voor = opslag.getItem(SLEUTEL);
		wisVers(opslag, 'lukas', 3, 9);
		expect(opslag.getItem(SLEUTEL)).toBe(voor);
	});
});

describe('isVerouderd', () => {
	const basis = inhoud(' In het begin', 'genade');

	it('is niet verouderd als de repo gelijk is aan de basis', () => {
		expect(isVerouderd(inhoud(' In het begin', 'genade'), basis)).toBe(false);
	});

	it('is niet verouderd als alleen de verdeling in stukken anders is', () => {
		const verdeeld: VersInhoud = {
			delen: [
				{
					stijl: null,
					stukken: [
						{ soort: 'tekst', tekst: ' In het', opmaak: ['genade'] },
						{ soort: 'tekst', tekst: '', opmaak: [] },
						{ soort: 'tekst', tekst: ' begin', opmaak: ['genade'] },
					],
				},
			],
		};
		expect(isVerouderd(verdeeld, basis)).toBe(false);
	});

	it('is verouderd als de tekst anders is', () => {
		expect(isVerouderd(inhoud(' In het eind', 'genade'), basis)).toBe(true);
	});

	it('is verouderd als de opmaak anders is', () => {
		expect(isVerouderd(inhoud(' In het begin', null), basis)).toBe(true);
	});

	it('is verouderd als de alineastijl anders is', () => {
		const [deel] = basis.delen;
		expect(deel).toBeDefined();
		expect(isVerouderd({ delen: [{ stijl: 'jezus', stukken: deel?.stukken ?? [] }] }, basis)).toBe(true);
	});

	it('is verouderd als het aantal delen anders is', () => {
		expect(isVerouderd({ delen: [...basis.delen, ...basis.delen] }, basis)).toBe(true);
	});
});

function tekstalinea(...stukken: Tekstalinea['stukken']): Tekstalinea {
	return { soort: 'tekst', stijl: null, stukken };
}

function kleinHoofdstuk(): Hoofdstuk {
	return {
		alineas: [
			{ soort: 'titel', tekst: 'Lukas 3' },
			{ soort: 'leeg' },
			tekstalinea(
				{ soort: 'vers', nummer: 1 },
				{ soort: 'tekst', tekst: ' eerste vers ', opmaak: [] },
				{ soort: 'vers', nummer: 2 },
				{ soort: 'tekst', tekst: ' tweede vers', opmaak: [] },
			),
			tekstalinea(
				{ soort: 'tekst', tekst: ' en verder', opmaak: [] },
				{ soort: 'vers', nummer: 3 },
				{ soort: 'tekst', tekst: ' derde', opmaak: [] },
			),
		],
	};
}

function tussenstandMet(verzen: Record<number, VersInhoud>): Tussenstand {
	return {
		verzen: Object.fromEntries(
			Object.entries(verzen).map(([nummer, bewerkt]) => [
				nummer,
				{
					inhoud: bewerkt,
					basis: inhoud(''),
					bewaard: '2026-11-15T16:00:00.000Z',
				},
			]),
		),
	};
}

describe('pasTussenstandToe', () => {
	it('laat het hoofdstuk gelijk bij een lege tussenstand', () => {
		const hoofdstuk = kleinHoofdstuk();
		expect(pasTussenstandToe(hoofdstuk, { verzen: {} })).toEqual(kleinHoofdstuk());
	});

	describe('met de verzen uit het hoofdstuk', () => {
		it('zet een bewerkt vers in het hoofdstuk en laat de rest gelijk', () => {
			const hoofdstuk = kleinHoofdstuk();
			const nieuw = pasTussenstandToe(hoofdstuk, tussenstandMet({ 3: inhoud(' aangepast', 'genade') }));
			expect(knipVers(hoofdstuk, 3)).toEqual(inhoud(' derde'));
			expect(knipVers(nieuw, 3)).toEqual(inhoud(' aangepast', 'genade'));
			expect(knipVers(nieuw, 1)).toEqual(knipVers(hoofdstuk, 1));
			expect(knipVers(nieuw, 2)).toEqual(knipVers(hoofdstuk, 2));
		});

		it('slaat een vers over dat niet in het hoofdstuk staat en past de andere toe', () => {
			const nieuw = pasTussenstandToe(
				kleinHoofdstuk(),
				tussenstandMet({
					9: inhoud(' bestaat niet'),
					3: inhoud(' aangepast'),
				}),
			);
			expect(knipVers(nieuw, 3)).toEqual(inhoud(' aangepast'));
			expect(knipVers(nieuw, 9)).toBeNull();
		});

		it('slaat een vers over met een ander aantal delen', () => {
			const hoofdstuk = kleinHoofdstuk();
			expect(knipVers(hoofdstuk, 2)?.delen).toHaveLength(2);
			const nieuw = pasTussenstandToe(hoofdstuk, tussenstandMet({ 2: inhoud(' maar een deel') }));
			expect(nieuw).toEqual(hoofdstuk);
		});
	});
});
