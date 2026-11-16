import { describe, expect, it } from 'vitest';
import { antwoordenSleutel, leesAntwoorden, voegKeuzeToe } from '../antwoorden/antwoorden';
import { bewaardOverzicht } from '../bewaren/overzicht';
import { BOEK, GeheugenOpslag, inhoud, OpslagMetVolleSleutel, repoHoofdstuk } from '../bewaren/testhulp';
import { maakExport } from '../export/maakExport';
import { keuzesSleutel, leesKeuzes, pasKeuzeToe } from '../vervangen/keuzes';
import { zoekVondsten } from '../vervangen/zoekEnVervang';
import type { HoofdstukVerzen } from '../vervangen/types';
import { bewaarOfWis, terugNaarRepo } from './terugNaarRepo';
import { bewaarVers, leesTussenstand } from './tussenstand';

const NU = new Date('2026-11-16T10:00:00.000Z');
const REPO_TEKST = { 3: ' Een harde man.', 4: ' Harde woorden, harde man.', 5: ' Niets bijzonders.' };
const KWESTIE = 'Harde man';

const VERZEN: HoofdstukVerzen[] = [
	{
		hoofdstuk: 1,
		goedgekeurd: false,
		verzen: Object.entries(REPO_TEKST).map(([vers, tekst]) => ({ vers: Number(vers), inhoud: inhoud(tekst), repo: inhoud(tekst) })),
	},
];

/** Een opslag met de vervanging "harde" naar "zachte" op vers 1:3 en 1:4, met een antwoord op de vraag eronder. */
function opslagMetVervanging(): { opslag: GeheugenOpslag; keuzeId: string } {
	const opslag = new GeheugenOpslag();
	const { keuze } = pasKeuzeToe(opslag, 'lukas', VERZEN, 'harde', 'zachte', zoekVondsten(VERZEN, 'harde'), NU);
	voegKeuzeToe(opslag, 'lukas', { kwestie: KWESTIE, optie: 'a) zachte' }, keuze.id, NU);
	return { opslag, keuzeId: keuze.id };
}

function exportVan(opslag: GeheugenOpslag) {
	return maakExport({
		boek: 'lukas',
		hoofdstuk: repoHoofdstuk(1, REPO_TEKST),
		tussenstand: leesTussenstand(opslag, 'lukas', 1),
		keuzes: leesKeuzes(opslag, 'lukas'),
		antwoorden: leesAntwoorden(opslag, 'lukas'),
		reacties: [],
		richtlijnReacties: [],
		opmerkingVerzen: new Map(),
		vragen: new Map(),
		repoCommit: null,
		toelichting: '',
		nu: NU,
	});
}

function versnummers(opslag: GeheugenOpslag): number[] {
	return Object.keys(leesTussenstand(opslag, 'lukas', 1).verzen).map(Number);
}

describe('terugNaarRepo', () => {
	it('haalt een vers van een vervanging uit de tussenstand, de vervanging, de export en het overzicht', () => {
		const { opslag, keuzeId } = opslagMetVervanging();
		expect(versnummers(opslag)).toEqual([3, 4]);
		expect(exportVan(opslag).structureleKeuzes.map((keuze) => keuze.toegepast)).toEqual([['1:3', '1:4']]);
		expect(bewaardOverzicht(opslag, BOEK, [repoHoofdstuk(1, REPO_TEKST)]).totaal).toMatchObject({ verzen: 2, keuzes: 1 });

		expect(terugNaarRepo(opslag, 'lukas', 1, 3)).toEqual({ gelukt: true });

		expect(versnummers(opslag)).toEqual([4]);
		const keuze = leesKeuzes(opslag, 'lukas')[0];
		expect(keuze?.id).toBe(keuzeId);
		expect(keuze?.verzen.map((vers) => vers.vers)).toEqual([4]);
		expect(keuze?.overgeslagen).toEqual([{ hoofdstuk: 1, vers: 3, gevonden: 'harde', reden: 'teruggedraaid' }]);
		const uitvoer = exportVan(opslag);
		expect(uitvoer.verzen.map((vers) => vers.vers)).toEqual([4]);
		expect(uitvoer.structureleKeuzes.map((k) => [k.toegepast, k.aantalToegepasteVerzen])).toEqual([[['1:4'], 1]]);
		expect(uitvoer.structureleKeuzes[0]?.overgeslagen).toEqual([{ plek: '1:3', gevonden: 'harde', reden: 'teruggedraaid' }]);
		const overzicht = bewaardOverzicht(opslag, BOEK, [repoHoofdstuk(1, REPO_TEKST)]);
		expect(overzicht.totaal).toMatchObject({ verzen: 1, keuzes: 1 });
		expect(overzicht.keuzes).toMatchObject([{ aantalVerzen: 1 }]);
	});

	it('laat de vervanging en haar antwoord verdwijnen zodra het laatste vers terug is', () => {
		const { opslag } = opslagMetVervanging();

		terugNaarRepo(opslag, 'lukas', 1, 3);
		expect(leesAntwoorden(opslag, 'lukas')).toHaveLength(1);
		terugNaarRepo(opslag, 'lukas', 1, 4);

		expect(opslag.items.size).toBe(0);
		const uitvoer = exportVan(opslag);
		expect(uitvoer.verzen).toEqual([]);
		expect(uitvoer.structureleKeuzes).toEqual([]);
		expect(uitvoer.beantwoordeVragen).toEqual([]);
		expect(bewaardOverzicht(opslag, BOEK, []).totaal).toMatchObject({ verzen: 0, keuzes: 0 });
	});

	it('houdt het antwoord met zijn toelichting als de vervanging weg is', () => {
		const { opslag, keuzeId } = opslagMetVervanging();
		const antwoord = leesAntwoorden(opslag, 'lukas')[0];
		if (antwoord === undefined) throw new Error('Geen antwoord in de testdata.');
		opslag.setItem(antwoordenSleutel('lukas'), JSON.stringify([{ ...antwoord, toelichting: 'Alleen bij karakter.' }]));
		expect(antwoord.keuzeIds).toEqual([keuzeId]);

		terugNaarRepo(opslag, 'lukas', 1, 3);
		terugNaarRepo(opslag, 'lukas', 1, 4);

		expect(opslag.getItem(keuzesSleutel('lukas'))).toBeNull();
		expect(leesAntwoorden(opslag, 'lukas')).toMatchObject([{ kwestie: KWESTIE, keuzeIds: [], toelichting: 'Alleen bij karakter.' }]);
	});

	it('haalt een vers dat de vertaler na de vervanging zelf aanpaste ook uit de vervanging', () => {
		const { opslag } = opslagMetVervanging();
		bewaarOfWis(opslag, 'lukas', 1, 3, inhoud(' Een zachte, eigen man.'), inhoud(REPO_TEKST[3]));
		expect(leesTussenstand(opslag, 'lukas', 1).verzen[3]?.herkomst).toBe('zelf getypt');
		expect(leesKeuzes(opslag, 'lukas')[0]?.verzen.map((vers) => vers.vers)).toEqual([3, 4]);

		terugNaarRepo(opslag, 'lukas', 1, 3);

		expect(versnummers(opslag)).toEqual([4]);
		expect(leesKeuzes(opslag, 'lukas')[0]?.verzen.map((vers) => vers.vers)).toEqual([4]);
	});

	it('haalt het vers uit elke vervanging die het veranderde', () => {
		const { opslag } = opslagMetVervanging();
		const verzenNa = VERZEN.map((hoofdstuk) => ({
			...hoofdstuk,
			verzen: hoofdstuk.verzen.map((vers) => ({ ...vers, inhoud: leesTussenstand(opslag, 'lukas', 1).verzen[vers.vers]?.inhoud ?? vers.inhoud })),
		}));
		const tweede = pasKeuzeToe(opslag, 'lukas', verzenNa, 'zachte', 'milde', zoekVondsten(verzenNa, 'zachte'), new Date(NU.getTime() + 1000)).keuze;
		expect(leesKeuzes(opslag, 'lukas')).toHaveLength(2);

		terugNaarRepo(opslag, 'lukas', 1, 3);

		const keuzes = leesKeuzes(opslag, 'lukas');
		expect(keuzes.map((keuze) => keuze.verzen.map((vers) => vers.vers))).toEqual([[4], [4]]);
		expect(keuzes.map((keuze) => keuze.id)).toContain(tweede.id);
	});

	it('laat de opslag helemaal ongemoeid bij een vers zonder bewerking of vervanging', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 1, 5, inhoud(' Zelf.'), inhoud(REPO_TEKST[5]));
		const voor = new Map(opslag.items);

		expect(terugNaarRepo(opslag, 'lukas', 1, 4)).toEqual({ gelukt: true });

		expect(opslag.items).toEqual(voor);
	});

	it('zet een zelf getypt vers terug zonder vervangingen aan te raken', () => {
		const opslag = new GeheugenOpslag();
		bewaarVers(opslag, 'lukas', 1, 5, inhoud(' Zelf.'), inhoud(REPO_TEKST[5]));

		expect(terugNaarRepo(opslag, 'lukas', 1, 5)).toEqual({ gelukt: true });

		expect(opslag.items.size).toBe(0);
	});

	it('meldt met de stap dat de vervanging niet bijgewerkt kon worden, terwijl het vers wel terug is', () => {
		const { opslag } = opslagMetVervanging();
		const vol = new OpslagMetVolleSleutel(keuzesSleutel('lukas'));
		for (const [sleutel, waarde] of opslag.items) vol.items.set(sleutel, waarde);

		const uitkomst = terugNaarRepo(vol, 'lukas', 1, 3);

		expect(uitkomst).toEqual({
			gelukt: false,
			melding:
				'Vers 1:3 is teruggezet. De bijgewerkte vervanging kon niet worden opgeslagen: de opslag van de browser is vol. Download een back-up en maak ruimte vrij in de browser (Instellingen, browsergegevens).',
		});
		expect(Object.keys(leesTussenstand(vol, 'lukas', 1).verzen)).toEqual(['4']);
	});
});

describe('bewaarOfWis na een vervanging', () => {
	it('werkt de vervanging bij als de vertaler het vers terugtypt naar de tekst van Claude', () => {
		const { opslag } = opslagMetVervanging();

		expect(bewaarOfWis(opslag, 'lukas', 1, 3, inhoud(REPO_TEKST[3]), inhoud(REPO_TEKST[3]))).toEqual({ gelukt: true });

		expect(versnummers(opslag)).toEqual([4]);
		expect(leesKeuzes(opslag, 'lukas')[0]?.verzen.map((vers) => vers.vers)).toEqual([4]);
		expect(exportVan(opslag).structureleKeuzes.map((keuze) => keuze.toegepast)).toEqual([['1:4']]);
	});

	it('bewaart een afwijkende tekst en laat de vervanging staan', () => {
		const { opslag } = opslagMetVervanging();

		bewaarOfWis(opslag, 'lukas', 1, 3, inhoud(' Een andere man.'), inhoud(REPO_TEKST[3]));

		expect(leesKeuzes(opslag, 'lukas')[0]?.verzen.map((vers) => vers.vers)).toEqual([3, 4]);
	});
});
