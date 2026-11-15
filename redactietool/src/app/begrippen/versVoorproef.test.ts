import { describe, expect, it } from 'vitest';
import type { Tussenstand, VersInhoud } from '../../bewerken/types';
import type { HoofdstukData } from '../../data/types';
import type { Hoofdstuk } from '../../formaat/types';
import { zoekVersVoorproef } from './versVoorproef';

const GEEN_TUSSENSTAND: Tussenstand = { verzen: {} };

function tekst(inhoud: string) {
	return { soort: 'tekst', tekst: inhoud, opmaak: [] } as const;
}

function hoofdstuk(...verzen: [number, string][]): Hoofdstuk {
	return {
		alineas: [{ soort: 'tekst', stijl: null, stukken: verzen.flatMap(([nummer, inhoud]) => [{ soort: 'vers', nummer } as const, tekst(inhoud)]) }],
	};
}

function inhoud(tekstInhoud: string): VersInhoud {
	return { delen: [{ stijl: null, stukken: [tekst(tekstInhoud)] }] };
}

const HOOFDSTUKKEN: HoofdstukData[] = [
	{
		nummer: 4,
		bron: hoofdstuk([1, ' Bron een.'], [2, ' Bron twee.']),
		vereenvoudigd: hoofdstuk([1, ' Eenvoudig een.'], [2, ' Eenvoudig twee.']),
		log: { verzen: [], algemeneVragen: [] },
	},
];

describe('zoekVersVoorproef', () => {
	it('geeft de vereenvoudiging en de bron van het gevraagde vers', () => {
		expect(zoekVersVoorproef(HOOFDSTUKKEN, () => GEEN_TUSSENSTAND, 4, 2)).toEqual({
			hoofdstuk: 4,
			vers: 2,
			vereenvoudigd: inhoud(' Eenvoudig twee.'),
			bron: inhoud(' Bron twee.'),
			bewerkt: false,
		});
	});

	it('toont de bewerking uit de tussenstand van dat hoofdstuk, met de bron uit de repo', () => {
		const tussenstand: Tussenstand = {
			verzen: { 2: { inhoud: inhoud(' Zelf getypt.'), basis: inhoud(' Eenvoudig twee.'), bewaard: '2026-11-15T10:00:00.000Z' } },
		};
		const gevraagd: number[] = [];

		const voorproef = zoekVersVoorproef(HOOFDSTUKKEN, (nummer) => (gevraagd.push(nummer), tussenstand), 4, 2);

		expect(gevraagd).toEqual([4]);
		expect(voorproef).toMatchObject({ vereenvoudigd: inhoud(' Zelf getypt.'), bron: inhoud(' Bron twee.'), bewerkt: true });
	});

	it('geeft null voor een vers of hoofdstuk dat niet bestaat', () => {
		expect(zoekVersVoorproef(HOOFDSTUKKEN, () => GEEN_TUSSENSTAND, 4, 9)).toBeNull();
		expect(zoekVersVoorproef(HOOFDSTUKKEN, () => GEEN_TUSSENSTAND, 5, 1)).toBeNull();
	});
});
