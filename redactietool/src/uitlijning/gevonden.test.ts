import { describe, expect, it } from 'vitest';
import type { BronEnVereenvoudigd } from './lukasHoofdstukken.testhulp';
import { parseerHoofdstuk } from '../formaat/parseer';
import { verschillendVertaald, vindVertalingen, type Bronvorm } from './gevonden';

function hoofdstuk(nummer: number, bron: string, vereenvoudigd: string): BronEnVereenvoudigd {
	return { nummer, bron: parseerHoofdstuk(`# Lukas ${nummer}\n\n${bron}\n`), vereenvoudigd: parseerHoofdstuk(`# Lukas ${nummer}\n\n${vereenvoudigd}\n`) };
}

function vind(bronvormen: readonly Bronvorm[], bronvorm: string): Bronvorm {
	const gevonden = bronvormen.find((kandidaat) => kandidaat.bronvorm === bronvorm);
	if (gevonden === undefined) throw new Error(`bronvorm '${bronvorm}' niet gevonden`);
	return gevonden;
}

describe('vindVertalingen', () => {
	const hoofdstukken = [
		hoofdstuk(1, '[1] Zo sprak de Heere tot hem. [2] De Heere zweeg. [3] De discipelen kwamen.', '[1] Zo sprak de Heer tot hem. [2] De Heer zweeg. [3] De discipelen kwamen.'),
		hoofdstuk(2, '[1] Heere, kom. [2] De discipelen gingen.', '[1] De Heer, kom. [2] De discipelen gingen.'),
	];

	it('telt per bronvorm de vervangingen met aantallen en verzen, over hoofdstukken heen', () => {
		const heere = vind(vindVertalingen(hoofdstukken), 'heere');

		expect(heere.aantal).toBe(3);
		expect(heere.vertalingen.map((vertaling) => [vertaling.nieuw, vertaling.aantal, vertaling.gelijk])).toEqual([['heer', 3, false]]);
		expect(heere.vertalingen[0]?.verzen).toEqual([
			{ hoofdstuk: 1, vers: 1 },
			{ hoofdstuk: 1, vers: 2 },
			{ hoofdstuk: 2, vers: 1 },
		]);
	});

	it('bewaart een voorbeeld met hoofdletters en normaliseert op kleine letters', () => {
		const heere = vind(vindVertalingen(hoofdstukken), 'heere');

		expect(heere.voorbeeld).toBe('Heere');
		expect(heere.vertalingen[0]?.voorbeeld).toBe('Heer');
	});

	it('telt ook woorden die gelijk bleven', () => {
		const discipelen = vind(vindVertalingen(hoofdstukken), 'discipelen');

		expect(discipelen.aantal).toBe(2);
		expect(discipelen.vertalingen).toHaveLength(1);
		expect(discipelen.vertalingen[0]).toMatchObject({ nieuw: 'discipelen', gelijk: true, aantal: 2 });
	});

	it('telt een weggevallen woord als vertaling met een lege nieuwe vorm', () => {
		const resultaat = vindVertalingen([hoofdstuk(1, '[1] En de duivel zei dit.', '[1] De duivel zei dit.')]);

		expect(vind(resultaat, 'en').vertalingen).toMatchObject([{ nieuw: '', gelijk: false, aantal: 1 }]);
	});

	it('telt toegevoegde woorden niet als bronvorm', () => {
		const resultaat = vindVertalingen([hoofdstuk(1, '[1] Hij ging weg.', '[1] Hij ging snel weg.')]);

		expect(resultaat.map((bronvorm) => bronvorm.bronvorm)).not.toContain('snel');
	});

	it('koppelt een herschreven stuk dat te lang is niet aan een bronvorm', () => {
		const resultaat = vindVertalingen([hoofdstuk(1, '[1] Zij zagen eerst Hem.', '[1] Zij kregen daarna met zeer veel moeite een glimp van Hem te zien.')]);

		expect(resultaat.map((bronvorm) => bronvorm.bronvorm).filter((bronvorm) => bronvorm.includes('zagen'))).toEqual([]);
		expect(resultaat.map((bronvorm) => bronvorm.bronvorm)).toContain('zij');
	});

	it('zet de meest voorkomende bronvorm bovenaan', () => {
		const resultaat = vindVertalingen(hoofdstukken);

		const aantallen = resultaat.map((bronvorm) => bronvorm.aantal);
		expect(aantallen).toEqual([...aantallen].sort((a, b) => b - a));
		expect(resultaat[0]?.bronvorm).toBe('de');
	});
});

describe('verschillendVertaald', () => {
	it('geeft alleen bronvormen met meer dan één uitkomst', () => {
		const resultaat = verschillendVertaald(vindVertalingen([hoofdstuk(1, '[1] De menigte kwam. [2] De menigte bleef.', '[1] De groep kwam. [2] De groep bleef.')]));

		expect(resultaat).toEqual([]);
	});

	it('zet bovenaan wat het sterkst wisselt en onderaan wat bijna altijd gelijk bleef', () => {
		const bron = [
			'[1] De menigte kwam. [2] De menigte bleef. [3] De menigte ging. [4] De menigte sliep.',
			'[5] Hij zei dit. [6] Hij zei dat. [7] Hij zei niets. [8] Hij zei weinig. [9] Hij zei veel. [10] Hij zei alles.',
		].join(' ');
		const vereenvoudigd = [
			'[1] De groep kwam. [2] De groep bleef. [3] De mensen ging. [4] De mensen sliep.',
			'[5] Hij zei dit. [6] Hij zei dat. [7] Hij zei niets. [8] Hij zei weinig. [9] Hij zei veel. [10] Hij vertelde alles.',
		].join(' ');

		const resultaat = verschillendVertaald(vindVertalingen([hoofdstuk(1, bron, vereenvoudigd)]));

		expect(resultaat.map((bronvorm) => bronvorm.bronvorm)).toEqual(['menigte', 'zei']);
	});

	it('laat functiewoorden zoals "en" en "de" weg, ook als ze wisselen', () => {
		const resultaat = verschillendVertaald(vindVertalingen([hoofdstuk(1, '[1] En hij kwam. [2] En hij ging.', '[1] Hij kwam. [2] En hij ging.')]));

		expect(resultaat.map((bronvorm) => bronvorm.bronvorm)).not.toContain('en');
	});
});
