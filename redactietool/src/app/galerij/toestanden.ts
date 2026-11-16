import { openParagraaf, openPrecedent, openVraag, wijsRegelsAan, wijzigTekstInEditor } from './naPlaatsen';
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
		toestand('Veel regels, ingeklapt', VERZEN.veelRegels, 'De cel is hoogstens zo hoog als het vers; wat niet past vervaagt onderaan.'),
		toestand('Veel regels, aangewezen', VERZEN.veelRegels, 'Hetzelfde vers na aanwijzen: het vak klapt uit over de volgende verzen. Toetsenbordfocus doet hetzelfde.', 'gewoon', wijsRegelsAan),
		toestand(
			'Veel regels, vast bij open naslagkaart',
			VERZEN.veelRegels,
			'Zolang de naslagkaart onder het vers open staat, staat de cel vast met alle regels en groeit de rij mee.',
			'gewoon',
			openParagraaf,
		),
		toestand('Met een vraag', VERZEN.metVraag, 'De vraag staat dicht achter ‘vraag’.'),
		toestand('Met een open vraag', VERZEN.metOpenVraag, 'De vraag staat nog open en is uitgeklapt.', 'gewoon', openVraag),
		toestand('Zonder regels', VERZEN.zonderRegels, 'Claude heeft bij dit vers niets aangepast.'),
		toestand('Gekozen vers', VERZEN.gekozen, 'Het vers uit het adres, zoals #/lukas/4/26.', 'gekozen'),
	],
};

export const NASLAG: VersOnderdeel = {
	titel: 'Naslagkaart onder een vers',
	toestanden: [
		toestand('Vertaalkeuze', VERZEN.naslagPrecedent, 'Een klik op ‘vertaalkeuze’ opent de bijbehorende vertaalkeuzes onder het vers.', 'gewoon', openPrecedent),
		toestand('Richtlijnparagraaf', VERZEN.naslagParagraaf, 'Een klik op een § opent die paragraaf van de richtlijn onder het vers.', 'gewoon', openParagraaf),
	],
};

export const BEWERKEN: VersOnderdeel = {
	titel: 'Een vers bewerken',
	toestanden: [
		toestand('Editor open met een opmaakwaarschuwing', VERZEN.editorMetWaarschuwing, 'De bewerking mist de markeringen zonde en genade uit de bron.', 'bewerken'),
		toestand(
			'Gewijzigd, met Vers terugzetten',
			VERZEN.gewijzigd,
			'De marker en de knop staan onder de tekst. Vers terugzetten wist de bewerking uit het geheugen van deze pagina.',
		),
		toestand('Bewerking op een oudere tekst van Claude', VERZEN.verouderd, 'Claude heeft het vers veranderd sinds de bewerking begon.'),
		toestand(
			'Opslag vol',
			VERZEN.opslagVol,
			'De editor staat open en de eerste wijziging mislukt, zoals bij een volle browseropslag.',
			'bewerken',
			wijzigTekstInEditor,
		),
	],
};
