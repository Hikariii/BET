import { klapRegelsUit, openParagraaf, openPrecedent, openVraag, wijzigTekstInEditor } from './naPlaatsen';
import type { NaPlaatsen } from './VersVoorbeeld';
import { VERZEN, type Vers } from './voorbeelden';

/** Hoe de rij van het vers erbij staat. */
export type Weergave = 'gewoon' | 'gekozen' | 'bewerken';

/** Een vers in een bepaalde toestand, met de kleine kop en de toelichting in de galerij. */
export type VersToestand = {
	titel: string;
	verwijzing: Vers;
	notitie: string;
	weergave: Weergave;
	naPlaatsen: NaPlaatsen | null;
};

export type VersOnderdeel = {
	titel: string;
	toestanden: VersToestand[];
};

function toestand(titel: string, verwijzing: Vers, notitie: string, weergave: Weergave = 'gewoon', naPlaatsen: NaPlaatsen | null = null): VersToestand {
	return { titel, verwijzing, notitie, weergave, naPlaatsen };
}

export const BIJBELTEKST: VersOnderdeel = {
	titel: 'Bijbeltekst met Word-opmaak',
	toestanden: [
		toestand('Jezuswoorden', VERZEN.jezuswoorden, 'Alineastijl Jezus_woorden.'),
		toestand('Domein', VERZEN.domein, 'Zonde en genade (vet cursief, kleur uit het sjabloon) in de woorden van Jezus.'),
		toestand('Onderwijs', VERZEN.onderwijs, 'Onderwijs, met een domein erbinnen.'),
		toestand('Onderstreept en vet', VERZEN.onderstreeptEnVet, 'Een citaat uit het Oude Testament met onderstreept vet.'),
		toestand('Heel lang vers', VERZEN.langVers, 'Het langste vers van het boek, over twee alinea’s.'),
		toestand('Meerdere alinea’s', VERZEN.meerdereAlineas, 'Drie alinea’s in één vers, de middelste met Jezuswoorden.'),
	],
};

export const VERSRIJ: VersOnderdeel = {
	titel: 'Versrij en kolom Regels',
	toestanden: [
		toestand('Veel regels, ingeklapt', VERZEN.veelRegels, 'Na drie regels staat de rest achter ‘nog N regels’.'),
		toestand('Veel regels, uitgeklapt', VERZEN.veelRegels, 'Hetzelfde vers na een klik op ‘nog N regels’.', 'gewoon', klapRegelsUit),
		toestand('Met een vraag', VERZEN.metVraag, 'De vraag staat dicht achter ‘vraag’.'),
		toestand('Met een open vraag', VERZEN.metOpenVraag, 'De vraag staat nog open en is uitgeklapt.', 'gewoon', openVraag),
		toestand('Zonder regels', VERZEN.zonderRegels, 'Het log zegt niets over dit vers.'),
		toestand('Gekozen vers', VERZEN.gekozen, 'Het vers uit het adres, zoals #/lukas/4/26.', 'gekozen'),
	],
};

export const NASLAG: VersOnderdeel = {
	titel: 'Naslagkaart onder een vers',
	toestanden: [
		toestand('Precedent', VERZEN.naslagPrecedent, 'Een klik op ‘precedent’ opent de bijbehorende vertaalkeuzes onder het vers.', 'gewoon', openPrecedent),
		toestand('Richtlijnparagraaf', VERZEN.naslagParagraaf, 'Een klik op een § opent die paragraaf van de richtlijn onder het vers.', 'gewoon', openParagraaf),
	],
};

export const BEWERKEN: VersOnderdeel = {
	titel: 'Een vers bewerken',
	toestanden: [
		toestand('Editor open met een opmaakwaarschuwing', VERZEN.editorMetWaarschuwing, 'De bewerking mist de markeringen zonde en genade uit de bron.', 'bewerken'),
		toestand(
			'Gewijzigd, met Terug naar de repo',
			VERZEN.gewijzigd,
			'De marker en de knop staan onder de tekst. Terug naar de repo wist de bewerking uit het geheugen van deze pagina.',
		),
		toestand('Bewerking op een oudere repo', VERZEN.verouderd, 'De repo is veranderd sinds de bewerking begon.'),
		toestand(
			'Opslag vol',
			VERZEN.opslagVol,
			'De editor staat open en de eerste wijziging mislukt, zoals bij een volle browseropslag.',
			'bewerken',
			wijzigTekstInEditor,
		),
	],
};
