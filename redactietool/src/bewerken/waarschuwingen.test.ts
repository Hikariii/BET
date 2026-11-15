import { describe, expect, it } from 'vitest';
import type { Alineastijl, Opmaak } from '../formaat/types';
import type { VersInhoud } from './types';
import { waarschuwingenVoorVers } from './waarschuwingen';

function vers(stijl: Alineastijl | null, ...stukken: [string, ...Opmaak[]][]): VersInhoud {
	return {
		delen: [
			{
				stijl,
				stukken: stukken.map(([tekst, ...opmaak]) => ({
					soort: 'tekst',
					tekst,
					opmaak,
				})),
			},
		],
	};
}

describe('waarschuwingenVoorVers', () => {
	it('geeft niets als de opmaak uit de bron er nog staat', () => {
		const bron = vers('jezus', [' Door ', 'vet'], ['genade', 'cursief', 'genade']);
		const bewerkt = vers('jezus', [' Met ', 'vet'], ['genade', 'cursief', 'genade'], [' erbij']);
		expect(waarschuwingenVoorVers(bron, bewerkt)).toEqual([]);
	});

	it('waarschuwt als een domein uit de bron weg is', () => {
		const bron = vers(null, [' Door '], ['genade', 'genade'], [' bent u gered']);
		const bewerkt = vers(null, [' Door goedheid bent u gered']);
		expect(waarschuwingenVoorVers(bron, bewerkt)).toEqual([
			{
				soort: 'opmaak-weg',
				opmaak: 'genade',
				tekst: 'De markering genade uit de bron staat niet meer in dit vers.',
			},
		]);
	});

	it('waarschuwt als de alineastijl weg is', () => {
		const bron = vers('jezus', [' Volg mij']);
		const bewerkt = vers(null, [' Volg mij']);
		expect(waarschuwingenVoorVers(bron, bewerkt)).toEqual([
			{
				soort: 'opmaak-weg',
				opmaak: 'jezus',
				tekst: 'De alineastijl jezus uit de bron staat niet meer in dit vers.',
			},
		]);
	});

	it('waarschuwt per opmaaksoort die weg is, ook voor highlight, onderstreept, vet, cursief en onderwijs', () => {
		const bron = vers(null, ['a', 'highlight'], ['b', 'onderstreept'], ['c', 'vet'], ['d', 'cursief'], ['e', 'onderwijs'], ['f', 'geloof']);
		const bewerkt = vers(null, ['abcdef', 'geloof']);
		expect(waarschuwingenVoorVers(bron, bewerkt).map((waarschuwing) => waarschuwing.opmaak)).toEqual([
			'onderwijs',
			'highlight',
			'onderstreept',
			'vet',
			'cursief',
		]);
	});

	it('telt alleen de aanwezigheid in het vers: minder keren is geen waarschuwing', () => {
		const bron = vers(null, ['een', 'vet'], [' en '], ['twee', 'vet']);
		const bewerkt = vers(null, ['een en twee', 'vet']);
		expect(waarschuwingenVoorVers(bron, bewerkt)).toEqual([]);
	});

	it('geeft geen waarschuwing voor opmaak die het bewerkte vers erbij heeft', () => {
		const bron = vers(null, [' kaal']);
		const bewerkt = vers(null, [' met ', 'vet'], ['genade', 'genade']);
		expect(waarschuwingenVoorVers(bron, bewerkt)).toEqual([]);
	});

	it('beschouwt opmaak om een leeg stuk als weg', () => {
		const bron = vers(null, ['genade', 'genade']);
		const bewerkt = vers(null, ['', 'genade'], ['tekst zonder markering']);
		expect(waarschuwingenVoorVers(bron, bewerkt).map((waarschuwing) => waarschuwing.opmaak)).toEqual(['genade']);
	});

	it('kijkt over alle delen van het vers', () => {
		const bron: VersInhoud = {
			delen: [
				{
					stijl: null,
					stukken: [{ soort: 'tekst', tekst: ' eerste', opmaak: [] }],
				},
				{
					stijl: 'god',
					stukken: [{ soort: 'tekst', tekst: 'tweede', opmaak: ['zonde'] }],
				},
			],
		};
		const bewerkt: VersInhoud = {
			delen: [
				{
					stijl: null,
					stukken: [{ soort: 'tekst', tekst: ' eerste', opmaak: ['zonde'] }],
				},
				{
					stijl: 'god',
					stukken: [{ soort: 'tekst', tekst: 'tweede', opmaak: [] }],
				},
			],
		};
		expect(waarschuwingenVoorVers(bron, bewerkt)).toEqual([]);
	});
});
