import type { Antwoord } from '../antwoorden/antwoorden';
import type { Domein } from '../formaat/types';
import type { KeuzeVariant, StructureleKeuze } from '../vervangen/keuzes';

/**
 * Het bestand `<prefix>-NN.redactie.json` dat de vertaler aan Claude geeft; een toelichting, nooit een bron van tekst.
 * Versie 1 had geen keuzes of vragen (de lijsten waren altijd leeg); versie 2 vult ze.
 */
export type RedactieExport = {
	formaat: 'bet-redactie-export';
	versie: 2;
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
	/** De antwoorden op vertaalvragen waarvan de keuze dit hoofdstuk raakt, plus de antwoorden zonder keuze. */
	beantwoordeVragen: Antwoord[];
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
	/** De kwestie van de vertaalvraag die hiermee beantwoord is, of `null`. */
	vraag: string | null;
	/** Het aantal verzen waarop de keuze nog toegepast staat, in alle hoofdstukken samen. */
	aantalToegepasteVerzen: number;
	/** Alle hoofdstukken waarin de keuze verzen heeft veranderd of plekken bewust heeft overgeslagen, oplopend. */
	hoofdstukken: number[];
	/** De toegepaste verzen in dit hoofdstuk, als `hoofdstuk:vers`. */
	toegepast: string[];
	overgeslagen: ExportOvergeslagenPlek[];
};

/** Een plek in dit hoofdstuk die bewust niet is meegenomen; bewust anders, dus niet te "repareren". */
export type ExportOvergeslagenPlek = {
	/** `hoofdstuk:vers`. */
	plek: string;
	gevonden: string;
	reden: StructureleKeuze['overgeslagen'][number]['reden'];
};

export type GewijzigdVers = {
	vers: number;
	/** De tekst uit de repo, één regel per deel, in FORMAAT-notatie (met tags). */
	repo: string[];
	/** De bewerkte tekst, één regel per deel, in FORMAAT-notatie. */
	bewerkt: string[];
	/** Hoe de bewerking ontstond; een vers zonder bewaarde herkomst geldt als "zelf getypt". */
	herkomst: 'zelf getypt' | 'structurele keuze';
	/** Het id van de structurele keuze achter de bewerking; `null` bij "zelf getypt". */
	keuzeId: string | null;
	/** De waarschuwingen die bij het vers stonden toen de export gemaakt werd. */
	waarschuwingen: string[];
	/** Of de repo sinds de bewerking veranderd is. */
	verouderd: boolean;
};
