// Gegevenscontract van de redactietool. Het bouwscript schrijft deze vormen als JSON;
// de schermen lezen ze.
//
// Bestanden die het bouwscript maakt (onder redactietool/public/data/, niet in git):
//   boeken.json                      BoekLijst
//   <boek>/boek.json                 BoekData
//   <boek>/hoofdstuk-NN.json         HoofdstukData
//   <boek>/referentie.json           Referentie
//   richtlijn.json                   Richtlijn
import type { Hoofdstuk } from '../formaat/types';

export type BoekLijst = { id: string; naam: string }[];

/** Uit STATUS.md; `-` in het bestand wordt 'nog niet begonnen'. */
export type Status = 'nog niet begonnen' | 'concept' | 'review' | 'bij editor' | 'verwerkt' | 'goedgekeurd';

export type HoofdstukInfo = {
	nummer: number;
	status: Status;
	versie: string;
	herkomst: string;
	opmerking: string;
};

/** Een stijl uit styles.xml van het Word-sjabloon van het boek. */
export type WordStijl = {
	/** styleId, zoals in w:pStyle / w:rStyle (bv. "Jezuswoorden"). */
	id: string;
	/** Weergavenaam in Word (bv. "Jezus_woorden"); nodig voor mso-style-name bij kopiëren. */
	naam: string;
	soort: 'alinea' | 'teken';
	/** Hex zonder #, of null. */
	kleur: string | null;
	vet: boolean;
	cursief: boolean;
};

export type BoekData = {
	id: string;
	naam: string;
	prefix: string;
	hoofdstukken: HoofdstukInfo[];
	stijlen: WordStijl[];
};

export type VersRef = { hoofdstuk: number; vers: number };

/** Waar een logregel naar verwijst: een paragraaf van de richtlijn (bv. "11", "7A") of een precedent. */
export type Verwijzing = { soort: 'paragraaf'; paragraaf: string } | { soort: 'precedent' };

export type LogRegel = {
	/** De regel zoals in het log, zonder het lijstteken. */
	tekst: string;
	verwijzingen: Verwijzing[];
};

/** Eén `## Vers N` of `## Vers N–M` uit een wijzigingslog. */
export type LogVers = {
	verzen: number[];
	wijzigingen: LogRegel[];
	vragen: string[];
};

export type Log = {
	verzen: LogVers[];
	/** Items onder `## Vragen aan redactie`. */
	algemeneVragen: string[];
};

export type HoofdstukData = {
	nummer: number;
	bron: Hoofdstuk;
	vereenvoudigd: Hoofdstuk;
	log: Log;
};

/** Een tabelregel uit referentie/precedenten.md. */
export type Precedent = {
	/** De kop (##) waaronder de tabel staat. */
	sectie: string;
	bron: string;
	vereenvoudigd: string;
	plaats: string;
	status: string;
	opmerking: string;
};

/** Een tabelregel uit referentie/open-vragen.md. */
export type OpenVraag = {
	/** Het vaste nummer uit de kolom Nr, bv. `V12`; een vraag houdt haar nummer, ook als er vragen bij komen. */
	nr: string;
	plaats: string;
	kwestie: string;
	gekozen: string;
	alternatief: string;
	status: string;
	besluit: string;
	/** Uit de kolom Verzen; leeg als die (nog) ontbreekt. */
	verzen: VersRef[];
};

export type Referentie = {
	precedenten: Precedent[];
	openVragen: OpenVraag[];
};

/** De soorten versiemarkering achter een kop van de richtlijn, bv. `[v1.4 open]`. */
export type MarkeringSoort = 'nieuw' | 'gewijzigd' | 'open';

/** Een versiemarkering uit een kop van de richtlijn: `[v1.4 nieuw]` is `{ versie: '1.4', soort: 'nieuw' }`. */
export type Markering = {
	versie: string;
	soort: MarkeringSoort;
};

/** Een paragraaf (## of ###) uit richtlijn/redactierichtlijn.md. */
export type RichtlijnSectie = {
	/** Nummer zonder §, bv. "11", "7A", "17B"; leeg voor koppen zonder nummer. */
	paragraaf: string;
	/** De titel zonder nummer en zonder versiemarkering. */
	titel: string;
	/** De versiemarkering uit de kop; `null` als de kop er geen heeft (of een die de tool niet kent). */
	markering: Markering | null;
	niveau: 2 | 3;
	/** Inhoud onder de kop, tot de volgende kop van gelijk of hoger niveau; bij niveau 2 dus met de subparagrafen. */
	markdown: string;
	/** Alleen de eigen tekst: de inhoud tot de eerste kop van niveau 2 of 3 eronder. Gelijk aan `markdown` bij een sectie zonder subparagrafen. */
	eigenMarkdown: string;
};

/** De hele richtlijn: de titel boven aan het bestand en de secties. */
export type Richtlijn = {
	/** De kop van niveau 1, bv. "Redactierichtlijn v1.4 (concept)". */
	titel: string;
	secties: RichtlijnSectie[];
};
