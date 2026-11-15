import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bewaarVers, isVerouderd, leesTussenstand, zelfdeInhoud } from '../../bewerken/tussenstand';
import { knipVers } from '../../bewerken/versknip';
import { waarschuwingenVoorVers } from '../../bewerken/waarschuwingen';
import { bouwData } from '../../bouw/bouw';
import { hoofdstukJsonNaam } from '../../data/bestandsnamen';
import type { BoekData, HoofdstukData } from '../../data/types';
import { maakGeheugenopslag } from './geheugenopslag';
import { BEWERKEN, BIJBELTEKST, VERSRIJ } from './toestanden';
import { GALERIJ_BOEK, maakVoorbeeldopslag, VERZEN } from './voorbeelden';

const HOOFDMAP = path.resolve(import.meta.dirname, '../../../..');

let uitvoermap: string;
let hoofdstukken: HoofdstukData[];

function leesJson<Vorm>(pad: string): Vorm {
	return JSON.parse(readFileSync(pad, 'utf-8')) as Vorm;
}

beforeAll(() => {
	uitvoermap = mkdtempSync(path.join(tmpdir(), 'galerij-'));
	bouwData({ hoofdmap: HOOFDMAP, uitvoermap });
	const boek = leesJson<BoekData>(path.join(uitvoermap, GALERIJ_BOEK, 'boek.json'));
	hoofdstukken = boek.hoofdstukken.map(({ nummer }) => leesJson<HoofdstukData>(path.join(uitvoermap, GALERIJ_BOEK, hoofdstukJsonNaam(nummer))));
});

afterAll(() => {
	rmSync(uitvoermap, { recursive: true, force: true });
});

function hoofdstukVan(nummer: number): HoofdstukData {
	const gevonden = hoofdstukken.find((kandidaat) => kandidaat.nummer === nummer);
	if (gevonden === undefined) throw new Error(`Hoofdstuk ${nummer} ontbreekt.`);
	return gevonden;
}

function repoVan(hoofdstuk: number, vers: number) {
	const inhoud = knipVers(hoofdstukVan(hoofdstuk).vereenvoudigd, vers);
	if (inhoud === null) throw new Error(`Vers ${hoofdstuk}:${vers} ontbreekt.`);
	return inhoud;
}

describe('de verzen van de galerij', () => {
	it('staan in de gegevens van het boek', () => {
		const alle = [...BIJBELTEKST.toestanden, ...VERSRIJ.toestanden, ...BEWERKEN.toestanden];
		for (const { verwijzing } of alle) {
			expect(knipVers(hoofdstukVan(verwijzing.hoofdstuk).vereenvoudigd, verwijzing.vers)).not.toBeNull();
			expect(knipVers(hoofdstukVan(verwijzing.hoofdstuk).bron, verwijzing.vers)).not.toBeNull();
		}
	});

	it('tonen een vers met meer dan één alinea', () => {
		const delen = repoVan(VERZEN.meerdereAlineas.hoofdstuk, VERZEN.meerdereAlineas.vers).delen.length;
		expect(delen).toBe(3);
	});
});

describe('maakVoorbeeldopslag', () => {
	it('bewaart een gewijzigd vers dat afwijkt van de repo', () => {
		const opslag = maakVoorbeeldopslag(GALERIJ_BOEK, hoofdstukken);
		const { hoofdstuk, vers } = VERZEN.gewijzigd;
		const bewerkt = leesTussenstand(opslag, GALERIJ_BOEK, hoofdstuk).verzen[vers];
		expect(bewerkt).toBeDefined();
		expect(zelfdeInhoud(bewerkt?.inhoud ?? { delen: [] }, repoVan(hoofdstuk, vers))).toBe(false);
		expect(isVerouderd(repoVan(hoofdstuk, vers), bewerkt?.basis ?? { delen: [] })).toBe(false);
	});

	it('bewaart een verouderde bewerking: de repo wijkt af van waarop de bewerking begon', () => {
		const opslag = maakVoorbeeldopslag(GALERIJ_BOEK, hoofdstukken);
		const { hoofdstuk, vers } = VERZEN.verouderd;
		const bewerkt = leesTussenstand(opslag, GALERIJ_BOEK, hoofdstuk).verzen[vers];
		expect(isVerouderd(repoVan(hoofdstuk, vers), bewerkt?.basis ?? { delen: [] })).toBe(true);
	});

	it('bewaart een bewerking die opmaak uit de bron mist', () => {
		const opslag = maakVoorbeeldopslag(GALERIJ_BOEK, hoofdstukken);
		const { hoofdstuk, vers } = VERZEN.editorMetWaarschuwing;
		const bewerkt = leesTussenstand(opslag, GALERIJ_BOEK, hoofdstuk).verzen[vers];
		const bron = knipVers(hoofdstukVan(hoofdstuk).bron, vers);
		const waarschuwingen = bron === null || bewerkt === undefined ? [] : waarschuwingenVoorVers(bron, bewerkt.inhoud);
		expect(waarschuwingen.map((waarschuwing) => waarschuwing.opmaak).sort()).toEqual(['genade', 'zonde']);
	});

	it('weigert bewaren in het hoofdstuk van het vers met de volle opslag en in geen ander hoofdstuk', () => {
		const opslag = maakVoorbeeldopslag(GALERIJ_BOEK, hoofdstukken);
		const { hoofdstuk, vers } = VERZEN.opslagVol;
		const inhoud = repoVan(hoofdstuk, vers);
		expect(bewaarVers(opslag, GALERIJ_BOEK, hoofdstuk, vers, inhoud, inhoud).gelukt).toBe(false);
		const ander = VERZEN.gewijzigd;
		expect(bewaarVers(opslag, GALERIJ_BOEK, ander.hoofdstuk, 1, inhoud, inhoud).gelukt).toBe(true);
	});
});

describe('maakGeheugenopslag', () => {
	it('geeft een bewaarde waarde terug en niets meer na wissen', () => {
		const opslag = maakGeheugenopslag();
		opslag.setItem('a', 'b');
		expect(opslag.getItem('a')).toBe('b');
		opslag.removeItem('a');
		expect(opslag.getItem('a')).toBeNull();
	});
});
