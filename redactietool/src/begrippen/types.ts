import type { Precedent, VersRef } from '../data/types';

/** Hoe vaak een precedent in het boek voorkomt. */
export type PrecedentTelling = {
	precedent: Precedent;
	/** Of de cellen Bron en Vereenvoudigd een vorm hebben die automatisch te zoeken is. */
	telbaar: boolean;
	/** Bij niet telbaar: waarom (bv. "verwijst naar een regel", "meerdere vormen zonder vaste notatie"). */
	reden: string | null;
	/** Verzen waar de bronvorm in de bron staat en de vereenvoudigde vorm in de vereenvoudiging. */
	toegepast: VersRef[];
	/** Verzen waar de bronvorm nog in de vereenvoudiging staat. */
	nietToegepast: VersRef[];
};

export type VraagStatus = 'open' | 'onbeslist' | 'voorlopig besloten' | 'besloten';

export type VraagHerkomst =
	| { soort: 'register' }
	/** Een vraag onder `## Vragen aan redactie` in het log van een hoofdstuk; `nummer` is de positie, vanaf 1. */
	| { soort: 'hoofdstuk'; hoofdstuk: number; nummer: number }
	/** Een eigen vraag bij een vers in het log (geen verwijzing "Zie vraag N"). */
	| { soort: 'vers'; hoofdstuk: number; vers: number };

export type Vertaalvraag = {
	herkomst: VraagHerkomst;
	/** Korte titel: de kwestie uit het register, of de kop van de vraag zonder versverwijzing. */
	kwestie: string;
	/** De volledige tekst van de vraag. */
	tekst: string;
	/** Alleen in het register. */
	gekozen: string | null;
	alternatief: string | null;
	status: VraagStatus;
	/** Waar: status afgeleid uit de tekst van het log ("volgens tekst"); onwaar: uit de kolom Status van het register. */
	statusAfgeleid: boolean;
	verzen: VersRef[];
};
