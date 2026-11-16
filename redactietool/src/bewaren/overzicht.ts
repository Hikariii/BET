import { isBewerkingVerouderd, leesTussenstand, type Opslag } from '../bewerken/tussenstand';
import { knipVers } from '../bewerken/versknip';
import type { HoofdstukData } from '../data/types';
import { leesKeuzes } from '../vervangen/keuzes';
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

export type BewaardeKeuze = {
	id: string;
	zoekterm: string;
	nieuw: string;
	/** ISO-tijd van toepassen. */
	toegepast: string;
	aantalVerzen: number;
};

export type BewaardOverzicht = {
	/** Alleen hoofdstukken met bewerkte verzen, op oplopend nummer. */
	hoofdstukken: BewaardHoofdstuk[];
	/** Nieuwste eerst. */
	keuzes: BewaardeKeuze[];
	totaal: { verzen: number; hoofdstukken: number; verouderd: number; keuzes: number };
	/** Waar elk hoofdstuk met bewerkingen uit de repo bekend was, zodat `verouderd` iets zegt. */
	verouderdBekend: boolean;
	/** ISO-tijd van het laatste bewaren of toepassen van een keuze; `null` als er niets bewaard is. */
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
 * Wat er in de opslag bewaard is voor dit boek: de bewerkte verzen per hoofdstuk en de toegepaste keuzes.
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
				herkomst: vers.herkomst ?? 'zelf getypt',
			};
		});
		hoofdstukken.push({ hoofdstuk: nummer, verzen });
	}
	const keuzes = leesKeuzes(opslag, boek.id).map(
		({ id, zoekterm, nieuw, toegepast, verzen }): BewaardeKeuze => ({ id, zoekterm, nieuw, toegepast, aantalVerzen: verzen.length }),
	);
	const alleVerzen = hoofdstukken.flatMap((hoofdstuk) => hoofdstuk.verzen);
	return {
		hoofdstukken,
		keuzes,
		totaal: {
			verzen: alleVerzen.length,
			hoofdstukken: hoofdstukken.length,
			verouderd: alleVerzen.filter((vers) => vers.verouderd).length,
			keuzes: keuzes.length,
		},
		verouderdBekend,
		laatstBewaard: laatsteTijd([...alleVerzen.map((vers) => vers.bewaard), ...keuzes.map((keuze) => keuze.toegepast)]),
	};
}
