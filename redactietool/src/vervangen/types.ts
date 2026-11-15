import type { VersInhoud } from '../bewerken/types';

/** Een plek waar de zoekterm in de vereenvoudiging staat (met de tussenstand toegepast). */
export type Vondst = {
	hoofdstuk: number;
	vers: number;
	/** Het deel van het vers (index in `VersInhoud.delen`). */
	deel: number;
	/** Tekenpositie van de vondst in de platte tekst van dat deel. */
	van: number;
	tot: number;
	/** De gevonden tekst zoals hij er staat. */
	gevonden: string;
	/** Platte tekst rond de vondst, voor het voorbeeldvenster. */
	ervoor: string;
	erna: string;
	/** Onwaar als de vondst over een opmaakgrens loopt: dan alleen met de hand. */
	vervangbaar: boolean;
	/** Uit STATUS.md; goedgekeurde hoofdstukken staan in het voorbeeldvenster standaard uit. */
	goedgekeurd: boolean;
};

/** De vereenvoudiging van één hoofdstuk zoals de vertaler hem ziet, per vers geknipt. */
export type HoofdstukVerzen = {
	hoofdstuk: number;
	goedgekeurd: boolean;
	verzen: VersMetRepo[];
};

/** Een vers zoals de vertaler het ziet (`inhoud`, met tussenstand) en zoals het in de repo staat (`repo`), om een verouderde bewerking te herkennen. */
type VersMetRepo = { vers: number; inhoud: VersInhoud; repo: VersInhoud };
