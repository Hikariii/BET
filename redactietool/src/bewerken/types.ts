import type { Alineastijl, Tekststuk } from '../formaat/types';

/**
 * De inhoud van één vers zoals hij in het hoofdstuk staat: per alinea het stuk tekst na het versnummer
 * tot het volgende versnummer of het einde van de alinea, met de spaties zoals ze in het bestand staan.
 * Het versnummer zelf hoort er niet bij. Bij bewerken blijft het aantal delen gelijk (geen alinea's splitsen of samenvoegen).
 */
export type VersInhoud = {
	delen: VersAlineadeel[];
};

export type VersAlineadeel = {
	stijl: Alineastijl | null;
	stukken: Tekststuk[];
};

/** Bewerkte verzen van één hoofdstuk, zoals bewaard in de browser. */
export type Tussenstand = {
	/** Versnummer naar de bewerkte inhoud. */
	verzen: Record<number, BewerktVers>;
};

export type BewerktVers = {
	inhoud: VersInhoud;
	/** De inhoud uit de repo waarop de bewerking begon; wijkt de repo daar nu van af, dan is de bewerking verouderd. */
	basis: VersInhoud;
	/** ISO-tijd van het laatste bewaren. */
	bewaard: string;
	/**
	 * Waar de bewerking vandaan komt; ontbreekt in opslag van voor fase 4 (dan: zelf getypt).
	 * Optioneel om oude opslag leesbaar te houden; zelf typen in het vers zet hem terug op 'zelf getypt'.
	 */
	herkomst?: 'zelf getypt' | 'structurele keuze';
	/** Bij een structurele keuze: het id van die keuze, om hem in één keer terug te draaien. */
	keuzeId?: string;
};

/** Een waarschuwing bij een bewerkt vers; blokkeert niets. */
export type Waarschuwing = {
	soort: 'opmaak-weg';
	/** De opmaak (tag) uit de bron die in het vers ontbreekt, bv. "genade" of "jezus". */
	opmaak: string;
	tekst: string;
};
