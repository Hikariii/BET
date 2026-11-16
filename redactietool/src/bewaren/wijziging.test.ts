import { describe, expect, it } from 'vitest';
import { bewaarOfWis, bewaarVers, wisVers } from '../bewerken/tussenstand';
import { draaiKeuzeTerug, pasKeuzeToe } from '../vervangen/keuzes';
import { zoekVondsten } from '../vervangen/zoekEnVervang';
import type { HoofdstukVerzen } from '../vervangen/types';
import { GeheugenOpslag, inhoud, OpslagMetVolleSleutel } from './testhulp';
import { luisterNaOpslagwijziging, meldendeOpslag, meldOpslagGewijzigd, opslagTeller } from './wijziging';

function teller() {
	const meldingen = { aantal: 0 };
	return { meldingen, bijWijziging: () => meldingen.aantal++ };
}

describe('meldendeOpslag', () => {
	it('meldt een wijziging na bewaren, na wissen en na een keuze toepassen en terugdraaien', () => {
		const { meldingen, bijWijziging } = teller();
		const opslag = meldendeOpslag(new GeheugenOpslag(), bijWijziging);
		expect(meldingen.aantal).toBe(0);

		bewaarOfWis(opslag, 'lukas', 1, 1, inhoud(' nieuw'), inhoud(' oud'));
		expect(meldingen.aantal).toBe(1);

		wisVers(opslag, 'lukas', 1, 1);
		expect(meldingen.aantal).toBe(2);

		const verzen: HoofdstukVerzen[] = [{ hoofdstuk: 1, goedgekeurd: false, verzen: [{ vers: 3, inhoud: inhoud(' harde'), repo: inhoud(' harde') }] }];
		const { keuze } = pasKeuzeToe(opslag, 'lukas', verzen, 'harde', 'zachte', zoekVondsten(verzen, 'harde'), new Date());
		const naToepassen = meldingen.aantal;
		expect(naToepassen).toBeGreaterThan(2);

		draaiKeuzeTerug(opslag, 'lukas', keuze.id);
		expect(meldingen.aantal).toBeGreaterThan(naToepassen);
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
