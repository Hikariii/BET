import { describe, expect, it } from 'vitest';
import { bewaarAntwoord, haalKeuzesUitAntwoorden, legAntwoordVast, pasToelichtingAan, trekAntwoordIn, voegKeuzeToe, type Antwoord } from '../antwoorden/antwoorden';
import { terugNaarRepo } from '../bewerken/terugNaarRepo';
import type { Opslag } from '../bewerken/tussenstand';
import { draaiKeuzeTerug, draaiVersTerug, leesKeuzes, pasKeuzeToe, pasOpdrachtToe, schrijfKeuzes, type Toepassing } from '../vervangen/keuzes';
import { zoekVondsten } from '../vervangen/zoekEnVervang';
import type { HoofdstukVerzen } from '../vervangen/types';
import { GeheugenOpslag, inhoud, OpslagMetVolleSleutel } from './testhulp';
import { meldendeOpslag } from './wijziging';

const NU = new Date('2026-11-16T10:00:00.000Z');
const TEKST = { 3: ' Een harde man.', 4: ' Harde woorden, harde man.' };

const VERZEN: HoofdstukVerzen[] = [
	{
		hoofdstuk: 1,
		goedgekeurd: false,
		verzen: Object.entries(TEKST).map(([vers, tekst]) => ({ vers: Number(vers), inhoud: inhoud(tekst), repo: inhoud(tekst) })),
	},
];

const ANTWOORD: Antwoord = { kwestie: 'Harde man', optie: 'a) zachte', toelichting: '', keuzeIds: ['k1'], gegeven: NU.toISOString() };

/** Een opslag die elke geslaagde schrijf- of wisactie telt, en de teller. */
function telOpslag(onderliggend: Opslag = new GeheugenOpslag()): { opslag: Opslag; meldingen: () => number } {
	let aantal = 0;
	return { opslag: meldendeOpslag(onderliggend, () => aantal++), meldingen: () => aantal };
}

/** De meldingen die `actie` veroorzaakt, zonder die van het voorwerk. */
function meldingenVan(opslag: Opslag, meldingen: () => number, actie: () => void): number {
	const voor = meldingen();
	actie();
	return meldingen() - voor;
}

/** Een vervanging op twee verzen met het antwoord op de vraag eronder, in een opslag die meldingen telt. */
function metVervanging() {
	const { opslag, meldingen } = telOpslag();
	const { keuze } = pasKeuzeToe(opslag, 'lukas', VERZEN, 'harde', 'zachte', zoekVondsten(VERZEN, 'harde'), NU);
	voegKeuzeToe(opslag, 'lukas', { kwestie: 'Harde man', optie: 'a) zachte' }, keuze.id, NU);
	expect(keuze.verzen).toHaveLength(2);
	return { opslag, meldingen, keuzeId: keuze.id };
}

describe('meldingen per schrijfactie op antwoorden', () => {
	it('geeft één melding voor een antwoord bewaren, vastleggen, de toelichting aanpassen, een keuze toevoegen en intrekken', () => {
		const { opslag, meldingen } = telOpslag();

		expect(meldingenVan(opslag, meldingen, () => bewaarAntwoord(opslag, 'lukas', ANTWOORD))).toBe(1);
		expect(meldingenVan(opslag, meldingen, () => legAntwoordVast(opslag, 'lukas', { kwestie: 'Houden', optie: 'b) niets doen', toelichting: '' }, NU))).toBe(1);
		expect(meldingenVan(opslag, meldingen, () => pasToelichtingAan(opslag, 'lukas', 'Houden', 'Bij twijfel.', NU))).toBe(1);
		expect(meldingenVan(opslag, meldingen, () => voegKeuzeToe(opslag, 'lukas', { kwestie: 'Houden', optie: 'b) niets doen' }, 'k2', NU))).toBe(1);
		expect(meldingenVan(opslag, meldingen, () => trekAntwoordIn(opslag, 'lukas', 'Houden', new Set()))).toBe(1);
	});

	it('geeft één melding voor keuzes uit antwoorden halen, en geen als geen antwoord ernaar wijst', () => {
		const { opslag, meldingen } = telOpslag();
		bewaarAntwoord(opslag, 'lukas', ANTWOORD);

		expect(meldingenVan(opslag, meldingen, () => haalKeuzesUitAntwoorden(opslag, 'lukas', ['onbekend']))).toBe(0);
		expect(meldingenVan(opslag, meldingen, () => haalKeuzesUitAntwoorden(opslag, 'lukas', ['k1']))).toBe(1);
	});

	it('geeft geen melding als het antwoord niet kon worden opgeslagen', () => {
		const { opslag, meldingen } = telOpslag(new OpslagMetVolleSleutel('bet-antwoorden/lukas'));

		expect(meldingenVan(opslag, meldingen, () => expect(bewaarAntwoord(opslag, 'lukas', ANTWOORD)).toBe(false))).toBe(0);
	});
});

describe('meldingen per schrijfactie op keuzes', () => {
	it('geeft één melding voor de keuzelijst schrijven en leegmaken', () => {
		const { opslag, meldingen } = telOpslag();
		const { keuze } = pasKeuzeToe(new GeheugenOpslag(), 'lukas', VERZEN, 'harde', 'zachte', zoekVondsten(VERZEN, 'harde'), NU);

		expect(meldingenVan(opslag, meldingen, () => schrijfKeuzes(opslag, 'lukas', [keuze]))).toBe(1);
		expect(meldingenVan(opslag, meldingen, () => schrijfKeuzes(opslag, 'lukas', []))).toBe(1);
	});

	it('geeft bij toepassen één melding per vers en één voor de keuzelijst', () => {
		const { opslag, meldingen } = telOpslag();

		const aantal = meldingenVan(opslag, meldingen, () => pasKeuzeToe(opslag, 'lukas', VERZEN, 'harde', 'zachte', zoekVondsten(VERZEN, 'harde'), NU));

		expect(aantal).toBe(2 + 1);
	});

	it('geeft bij toepassen met een vraag ook één melding voor het antwoord', () => {
		const { opslag, meldingen } = telOpslag();
		const toepassing: Toepassing = {
			hoofdstukken: VERZEN,
			opdracht: { soort: 'tekst', zoekterm: 'harde', nieuw: 'zachte', bereik: { soort: 'boek' } },
			aangevinkt: zoekVondsten(VERZEN, 'harde').map((vondst) => ({ ...vondst, variant: null })),
			overgeslagen: [],
			variantVervangingen: new Map(),
			vraag: { kwestie: 'Harde man', optie: 'a) zachte' },
		};

		const aantal = meldingenVan(opslag, meldingen, () => pasOpdrachtToe(opslag, 'lukas', toepassing, NU));

		expect(aantal).toBe(2 + 1 + 1);
	});

	it('geeft als de keuzelijst niet kan worden opgeslagen alleen de meldingen van de verzen', () => {
		const { opslag, meldingen } = telOpslag(new OpslagMetVolleSleutel('bet-keuzes/lukas'));

		const aantal = meldingenVan(opslag, meldingen, () => pasKeuzeToe(opslag, 'lukas', VERZEN, 'harde', 'zachte', zoekVondsten(VERZEN, 'harde'), NU));

		expect(aantal).toBe(2);
	});

	it('geeft bij een hele keuze terugdraaien een melding per vers, één voor de keuzelijst en één voor het antwoord', () => {
		const { opslag, meldingen, keuzeId } = metVervanging();

		const aantal = meldingenVan(opslag, meldingen, () => draaiKeuzeTerug(opslag, 'lukas', keuzeId));

		expect(aantal).toBe(2 + 1 + 1);
		expect(leesKeuzes(opslag, 'lukas')).toEqual([]);
	});

	it('geeft bij een vers terugdraaien een melding voor het vers en één voor de keuzelijst, en pas bij het laatste vers ook voor het antwoord', () => {
		const { opslag, meldingen, keuzeId } = metVervanging();

		expect(meldingenVan(opslag, meldingen, () => draaiVersTerug(opslag, 'lukas', keuzeId, 1, 3))).toBe(1 + 1);
		expect(meldingenVan(opslag, meldingen, () => draaiVersTerug(opslag, 'lukas', keuzeId, 1, 4))).toBe(1 + 1 + 1);
	});
});

describe('meldingen bij een vers terugzetten', () => {
	it('geeft een melding voor het vers en één voor de keuzelijst, en pas bij het laatste vers ook voor het antwoord', () => {
		const { opslag, meldingen } = metVervanging();

		expect(meldingenVan(opslag, meldingen, () => terugNaarRepo(opslag, 'lukas', 1, 3))).toBe(1 + 1);
		expect(meldingenVan(opslag, meldingen, () => terugNaarRepo(opslag, 'lukas', 1, 4))).toBe(1 + 1 + 1);
	});

	it('geeft geen melding voor een vers zonder bewerking of vervanging', () => {
		const { opslag, meldingen } = telOpslag();

		expect(meldingenVan(opslag, meldingen, () => terugNaarRepo(opslag, 'lukas', 1, 3))).toBe(0);
	});
});
