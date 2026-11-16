import { describe, expect, it } from 'vitest';
import { bewaarAntwoord } from '../antwoorden/antwoorden';
import { bewaarVers } from '../bewerken/tussenstand';
import { knipVers } from '../bewerken/versknip';
import { pasKeuzeToe } from '../vervangen/keuzes';
import { zoekVondsten } from '../vervangen/zoekEnVervang';
import type { HoofdstukVerzen } from '../vervangen/types';
import { bewaardOverzicht } from './overzicht';
import { BOEK, GeheugenOpslag, inhoud, repoHoofdstuk } from './testhulp';

const HOOFDSTUK_1 = repoHoofdstuk(1, { 1: 'Hij sprak harde woorden.', 2: 'Daarna zweeg hij.' });
const HOOFDSTUK_2 = repoHoofdstuk(2, { 5: 'Een ander hoofdstuk.' });
const REPO = [HOOFDSTUK_1, HOOFDSTUK_2];

function repoVers(hoofdstuk: typeof HOOFDSTUK_1, vers: number) {
	const gevonden = knipVers(hoofdstuk.vereenvoudigd, vers);
	if (gevonden === null) throw new Error(`Vers ${vers} staat niet in de testdata.`);
	return gevonden;
}

describe('bewaardOverzicht', () => {
	it('is leeg als er niets bewaard is', () => {
		const overzicht = bewaardOverzicht(new GeheugenOpslag(), BOEK, REPO);

		expect(overzicht.hoofdstukken).toEqual([]);
		expect(overzicht.keuzes).toEqual([]);
		expect(overzicht.antwoorden).toEqual([]);
		expect(overzicht.totaal).toEqual({ verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 0, antwoorden: 0 });
		expect(overzicht.laatstBewaard).toBeNull();
	});

	it('toont per hoofdstuk de bewerkte verzen en telt ze op', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 1, 2, inhoud(' Daarna zweeg hij lang.'), repoVers(HOOFDSTUK_1, 2));
		bewaarVers(opslag, 'lukas', 1, 1, inhoud(' Hij sprak scherpe woorden.'), repoVers(HOOFDSTUK_1, 1));
		bewaarVers(opslag, 'lukas', 2, 5, inhoud(' Nog een bewerking.'), repoVers(HOOFDSTUK_2, 5));

		const overzicht = bewaardOverzicht(opslag, BOEK, REPO);

		expect(overzicht.hoofdstukken.map((h) => [h.hoofdstuk, h.verzen.map((v) => v.vers)])).toEqual([
			[1, [1, 2]],
			[2, [5]],
		]);
		expect(overzicht.totaal).toMatchObject({ verzen: 3, hoofdstukken: 2, verouderd: 0 });
		expect(overzicht.hoofdstukken[0]?.verzen[0]).toMatchObject({ herkomst: 'zelf getypt', verouderd: false });
	});

	it('markeert een bewerking als verouderd als de repo sinds het begin van de bewerking veranderde', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 1, 1, inhoud(' Mijn versie.'), inhoud(' De oude repo-tekst.'));
		bewaarVers(opslag, 'lukas', 1, 2, inhoud(' Mijn versie.'), repoVers(HOOFDSTUK_1, 2));

		const overzicht = bewaardOverzicht(opslag, BOEK, REPO);

		expect(overzicht.hoofdstukken[0]?.verzen.map((v) => [v.vers, v.verouderd])).toEqual([
			[1, true],
			[2, false],
		]);
		expect(overzicht.totaal.verouderd).toBe(1);
		expect(overzicht.verouderdBekend).toBe(true);
	});

	it('weet niet of een bewerking verouderd is zolang het hoofdstuk uit de repo ontbreekt', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 1, 1, inhoud(' Mijn versie.'), inhoud(' De oude repo-tekst.'));

		const overzicht = bewaardOverzicht(opslag, BOEK, []);

		expect(overzicht.verouderdBekend).toBe(false);
		expect(overzicht.totaal.verouderd).toBe(0);
		expect(overzicht.totaal.verzen).toBe(1);
	});

	it('neemt de laatste bewaartijd van verzen en keuzes als laatste bewaarmoment', () => {
		const opslag = new GeheugenOpslag();
		opslag.setItem(
			'bet-tussenstand/lukas/1',
			JSON.stringify({
				verzen: {
					1: { inhoud: inhoud(' a'), basis: inhoud(' b'), bewaard: '2026-11-16T10:00:00.000Z', herkomst: 'zelf getypt' },
					2: { inhoud: inhoud(' c'), basis: inhoud(' d'), bewaard: '2026-11-16T13:32:00.000Z', herkomst: 'zelf getypt' },
				},
			}),
		);
		expect(bewaardOverzicht(opslag, BOEK, REPO).laatstBewaard).toBe('2026-11-16T13:32:00.000Z');

		const verzen: HoofdstukVerzen[] = [
			{ hoofdstuk: 2, goedgekeurd: false, verzen: [{ vers: 5, inhoud: repoVers(HOOFDSTUK_2, 5), repo: repoVers(HOOFDSTUK_2, 5) }] },
		];
		pasKeuzeToe(opslag, 'lukas', verzen, 'ander', 'tweede', zoekVondsten(verzen, 'ander'), new Date('2026-11-16T15:00:00.000Z'));

		const overzicht = bewaardOverzicht(opslag, BOEK, REPO);
		expect(overzicht.laatstBewaard).toBe('2026-11-16T15:00:00.000Z');
		expect(overzicht.keuzes).toMatchObject([{ zoekterm: 'ander', nieuw: 'tweede', aantalVerzen: 1 }]);
		expect(overzicht.hoofdstukken.find((h) => h.hoofdstuk === 2)?.verzen[0]?.herkomst).toBe('structurele keuze');
	});

	it('toont de antwoorden op vertaalvragen, nieuwste eerst, en telt ze mee in het laatste bewaarmoment', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 1, 1, inhoud(' a'), inhoud(' b'));
		const zonderAntwoorden = bewaardOverzicht(opslag, BOEK, REPO);
		expect(zonderAntwoorden.totaal.antwoorden).toBe(0);
		bewaarAntwoord(opslag, 'lukas', { kwestie: 'Houden', optie: 'b) niets doen', toelichting: 'Eerst zo.', keuzeIds: [], gegeven: '2026-11-16T09:00:00.000Z' });
		bewaarAntwoord(opslag, 'lukas', { kwestie: 'Gezegend', optie: 'a) genade', toelichting: '', keuzeIds: ['k1'], gegeven: '2099-01-01T00:00:00.000Z' });
		expect(zonderAntwoorden.laatstBewaard).not.toBe('2099-01-01T00:00:00.000Z');

		const overzicht = bewaardOverzicht(opslag, BOEK, REPO);

		expect(overzicht.antwoorden).toEqual([
			{ kwestie: 'Gezegend', optie: 'a) genade', gegeven: '2099-01-01T00:00:00.000Z' },
			{ kwestie: 'Houden', optie: 'b) niets doen', gegeven: '2026-11-16T09:00:00.000Z' },
		]);
		expect(overzicht.totaal).toMatchObject({ verzen: 1, antwoorden: 2 });
		expect(overzicht.laatstBewaard).toBe('2099-01-01T00:00:00.000Z');
	});

	it('toont niets van een ander boek', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'johannes', 1, 1, inhoud(' a'), inhoud(' b'));

		bewaarAntwoord(opslag, 'johannes', { kwestie: 'x', optie: 'y', toelichting: '', keuzeIds: [], gegeven: '2026-11-16T09:00:00.000Z' });

		const overzicht = bewaardOverzicht(opslag, BOEK, REPO);

		expect(overzicht.totaal).toMatchObject({ verzen: 0, antwoorden: 0 });
	});
});
