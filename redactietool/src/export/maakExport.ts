import type { HoofdstukData } from '../data/types';
import type { Tussenstand } from '../bewerken/types';
import type { RedactieExport } from './types';

export type ExportInvoer = {
	boek: string;
	/** Het hoofdstuk zoals in de repo (zonder tussenstand). */
	hoofdstuk: HoofdstukData;
	tussenstand: Tussenstand;
	repoCommit: string | null;
	toelichting: string;
	/** Tijd van maken; meegegeven zodat tests vast kunnen staan. */
	nu: Date;
};

/** Maakt de export voor Claude uit de bewerkte verzen van een hoofdstuk. Wordt ingevuld. */
export function maakExport(invoer: ExportInvoer): RedactieExport {
	return {
		formaat: 'bet-redactie-export',
		versie: 1,
		boek: invoer.boek,
		hoofdstuk: invoer.hoofdstuk.nummer,
		repoCommit: invoer.repoCommit,
		gemaakt: invoer.nu.toISOString(),
		toelichting: invoer.toelichting,
		verzen: [],
		structureleKeuzes: [],
		beantwoordeVragen: [],
	};
}

/** De bestandsnaam van de export, bv. `lukas-04.redactie.json`. Wordt ingevuld. */
export function exportBestandsnaam(prefix: string, hoofdstuk: number): string {
	return `${prefix}-${hoofdstuk}.redactie.json`;
}
