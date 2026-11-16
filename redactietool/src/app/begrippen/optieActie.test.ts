import { describe, expect, it } from 'vitest';
import { isHoudOptie, maakVoorstel, splitsOpties } from '../../begrippen/opties';
import type { Vertaalvraag } from '../../begrippen/types';
import type { BoekData, HoofdstukData } from '../../data/types';
import { leesRepobestand } from '../../referentie/bestanden.testhulp';
import { leesOpenVragen } from '../../referentie/openVragen';
import { leesLukasHoofdstukken } from '../../uitlijning/lukasHoofdstukken.testhulp';
import type { Voorstel } from '../../vervangen/voorstel';
import { domeinenOpZoekterm } from '../../vervangen/zoekopdracht';
import { optieActie } from './optieActie';
import { bouwHoofdstukVerzen } from './vervangenVoorbeeld';

function voorstel(velden: Partial<Voorstel>): Voorstel {
	return { kwestie: 'kwestie', optie: 'optie', opdracht: 'tekst', zoekterm: '', nieuw: '', van: null, naar: null, verzen: [], ...velden };
}

const MET_VERZEN = { verzen: [{ hoofdstuk: 4, vers: 2 }] };
const ZONDER_VERZEN = { verzen: [] };

describe('optieActie', () => {
	it('kiest bij een optie die de tekst houdt, ook zonder zoekterm', () => {
		expect(optieActie(ZONDER_VERZEN, 'b) "zalig" houden', voorstel({}))).toBe('kiezen');
	});

	it('kiest bij een markeringswissel met een zoekterm: Zoeken en vervangen is dan helemaal ingevuld', () => {
		expect(optieActie(MET_VERZEN, 'a) genade', voorstel({ opdracht: 'markering', zoekterm: 'Gezegend', naar: 'genade' }))).toBe('kiezen');
	});

	it('zoekt de plekken bij een markeringswissel zonder zoekterm', () => {
		expect(optieActie(MET_VERZEN, 'a) genade', voorstel({ opdracht: 'markering', naar: 'genade' }))).toBe('zoek-plekken');
	});

	it('zoekt de plekken bij een tekstoptie, want de tool weet niet wat er moet komen', () => {
		expect(optieActie(MET_VERZEN, 'niet op de proef stellen', voorstel({ zoekterm: 'verzoeking' }))).toBe('zoek-plekken');
	});

	it('zoekt de plekken met alleen de verzen van de vraag als er geen zoekterm is', () => {
		expect(optieActie(MET_VERZEN, 'niet op de proef stellen', voorstel({}))).toBe('zoek-plekken');
	});

	it('geeft geen knop als de vraag geen woord en geen vers noemt', () => {
		expect(optieActie(ZONDER_VERZEN, 'niet op de proef stellen', voorstel({}))).toBe('geen');
	});
});

describe('optieActie op de vragen van Lukas', () => {
	const boek: BoekData = { id: 'lukas', naam: 'Lukas', prefix: 'lukas', hoofdstukken: [], stijlen: [] };
	const hoofdstukken: HoofdstukData[] = leesLukasHoofdstukken().map((lukas) => ({
		nummer: lukas.nummer,
		bron: lukas.bron,
		vereenvoudigd: lukas.vereenvoudigd,
		log: { verzen: [], algemeneVragen: [] },
	}));
	const verzen = bouwHoofdstukVerzen(hoofdstukken, boek, () => ({ verzen: {} }));
	const vragen: Vertaalvraag[] = leesOpenVragen(leesRepobestand('bijbel/lukas/referentie/open-vragen.md')).map((vraag) => ({
		nr: vraag.nr,
		herkomst: { soort: 'register' },
		kwestie: vraag.kwestie,
		tekst: vraag.besluit,
		gekozen: vraag.gekozen,
		alternatief: vraag.alternatief,
		status: 'open',
		statusAfgeleid: false,
		verzen: vraag.verzen,
	}));
	const acties = vragen.flatMap((vraag) =>
		splitsOpties(vraag.alternatief).map((optie) => {
			const gemaakt = maakVoorstel(vraag, optie, (zoekterm) => domeinenOpZoekterm(verzen, zoekterm, { soort: 'verzen', verzen: vraag.verzen }));
			return { optie, gemaakt, actie: optieActie(vraag, optie, gemaakt) };
		}),
	);

	it('geeft Kiezen alleen bij een houden-optie of een markeringswissel met een zoekterm', () => {
		const kiezen = acties.filter(({ actie }) => actie === 'kiezen');

		expect(kiezen.length).toBeGreaterThan(0);
		for (const { optie, gemaakt } of kiezen) {
			expect(isHoudOptie(optie) || (gemaakt.opdracht === 'markering' && gemaakt.zoekterm !== ''), optie).toBe(true);
		}
	});

	it('laat een deel van de opties over aan Zoek de plekken, en kiest niet bij alles', () => {
		const soorten = new Set(acties.map(({ actie }) => actie));

		expect(soorten.has('zoek-plekken')).toBe(true);
		expect(acties.filter(({ actie }) => actie === 'kiezen').length).toBeLessThan(acties.length);
	});
});
