import type { Antwoord } from '../antwoorden/antwoorden';
import type { Reactie } from '../reacties/reacties';
import type { RichtlijnReactie } from '../reacties/richtlijnReacties';
import type { Domein } from '../formaat/types';
import type { KeuzeVariant, StructureleKeuze } from '../vervangen/keuzes';

/**
 * Het bestand `<prefix>-NN.redactie.json` dat de vertaler aan Claude geeft; een toelichting, nooit een bron van tekst.
 * Alleen versie 3 bestaat; `reactiesOpOpmerkingen` en `reactiesOpRichtlijn` zijn er later aan toegevoegd. Elk antwoord heeft een `toelichting` en `keuzeIds` (nul of meer keuzes).
 */
export type RedactieExport = {
	formaat: 'bet-redactie-export';
	versie: 3;
	boek: string;
	hoofdstuk: number;
	/** De commit van de build (`GITHUB_SHA` via Vite `define`); `null` bij een lokale build zonder die variabele. */
	repoCommit: string | null;
	/** ISO-tijd van het maken van de export. */
	gemaakt: string;
	toelichting: string;
	verzen: GewijzigdVers[];
	/** De structurele keuzes die dit hoofdstuk raken (toegepast of overgeslagen), op volgorde van toepassen (oudste eerst). */
	structureleKeuzes: ExportKeuze[];
	/**
	 * De antwoorden op vertaalvragen waarvan een keuze dit hoofdstuk raakt, plus de antwoorden zonder bestaande keuze
	 * op een vraag die dit hoofdstuk in haar verzen heeft (of helemaal geen verzen heeft).
	 */
	beantwoordeVragen: ExportAntwoord[];
	/** De reacties van de vertaler op opmerkingen van Claude (`O`-nummers) uit de wijzigingslog van dit hoofdstuk. */
	reactiesOpOpmerkingen: ExportReactie[];
	/**
	 * Alle reacties van de vertaler op de richtlijn en alle voorstellen voor een nieuwe regel (`paragraaf` is dan `null`), ook als ze niet bij dit hoofdstuk horen.
	 * De richtlijn geldt voor alle boeken, dus elke export neemt ze mee; Claude ontdubbelt op `id` en `gegeven`.
	 * `voorstel`: de vertaler wil een nieuwe of andere regel; Claude schrijft een tekstvoorstel voor de richtlijn, pas na akkoord van de eigenaar.
	 */
	reactiesOpRichtlijn: RichtlijnReactie[];
};

/**
 * Een reactie op een opmerking van Claude.
 * `wordtVraag`: de vertaler wil dat Claude er een vertaalvraag van maakt in het register, pas na akkoord van de eigenaar.
 * `nr` is afgeleid van de plek in het log en kan verschuiven; `kwestie` laat zien welke opmerking bedoeld was.
 */
export type ExportReactie = Omit<Reactie, 'hoofdstuk'> & {
	/** De verzen van de opmerking, als `hoofdstuk:vers`; leeg als de opmerking niet (meer) in het log van dit hoofdstuk staat of geen verzen heeft. */
	verzen: string[];
};

/**
 * Een antwoord op een vertaalvraag, met de verzen van de vraag uit open-vragen.md (leeg als de vraag geen verzen heeft).
 * `toelichting` is de regel van de vertaler ("wanneer kiezen we wat"): input voor regels of precedentvoorstellen, pas na akkoord van de eigenaar.
 */
export type ExportAntwoord = Omit<Antwoord, 'keuzeIds'> & {
	/** De bestaande keuzes onder het antwoord die dit hoofdstuk raken (te vinden in `structureleKeuzes`); leeg bij een antwoord zonder keuzes. */
	keuzeIds: string[];
	/** Het nummer van de vraag in open-vragen.md (`V12`); `null` als de kwestie daar niet (meer) staat. */
	nr: string | null;
	/** Als `hoofdstuk:vers`. */
	verzen: string[];
};

/** Een structurele keuze: de hele keuze, met de plekken van dit hoofdstuk apart. */
export type ExportKeuze = {
	id: string;
	soort: StructureleKeuze['soort'];
	zoekterm: string;
	/** De vervangende tekst; leeg bij een markeringswissel. */
	nieuw: string;
	van: Domein | null;
	naar: Domein | null;
	varianten: KeuzeVariant[];
	/** De kwestie van de vertaalvraag die hiermee beantwoord is, of `null`; ook `null` als het antwoord op die vraag deze keuze niet (meer) noemt. */
	vraag: string | null;
	/** Het aantal verzen waarop de keuze nog toegepast staat, in alle hoofdstukken samen. */
	aantalToegepasteVerzen: number;
	/** Alle hoofdstukken waarin de keuze verzen heeft veranderd of plekken bewust heeft overgeslagen, oplopend. */
	hoofdstukken: number[];
	/** De toegepaste verzen in dit hoofdstuk, als `hoofdstuk:vers`. */
	toegepast: string[];
	overgeslagen: ExportOvergeslagenPlek[];
};

/** Een plek in dit hoofdstuk die niet is meegenomen; bij een besluit van de vertaler is dat bewust anders, dus niet te "repareren". */
export type ExportOvergeslagenPlek = {
	/** `hoofdstuk:vers`. */
	plek: string;
	gevonden: string;
	/**
	 * Waarom de plek is overgeslagen.
	 * `uitgevinkt`, `goedgekeurd` en `met de hand` zijn bewuste besluiten van de vertaler.
	 * `variant niet toegepast` is geen besluit: de vertaler heeft de vorm niet gekozen, ook niet afgewezen.
	 * `teruggedraaid`: het vers is na het toepassen weer teruggedraaid; `gevonden` is dan de zoekterm.
	 */
	reden: StructureleKeuze['overgeslagen'][number]['reden'];
};

export type GewijzigdVers = {
	vers: number;
	/** De tekst uit de repo, één regel per deel, in FORMAAT-notatie (met tags). */
	repo: string[];
	/** De bewerkte tekst, één regel per deel, in FORMAAT-notatie. */
	bewerkt: string[];
	/** Hoe de bewerking ontstond. */
	herkomst: 'zelf getypt' | 'structurele keuze';
	/** Het id van de structurele keuze achter de bewerking; `null` bij "zelf getypt". */
	keuzeId: string | null;
	/** De waarschuwingen die bij het vers stonden toen de export gemaakt werd. */
	waarschuwingen: string[];
	/** Of de repo sinds de bewerking veranderd is. */
	verouderd: boolean;
};
