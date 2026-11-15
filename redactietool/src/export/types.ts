/** Het bestand `<prefix>-NN.redactie.json` dat de vertaler aan Claude geeft; een toelichting, nooit een bron van tekst. */
export type RedactieExport = {
	formaat: 'bet-redactie-export';
	versie: 1;
	boek: string;
	hoofdstuk: number;
	/** De commit van de build (`GITHUB_SHA` via Vite `define`); `null` bij een lokale build zonder die variabele. */
	repoCommit: string | null;
	/** ISO-tijd van het maken van de export. */
	gemaakt: string;
	toelichting: string;
	verzen: GewijzigdVers[];
	/** Komt in fase 4 (structurele keuzes); nu altijd leeg, zodat het formaat dan niet verandert. */
	structureleKeuzes: never[];
	/** Komt in fase 4 (een optie van een vertaalvraag kiezen); nu altijd leeg. */
	beantwoordeVragen: never[];
};

export type GewijzigdVers = {
	vers: number;
	/** De tekst uit de repo, één regel per deel, in FORMAAT-notatie (met tags). */
	repo: string[];
	/** De bewerkte tekst, één regel per deel, in FORMAAT-notatie. */
	bewerkt: string[];
	/** Nu altijd "zelf getypt"; menu en structurele keuzes komen in fase 4. */
	herkomst: 'zelf getypt';
	/** De waarschuwingen die bij het vers stonden toen de export gemaakt werd. */
	waarschuwingen: string[];
	/** Of de repo sinds de bewerking veranderd is. */
	verouderd: boolean;
};
