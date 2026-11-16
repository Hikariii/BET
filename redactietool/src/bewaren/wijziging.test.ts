import { describe, expect, it } from 'vitest';
import { legAntwoordVast } from '../antwoorden/antwoorden';
import { bewaarVers, wisVers } from '../bewerken/tussenstand';
import { bewaarOfWis } from '../bewerken/terugNaarRepo';
import { draaiKeuzeTerug, pasKeuzeToe } from '../vervangen/keuzes';
import { zoekVondsten } from '../vervangen/zoekEnVervang';
import type { HoofdstukVerzen } from '../vervangen/types';
import { GeheugenOpslag, inhoud, OpslagMetVolleSleutel } from './testhulp';
import { luisterNaOpslagwijziging, meldendeOpslag, meldOpslagGewijzigd, opslagTeller } from './wijziging';

/** Een opslag die onthoudt onder welke sleutels geschreven of gewist is, zodat de test het aantal meldingen met het aantal schrijfacties vergelijkt. */
class SchrijfLogOpslag extends GeheugenOpslag {
	readonly schrijfacties: string[] = [];
	override setItem(sleutel: string, waarde: string): void {
		this.schrijfacties.push(sleutel);
		super.setItem(sleutel, waarde);
	}
	override removeItem(sleutel: string): void {
		this.schrijfacties.push(sleutel);
		super.removeItem(sleutel);
	}
	sleutels(): string[] {
		return [...new Set(this.schrijfacties)].sort();
	}
}

function teller() {
	const meldingen = { aantal: 0 };
	return { meldingen, bijWijziging: () => meldingen.aantal++ };
}

describe('meldendeOpslag', () => {
	it('meldt één wijziging na bewaren en één na wissen van een vers', () => {
		const { meldingen, bijWijziging } = teller();
		const opslag = meldendeOpslag(new GeheugenOpslag(), bijWijziging);
		expect(meldingen.aantal).toBe(0);

		bewaarOfWis(opslag, 'lukas', 1, 1, inhoud(' nieuw'), inhoud(' oud'));
		expect(meldingen.aantal).toBe(1);

		wisVers(opslag, 'lukas', 1, 1);
		expect(meldingen.aantal).toBe(2);
	});

	it('meldt een antwoord zonder keuze, want de schermen lezen antwoorden opnieuw', () => {
		const { meldingen, bijWijziging } = teller();
		const onderliggend = new SchrijfLogOpslag();
		const opslag = meldendeOpslag(onderliggend, bijWijziging);
		expect(meldingen.aantal).toBe(0);

		legAntwoordVast(opslag, 'lukas', { kwestie: 'aanhalingstekens', optie: 'dubbel', toelichting: '' }, new Date());

		expect(onderliggend.sleutels()).toEqual(['bet-antwoorden/lukas']);
		expect(meldingen.aantal).toBe(onderliggend.schrijfacties.length);
	});

	it('meldt elke schrijfactie van het toepassen en terugdraaien van een keuze', () => {
		const { meldingen, bijWijziging } = teller();
		const onderliggend = new SchrijfLogOpslag();
		const opslag = meldendeOpslag(onderliggend, bijWijziging);
		const verzen: HoofdstukVerzen[] = [{ hoofdstuk: 1, goedgekeurd: false, verzen: [{ vers: 3, inhoud: inhoud(' harde'), repo: inhoud(' harde') }] }];
		expect(meldingen.aantal).toBe(0);

		const { keuze } = pasKeuzeToe(opslag, 'lukas', verzen, 'harde', 'zachte', zoekVondsten(verzen, 'harde'), new Date());
		expect(onderliggend.sleutels()).toEqual(['bet-keuzes/lukas', 'bet-tussenstand/lukas/1']);
		expect(meldingen.aantal).toBe(onderliggend.schrijfacties.length);

		const voorTerugdraaien = meldingen.aantal;
		draaiKeuzeTerug(opslag, 'lukas', keuze.id);
		expect(onderliggend.schrijfacties.length).toBeGreaterThan(voorTerugdraaien);
		expect(meldingen.aantal).toBe(onderliggend.schrijfacties.length);
	});

	it('meldt niets bij een mislukte schrijfactie en laat lezen ongemoeid', () => {
		const { meldingen, bijWijziging } = teller();
		const opslag = meldendeOpslag(new OpslagMetVolleSleutel('bet-tussenstand/lukas/1'), bijWijziging);

		const uitkomst = bewaarVers(opslag, 'lukas', 1, 1, inhoud(' nieuw'), inhoud(' oud'));

		expect(uitkomst.gelukt).toBe(false);
		expect(meldingen.aantal).toBe(0);
		expect(opslag.getItem('bet-tussenstand/lukas/1')).toBeNull();
	});
});

describe('luisterNaOpslagwijziging', () => {
	it('roept luisteraars aan tot ze zich afmelden en laat de teller oplopen', () => {
		const { meldingen, bijWijziging } = teller();
		const afmelden = luisterNaOpslagwijziging(bijWijziging);
		const voor = opslagTeller();

		meldOpslagGewijzigd();
		expect(meldingen.aantal).toBe(1);
		expect(opslagTeller()).toBe(voor + 1);

		afmelden();
		meldOpslagGewijzigd();
		expect(meldingen.aantal).toBe(1);
	});
});
