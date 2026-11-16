import type { HoofdstukData } from '../data/types';
import { serialiseerHoofdstuk } from '../formaat/serialiseer';
import { isBewerkingVerouderd } from '../bewerken/tussenstand';
import type { Tussenstand, VersInhoud } from '../bewerken/types';
import { knipVers } from '../bewerken/versknip';
import { waarschuwingenVoorVers } from '../bewerken/waarschuwingen';
import type { GewijzigdVers, RedactieExport } from './types';

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

/** Eén regel per deel van het vers in FORMAAT-notatie, met de alineastijl als `@stijl` voorop. */
function opFormaatRegels(inhoud: VersInhoud): string[] {
	return inhoud.delen.map((deel) =>
		serialiseerHoofdstuk({ alineas: [{ soort: 'tekst', stijl: deel.stijl, stukken: deel.stukken }] }).slice(0, -1),
	);
}

function gewijzigdVers(nummer: number, invoer: ExportInvoer): GewijzigdVers | null {
	const bewerkt = invoer.tussenstand.verzen[nummer];
	if (bewerkt === undefined) return null;
	const repo = knipVers(invoer.hoofdstuk.vereenvoudigd, nummer);
	const bron = knipVers(invoer.hoofdstuk.bron, nummer);
	// Een vers dat uit de repo verdwenen is of een andere indeling heeft, geeft Claude de bewerking zonder plek: verouderd.
	const verouderd = isBewerkingVerouderd(repo, bewerkt);
	return {
		vers: nummer,
		repo: repo === null ? [] : opFormaatRegels(repo),
		bewerkt: opFormaatRegels(bewerkt.inhoud),
		herkomst: bewerkt.herkomst ?? 'zelf getypt',
		waarschuwingen: bron === null ? [] : waarschuwingenVoorVers(bron, bewerkt.inhoud).map((waarschuwing) => waarschuwing.tekst),
		verouderd,
	};
}

/** Maakt de export voor Claude uit de bewerkte verzen van een hoofdstuk, op oplopend versnummer. */
export function maakExport(invoer: ExportInvoer): RedactieExport {
	// Sleutels die gehele getallen zijn, komen in JavaScript altijd oplopend terug.
	const nummers = Object.keys(invoer.tussenstand.verzen).map(Number);
	const verzen = nummers.flatMap((nummer) => gewijzigdVers(nummer, invoer) ?? []);
	return {
		formaat: 'bet-redactie-export',
		versie: 1,
		boek: invoer.boek,
		hoofdstuk: invoer.hoofdstuk.nummer,
		repoCommit: invoer.repoCommit,
		gemaakt: invoer.nu.toISOString(),
		toelichting: invoer.toelichting,
		verzen,
		structureleKeuzes: [],
		beantwoordeVragen: [],
	};
}

/** De bestandsnaam van de export, bv. `lukas-04.redactie.json`. */
export function exportBestandsnaam(prefix: string, hoofdstuk: number): string {
	return `${prefix}-${String(hoofdstuk).padStart(2, '0')}.redactie.json`;
}
