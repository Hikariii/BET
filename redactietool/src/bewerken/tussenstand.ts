import type { Hoofdstuk } from '../formaat/types';
import type { Tussenstand, VersInhoud } from './types';

/** Het deel van de browseropslag dat de tussenstand gebruikt; in tests een eenvoudige vervanger. */
export type Opslag = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Leest de tussenstand van een hoofdstuk; leeg als er niets bewaard is of de opslag onleesbaar is. Wordt ingevuld. */
export function leesTussenstand(_opslag: Opslag, _boek: string, _hoofdstuk: number): Tussenstand {
	return { verzen: {} };
}

export type BewaarUitkomst = { gelukt: true } | { gelukt: false; melding: string };

/** Bewaart de bewerkte inhoud van één vers met de repo-inhoud waarop hij begon; een volle opslag geeft een melding. Wordt ingevuld. */
export function bewaarVers(
	_opslag: Opslag,
	_boek: string,
	_hoofdstuk: number,
	_vers: number,
	_inhoud: VersInhoud,
	_basis: VersInhoud,
): BewaarUitkomst {
	return { gelukt: true };
}

/** Haalt één vers uit de tussenstand (terug naar de versie uit de repo). Wordt ingevuld. */
export function wisVers(_opslag: Opslag, _boek: string, _hoofdstuk: number, _vers: number): void {}

/** Of de repo-inhoud van een bewaard vers nog gelijk is aan de basis van de bewerking. Wordt ingevuld. */
export function isVerouderd(_repo: VersInhoud, _basis: VersInhoud): boolean {
	return false;
}

/** Het hoofdstuk met de bewerkte verzen uit de tussenstand erin. Wordt ingevuld. */
export function pasTussenstandToe(hoofdstuk: Hoofdstuk, _tussenstand: Tussenstand): Hoofdstuk {
	return hoofdstuk;
}
