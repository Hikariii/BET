import { levendeKeuzeIds, type Antwoord } from '../antwoorden/antwoorden';
import type { HoofdstukData, VersRef } from '../data/types';
import { serialiseerHoofdstuk } from '../formaat/serialiseer';
import { isBewerkingVerouderd } from '../bewerken/tussenstand';
import type { Tussenstand, VersInhoud } from '../bewerken/types';
import { knipVers } from '../bewerken/versknip';
import { waarschuwingenVoorVers } from '../bewerken/waarschuwingen';
import type { StructureleKeuze } from '../vervangen/keuzes';
import type { ExportAntwoord, ExportKeuze, GewijzigdVers, RedactieExport } from './types';

export type ExportInvoer = {
	boek: string;
	/** Het hoofdstuk zoals in de repo (zonder tussenstand). */
	hoofdstuk: HoofdstukData;
	tussenstand: Tussenstand;
	/** Alle keuzes van het boek, in willekeurige volgorde; de export neemt de keuzes die dit hoofdstuk raken. */
	keuzes: readonly StructureleKeuze[];
	/** Alle antwoorden van het boek. */
	antwoorden: readonly Antwoord[];
	/** De verzen per kwestie uit de ingelezen open vragen; een kwestie die er niet in staat, heeft geen verzen. */
	vraagVerzen: ReadonlyMap<string, readonly VersRef[]>;
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
		herkomst: bewerkt.herkomst,
		keuzeId: bewerkt.herkomst === 'structurele keuze' ? bewerkt.keuzeId : null,
		waarschuwingen: bron === null ? [] : waarschuwingenVoorVers(bron, bewerkt.inhoud).map((waarschuwing) => waarschuwing.tekst),
		verouderd,
	};
}

function plekNaam(hoofdstuk: number, vers: number): string {
	return `${hoofdstuk}:${vers}`;
}

/**
 * De keuze met de plekken van dit hoofdstuk, of `null` als de keuze dit hoofdstuk niet raakt.
 * De vraag staat er alleen bij als het antwoord op die vraag deze keuze nog noemt.
 */
function exportKeuze(keuze: StructureleKeuze, hoofdstuk: number, antwoorden: readonly Antwoord[]): ExportKeuze | null {
	const toegepast = keuze.verzen.filter((vers) => vers.hoofdstuk === hoofdstuk).map((vers) => plekNaam(vers.hoofdstuk, vers.vers));
	const overgeslagen = keuze.overgeslagen
		.filter((plek) => plek.hoofdstuk === hoofdstuk)
		.map(({ hoofdstuk: plekHoofdstuk, vers, gevonden, reden }) => ({ plek: plekNaam(plekHoofdstuk, vers), gevonden, reden }));
	if (toegepast.length === 0 && overgeslagen.length === 0) return null;
	const hoofdstukken = new Set([...keuze.verzen.map((vers) => vers.hoofdstuk), ...keuze.overgeslagen.map((plek) => plek.hoofdstuk)]);
	return {
		id: keuze.id,
		soort: keuze.soort,
		zoekterm: keuze.zoekterm,
		nieuw: keuze.nieuw,
		van: keuze.van,
		naar: keuze.naar,
		varianten: keuze.varianten,
		vraag: antwoorden.some((antwoord) => antwoord.kwestie === keuze.vraag && antwoord.keuzeIds.includes(keuze.id)) ? keuze.vraag : null,
		aantalToegepasteVerzen: keuze.verzen.length,
		hoofdstukken: [...hoofdstukken].sort((een, ander) => een - ander),
		toegepast,
		overgeslagen,
	};
}

/**
 * Het antwoord met de verzen van zijn vraag, of `null` als het niet in de export van dit hoofdstuk hoort.
 * Hangen er bestaande keuzes onder (`bestaandeKeuzes`: alle keuzes van het boek), dan hoort het antwoord bij het hoofdstuk waar een van die keuzes iets raakt (`keuzeIds`: die van deze export);
 * zonder bestaande keuze bij een hoofdstuk in de verzen van de vraag, of bij elk hoofdstuk als de vraag geen verzen heeft.
 */
function exportAntwoord(antwoord: Antwoord, keuzeIds: ReadonlySet<string>, bestaandeKeuzes: ReadonlySet<string>, invoer: ExportInvoer): ExportAntwoord | null {
	const vraagVerzen = invoer.vraagVerzen.get(antwoord.kwestie) ?? [];
	const verzen = vraagVerzen.map(({ hoofdstuk, vers }) => plekNaam(hoofdstuk, vers));
	if (levendeKeuzeIds(antwoord, bestaandeKeuzes).length === 0) {
		const hoortBij = vraagVerzen.length === 0 || vraagVerzen.some(({ hoofdstuk }) => hoofdstuk === invoer.hoofdstuk.nummer);
		return hoortBij ? { ...antwoord, keuzeIds: [], verzen } : null;
	}
	const hier = levendeKeuzeIds(antwoord, keuzeIds);
	return hier.length > 0 ? { ...antwoord, keuzeIds: hier, verzen } : null;
}

/** Maakt de export voor Claude uit de bewerkte verzen van een hoofdstuk, op oplopend versnummer. */
export function maakExport(invoer: ExportInvoer): RedactieExport {
	// Sleutels die gehele getallen zijn, komen in JavaScript altijd oplopend terug.
	const nummers = Object.keys(invoer.tussenstand.verzen).map(Number);
	const verzen = nummers.flatMap((nummer) => gewijzigdVers(nummer, invoer) ?? []);
	const keuzes = [...invoer.keuzes].sort((een, ander) => Date.parse(een.toegepast) - Date.parse(ander.toegepast));
	const structureleKeuzes = keuzes.flatMap((keuze) => exportKeuze(keuze, invoer.hoofdstuk.nummer, invoer.antwoorden) ?? []);
	const keuzeIds = new Set(structureleKeuzes.map((keuze) => keuze.id));
	const bestaandeKeuzes = new Set(invoer.keuzes.map((keuze) => keuze.id));
	return {
		formaat: 'bet-redactie-export',
		versie: 3,
		boek: invoer.boek,
		hoofdstuk: invoer.hoofdstuk.nummer,
		repoCommit: invoer.repoCommit,
		gemaakt: invoer.nu.toISOString(),
		toelichting: invoer.toelichting,
		verzen,
		structureleKeuzes,
		beantwoordeVragen: invoer.antwoorden.flatMap((antwoord) => exportAntwoord(antwoord, keuzeIds, bestaandeKeuzes, invoer) ?? []),
	};
}

/** De bestandsnaam van de export, bv. `lukas-04.redactie.json`. */
export function exportBestandsnaam(prefix: string, hoofdstuk: number): string {
	return `${prefix}-${String(hoofdstuk).padStart(2, '0')}.redactie.json`;
}
