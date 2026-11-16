import { describe, expect, it } from 'vitest';
import { antwoordenSleutel, legAntwoordVast } from '../antwoorden/antwoorden';
import { bewaarVers, tussenstandSleutel } from '../bewerken/tussenstand';
import { keuzesSleutel, pasKeuzeToe } from '../vervangen/keuzes';
import { zoekVondsten } from '../vervangen/zoekEnVervang';
import type { HoofdstukVerzen } from '../vervangen/types';
import { maakBackup, pasBackupToe } from './backup';
import { BOEK, GeheugenOpslag, inhoud, OpslagMetVolleSleutel } from './testhulp';

const NU = new Date('2026-11-16T10:00:00.000Z');
const VERZEN: HoofdstukVerzen[] = [{ hoofdstuk: 1, goedgekeurd: false, verzen: [{ vers: 3, inhoud: inhoud(' Een harde man.'), repo: inhoud(' Een harde man.') }] }];

const RUIMTE = 'Download een back-up en maak ruimte vrij in de browser (Instellingen, browsergegevens).';
const INLADEN = 'Maak ruimte vrij in de browser (Instellingen, browsergegevens) en laad de back-up opnieuw.';

describe('meldingen bij een volle opslag', () => {
	it('zeggen "opslaan" en geven een stap, bij een antwoord', () => {
		const vol = new OpslagMetVolleSleutel(antwoordenSleutel('lukas'));

		const uitkomst = legAntwoordVast(vol, 'lukas', { kwestie: 'Houden', optie: 'b) niets doen', toelichting: '' }, NU);

		expect(uitkomst).toEqual({
			gelukt: false,
			melding: `Het antwoord kon niet worden opgeslagen: de opslag van de browser is vol. ${RUIMTE} Je tekst gaat niet verloren zolang dit venster open staat.`,
		});
	});

	it('zeggen bij een vervanging die niet bewaard kan blijven wat nog wel kan', () => {
		const vol = new OpslagMetVolleSleutel(keuzesSleutel('lukas'));

		const { meldingen } = pasKeuzeToe(vol, 'lukas', VERZEN, 'harde', 'zachte', zoekVondsten(VERZEN, 'harde'), NU);

		expect(meldingen).toEqual([
			`De vervanging kon niet worden opgeslagen: de opslag van de browser is vol. De verzen zijn wel aangepast, maar je kunt de vervanging niet meer in één keer terugdraaien. Zet de verzen een voor een terug met Vers terugzetten. ${RUIMTE}`,
		]);
	});

	it('zeggen bij inladen ruimte maken en opnieuw inladen, voor verzen, vervangingen en antwoorden', () => {
		const bron = new GeheugenOpslag();
		bewaarVers(bron, 'lukas', 1, 1, inhoud(' a'), inhoud(' b'));
		pasKeuzeToe(bron, 'lukas', VERZEN, 'harde', 'zachte', zoekVondsten(VERZEN, 'harde'), NU);
		legAntwoordVast(bron, 'lukas', { kwestie: 'Houden', optie: 'b) niets doen', toelichting: '' }, NU);
		const backup = maakBackup(bron, BOEK, null, NU);

		const meldingen = (sleutel: string) => pasBackupToe(new OpslagMetVolleSleutel(sleutel), BOEK, backup, 'samenvoegen').meldingen;

		expect(meldingen(tussenstandSleutel('lukas', 1))).toEqual([`Hoofdstuk 1 kon niet worden opgeslagen: de opslag van de browser is vol. ${INLADEN}`]);
		expect(meldingen(keuzesSleutel('lukas'))).toEqual([`De vervangingen konden niet worden opgeslagen: de opslag van de browser is vol. ${INLADEN}`]);
		expect(meldingen(antwoordenSleutel('lukas'))).toEqual([`De antwoorden konden niet worden opgeslagen: de opslag van de browser is vol. ${INLADEN}`]);
	});
});
