import { isBewerkingVerouderd, leesTussenstand, type Opslag } from '../bewerken/tussenstand';
import { knipVers } from '../bewerken/versknip';
import { leesAntwoorden } from '../antwoorden/antwoorden';
import type { HoofdstukData } from '../data/types';
import { leesReacties } from '../reacties/reacties';
import { leesRichtlijnReacties } from '../reacties/richtlijnReacties';
import { leesKeuzes, type StructureleKeuze } from '../vervangen/keuzes';
import type { BoekMetHoofdstukken } from './types';

export type BewaardVers = {
	vers: number;
	/** ISO-tijd van het laatste bewaren. */
	bewaard: string;
	/** De repo is veranderd sinds de bewerking begon, of het vers bestaat niet meer zoals het was. Onwaar zolang het hoofdstuk uit de repo niet bekend is. */
	verouderd: boolean;
	herkomst: 'zelf getypt' | 'structurele keuze';
};

export type BewaardHoofdstuk = {
	hoofdstuk: number;
	verzen: BewaardVers[];
};

export type BewaardeKeuze = Pick<StructureleKeuze, 'soort' | 'van' | 'naar'> & {
	id: string;
	zoekterm: string;
	nieuw: string;
	/** ISO-tijd van toepassen. */
	toegepast: string;
	aantalVerzen: number;
};

/** Een antwoord op een vertaalvraag, zoals het overzicht het toont. */
export type BewaardAntwoord = {
	kwestie: string;
	/** De gekozen optie, of "eigen antwoord". */
	optie: string;
	/** ISO-tijd waarop optie en toelichting voor het laatst zijn vastgelegd. */
	gegeven: string;
};

/** Een reactie op een opmerking van Claude, zoals het overzicht het toont. */
export type BewaardeReactie = {
	nr: string;
	hoofdstuk: number;
	kwestie: string;
	wordtVraag: boolean;
	/** Of de reactie een tekst heeft; zonder tekst is alleen het vinkje gezet. */
	heeftTekst: boolean;
	/** ISO-tijd waarop de reactie voor het laatst is vastgelegd. */
	gegeven: string;
};

/** Een reactie op de richtlijn of een voorstel voor een nieuwe regel, zoals het overzicht het toont. */
export type BewaardeRichtlijnReactie = {
	id: string;
	/** Het nummer van de paragraaf zonder §; `null` bij een voorstel voor een nieuwe regel. */
	paragraaf: string | null;
	titel: string;
	voorstel: boolean;
	/** De tekst zelf, zodat het overzicht een nieuwe regel kan tonen zonder paragraaf. */
	tekst: string;
	/** ISO-tijd waarop de reactie voor het laatst is vastgelegd. */
	gegeven: string;
};

export type BewaardOverzicht = {
	/** Alleen hoofdstukken met bewerkte verzen, op oplopend nummer. */
	hoofdstukken: BewaardHoofdstuk[];
	/** Nieuwste eerst. */
	keuzes: BewaardeKeuze[];
	/** Nieuwste eerst. */
	antwoorden: BewaardAntwoord[];
	/** Nieuwste eerst. */
	reacties: BewaardeReactie[];
	/** Nieuwste eerst. Horen bij geen boek: het overzicht van elk boek toont dezelfde lijst. */
	richtlijnReacties: BewaardeRichtlijnReactie[];
	totaal: { verzen: number; hoofdstukken: number; verouderd: number; keuzes: number; antwoorden: number; reacties: number; richtlijnReacties: number };
	/** Waar elk hoofdstuk met bewerkingen uit de repo bekend was, zodat `verouderd` iets zegt. */
	verouderdBekend: boolean;
	/** ISO-tijd van het laatste bewaren van een vers, toepassen van een keuze of geven van een antwoord of een reactie (ook op de richtlijn); `null` als er niets bewaard is. */
	laatstBewaard: string | null;
};

function laatsteTijd(tijden: readonly string[]): string | null {
	let laatste: string | null = null;
	let laatsteMs = Number.NEGATIVE_INFINITY;
	for (const tijd of tijden) {
		const ms = Date.parse(tijd);
		if (!Number.isNaN(ms) && ms > laatsteMs) {
			laatste = tijd;
			laatsteMs = ms;
		}
	}
	return laatste;
}

/**
 * Wat er in de opslag bewaard is voor dit boek: de bewerkte verzen per hoofdstuk, de toegepaste keuzes de antwoorden op vertaalvragen, de reacties op opmerkingen van Claude en de reacties op de richtlijn.
 * `repo` zijn de hoofdstukken uit de repo; zonder het hoofdstuk van een bewerkt vers weet het overzicht niet of die verouderd is.
 */
export function bewaardOverzicht(opslag: Opslag, boek: BoekMetHoofdstukken, repo: readonly HoofdstukData[]): BewaardOverzicht {
	let verouderdBekend = true;
	const hoofdstukken: BewaardHoofdstuk[] = [];
	for (const { nummer } of [...boek.hoofdstukken].sort((een, ander) => een.nummer - ander.nummer)) {
		const bewerkt = Object.entries(leesTussenstand(opslag, boek.id, nummer).verzen);
		if (bewerkt.length === 0) continue;
		const uitRepo = repo.find((kandidaat) => kandidaat.nummer === nummer);
		if (uitRepo === undefined) verouderdBekend = false;
		const verzen = bewerkt.map(([versTekst, vers]): BewaardVers => {
			const nummerVers = Number(versTekst);
			const repoVers = uitRepo === undefined ? null : knipVers(uitRepo.vereenvoudigd, nummerVers);
			return {
				vers: nummerVers,
				bewaard: vers.bewaard,
				verouderd: uitRepo !== undefined && isBewerkingVerouderd(repoVers, vers),
				herkomst: vers.herkomst,
			};
		});
		hoofdstukken.push({ hoofdstuk: nummer, verzen });
	}
	const keuzes = leesKeuzes(opslag, boek.id).map(
		({ id, soort, zoekterm, nieuw, van, naar, toegepast, verzen }): BewaardeKeuze => ({ id, soort, zoekterm, nieuw, van, naar, toegepast, aantalVerzen: verzen.length }),
	);
	const antwoorden = leesAntwoorden(opslag, boek.id)
		.map(({ kwestie, optie, gegeven }): BewaardAntwoord => ({ kwestie, optie, gegeven }))
		.sort((een, ander) => Date.parse(ander.gegeven) - Date.parse(een.gegeven));
	const reacties = leesReacties(opslag, boek.id)
		.map(({ nr, hoofdstuk, kwestie, wordtVraag, tekst, gegeven }): BewaardeReactie => ({ nr, hoofdstuk, kwestie, wordtVraag, heeftTekst: tekst !== '', gegeven }))
		.sort((een, ander) => Date.parse(ander.gegeven) - Date.parse(een.gegeven));
	const richtlijnReacties = leesRichtlijnReacties(opslag).sort((een, ander) => Date.parse(ander.gegeven) - Date.parse(een.gegeven));
	const alleVerzen = hoofdstukken.flatMap((hoofdstuk) => hoofdstuk.verzen);
	return {
		hoofdstukken,
		keuzes,
		antwoorden,
		reacties,
		richtlijnReacties,
		totaal: {
			verzen: alleVerzen.length,
			hoofdstukken: hoofdstukken.length,
			verouderd: alleVerzen.filter((vers) => vers.verouderd).length,
			keuzes: keuzes.length,
			antwoorden: antwoorden.length,
			reacties: reacties.length,
			richtlijnReacties: richtlijnReacties.length,
		},
		verouderdBekend,
		laatstBewaard: laatsteTijd([...alleVerzen.map((vers) => vers.bewaard), ...keuzes.map((keuze) => keuze.toegepast), ...antwoorden.map((antwoord) => antwoord.gegeven), ...reacties.map((reactie) => reactie.gegeven), ...richtlijnReacties.map((reactie) => reactie.gegeven)]),
	};
}
