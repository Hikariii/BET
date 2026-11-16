import { alsBewerktVers, leesTussenstand, tussenstandSleutel, zelfdeInhoud } from '../bewerken/tussenstand';
import type { Opslag } from '../bewerken/tussenstand';
import type { BewerktVers } from '../bewerken/types';
import { alsAntwoord, antwoordenSleutel, leesAntwoorden, schrijfAntwoorden, type Antwoord } from '../antwoorden/antwoorden';
import { alsKeuze, keuzesSleutel, leesKeuzes, schrijfKeuzes, type StructureleKeuze } from '../vervangen/keuzes';
import type { BoekMetHoofdstukken } from './types';

/** De tussenstand van één hoofdstuk in een back-up. */
type BackupHoofdstuk = {
	hoofdstuk: number;
	verzen: Record<number, BewerktVers>;
};

/** Alles wat de browser van één boek bewaart, als één bestand om later terug te laden. */
export type Backup = {
	formaat: 'bet-bewaard';
	versie: 2;
	boek: string;
	/** ISO-tijd van maken. */
	gemaakt: string;
	repoCommit: string | null;
	/** Alleen hoofdstukken met bewerkte verzen. */
	tussenstanden: BackupHoofdstuk[];
	/** Op volgorde van toepassen, oudste eerst, zoals in de opslag. */
	keuzes: StructureleKeuze[];
	/** Antwoorden op vertaalvragen, op volgorde van bewaren. Een back-up van versie 1 heeft ze niet en wordt zonder antwoorden gelezen. */
	antwoorden: Antwoord[];
};

export type LeesUitkomst = { gelukt: true; backup: Backup } | { gelukt: false; melding: string };

export type InlaadModus = 'samenvoegen' | 'vervangen';

/** De bestandsnaam van de back-up, bv. `lukas.bet-bewaard.json`. */
export function backupBestandsnaam(boek: string): string {
	return `${boek}.bet-bewaard.json`;
}

/** Leest de opslag van het boek in één back-up. */
export function maakBackup(opslag: Opslag, boek: BoekMetHoofdstukken, repoCommit: string | null, nu: Date): Backup {
	const tussenstanden = boek.hoofdstukken.flatMap(({ nummer }): BackupHoofdstuk[] => {
		const { verzen } = leesTussenstand(opslag, boek.id, nummer);
		return Object.keys(verzen).length === 0 ? [] : [{ hoofdstuk: nummer, verzen }];
	});
	return {
		formaat: 'bet-bewaard',
		versie: 2,
		boek: boek.id,
		gemaakt: nu.toISOString(),
		repoCommit,
		tussenstanden,
		keuzes: leesKeuzes(opslag, boek.id).reverse(),
		antwoorden: leesAntwoorden(opslag, boek.id),
	};
}

function isObject(waarde: unknown): waarde is Record<string, unknown> {
	return typeof waarde === 'object' && waarde !== null && !Array.isArray(waarde);
}

function fout(melding: string): LeesUitkomst {
	return { gelukt: false, melding };
}

function leesHoofdstuk(waarde: unknown): BackupHoofdstuk | string {
	const hoofdstuk = isObject(waarde) ? waarde['hoofdstuk'] : null;
	if (!isObject(waarde) || typeof hoofdstuk !== 'number' || !Number.isInteger(hoofdstuk) || hoofdstuk < 1 || !isObject(waarde['verzen'])) {
		return 'Een hoofdstuk in de back-up heeft een onbekende vorm.';
	}
	const verzen: Record<number, BewerktVers> = {};
	for (const [versTekst, ruw] of Object.entries(waarde['verzen'])) {
		const nummer = Number(versTekst);
		const vers = alsBewerktVers(ruw);
		if (!Number.isInteger(nummer) || nummer < 1 || vers === null) return `Vers ${hoofdstuk}:${versTekst} in de back-up is onleesbaar.`;
		verzen[nummer] = vers;
	}
	return { hoofdstuk, verzen };
}

function leesAntwoordenUitBackup(waarde: unknown): Antwoord[] | string {
	if (!Array.isArray(waarde)) return 'In de back-up ontbreken de antwoorden.';
	const antwoorden: Antwoord[] = [];
	for (const ruw of waarde) {
		const antwoord = alsAntwoord(ruw);
		if (antwoord === null) return 'Een antwoord in de back-up is onleesbaar.';
		if (antwoorden.some((bestaand) => bestaand.kwestie === antwoord.kwestie)) return 'Een vraag heeft in de back-up twee antwoorden.';
		antwoorden.push(antwoord);
	}
	return antwoorden;
}

/**
 * Controleert een back-upbestand streng: elk onderdeel moet de verwachte vorm hebben, anders wordt het hele bestand geweigerd.
 * `boek` is het boek waarin ingeladen wordt; een back-up van een ander boek wordt geweigerd.
 */
export function leesBackup(tekst: string, boek: string): LeesUitkomst {
	let json: unknown;
	try {
		json = JSON.parse(tekst);
	} catch {
		return fout('Dit bestand is geen back-up: de inhoud is geen geldige JSON.');
	}
	if (!isObject(json) || json['formaat'] !== 'bet-bewaard') {
		return fout('Dit bestand is geen back-up van de redactietool (het formaat is niet "bet-bewaard").');
	}
	const versie = json['versie'];
	if (versie !== 1 && versie !== 2) {
		return fout(`Deze back-up heeft versie ${JSON.stringify(versie)}; deze tool kent alleen versie 1 en 2.`);
	}
	if (json['boek'] !== boek) {
		return fout(`Deze back-up is van het boek "${String(json['boek'])}", niet van "${boek}".`);
	}
	const { gemaakt, repoCommit, tussenstanden: ruweStanden, keuzes: ruweKeuzes } = json;
	if (typeof gemaakt !== 'string' || Number.isNaN(Date.parse(gemaakt))) return fout('In de back-up ontbreekt een geldige datum.');
	if (repoCommit !== null && typeof repoCommit !== 'string') return fout('In de back-up is de repo-commit onleesbaar.');
	if (!Array.isArray(ruweStanden) || !Array.isArray(ruweKeuzes)) return fout('In de back-up ontbreken de bewerkte verzen of de keuzes.');

	const tussenstanden: BackupHoofdstuk[] = [];
	for (const ruw of ruweStanden) {
		const hoofdstuk = leesHoofdstuk(ruw);
		if (typeof hoofdstuk === 'string') return fout(hoofdstuk);
		if (tussenstanden.some((bestaand) => bestaand.hoofdstuk === hoofdstuk.hoofdstuk)) {
			return fout(`Hoofdstuk ${hoofdstuk.hoofdstuk} staat twee keer in de back-up.`);
		}
		tussenstanden.push(hoofdstuk);
	}
	const keuzes: StructureleKeuze[] = [];
	for (const ruw of ruweKeuzes) {
		const keuze = alsKeuze(ruw);
		if (keuze === null) return fout('Een keuze in de back-up is onleesbaar.');
		if (keuzes.some((bestaand) => bestaand.id === keuze.id)) return fout(`De keuze met id ${keuze.id} staat twee keer in de back-up.`);
		keuzes.push(keuze);
	}
	const antwoorden = versie === 1 ? [] : leesAntwoordenUitBackup(json['antwoorden']);
	if (typeof antwoorden === 'string') return fout(antwoorden);
	return { gelukt: true, backup: { formaat: 'bet-bewaard', versie: 2, boek, gemaakt, repoCommit, tussenstanden, keuzes, antwoorden } };
}

/**
 * Wat inladen met een vers uit de back-up doet. `overschrijft`: de back-up is nieuwer en vervangt bij samenvoegen jouw versie.
 * `jouwe-blijft`: jouw versie is nieuwer en blijft bij samenvoegen staan (bij vervangen niet).
 */
type VersVergelijking = { hoofdstuk: number; vers: number; soort: 'nieuw' | 'overschrijft' | 'jouwe-blijft' | 'gelijk' };

type KeuzeVergelijking = { id: string; zoekterm: string; nieuw: string; soort: 'nieuw' | 'gelijk' };

type AntwoordVergelijking = { kwestie: string; optie: string; soort: 'nieuw' | 'overschrijft' | 'jouwe-blijft' | 'gelijk' };

export type InlaadVoorbeeld = {
	/** Per vers in de back-up wat inladen ermee doet, op oplopend hoofdstuk en vers. */
	verzen: VersVergelijking[];
	keuzes: KeuzeVergelijking[];
	/** Per antwoord in de back-up wat inladen ermee doet. */
	antwoorden: AntwoordVergelijking[];
	telling: { nieuw: number; overschrijft: number; jouweBlijft: number; gelijk: number; keuzesNieuw: number; antwoordenNieuw: number };
	/** Wat Vervangen wist omdat het niet in de back-up staat. */
	vervangenWist: { verzen: number; keuzes: number; antwoorden: number };
};

function zelfdeBewerking(lokaal: BewerktVers, uitBackup: BewerktVers): boolean {
	return zelfdeInhoud(lokaal.inhoud, uitBackup.inhoud) && zelfdeInhoud(lokaal.basis, uitBackup.basis);
}

/** Bij samenvoegen wint per vers de nieuwste bewerking; bij gelijke tijd de back-up. */
function lokaalIsNieuwer(lokaal: BewerktVers, uitBackup: BewerktVers): boolean {
	return Date.parse(lokaal.bewaard) > Date.parse(uitBackup.bewaard);
}

function zelfdeAntwoord(lokaal: Antwoord, uitBackup: Antwoord): boolean {
	return lokaal.optie === uitBackup.optie && lokaal.keuzeId === uitBackup.keuzeId && lokaal.gegeven === uitBackup.gegeven;
}

/** Bij samenvoegen wint per kwestie het nieuwste antwoord; bij gelijke tijd de back-up. */
function lokaalAntwoordIsNieuwer(lokaal: Antwoord, uitBackup: Antwoord): boolean {
	return Date.parse(lokaal.gegeven) > Date.parse(uitBackup.gegeven);
}

/** Hoofdstukken waar de opslag of de back-up iets voor heeft, op oplopend nummer. */
function betrokkenHoofdstukken(boek: BoekMetHoofdstukken, backup: Backup): number[] {
	const nummers = new Set([...boek.hoofdstukken.map(({ nummer }) => nummer), ...backup.tussenstanden.map(({ hoofdstuk }) => hoofdstuk)]);
	return [...nummers].sort((een, ander) => een - ander);
}

/** Zegt per vers en per keuze wat inladen doet, zonder iets te schrijven. */
export function voorbeeldInladen(opslag: Opslag, boek: BoekMetHoofdstukken, backup: Backup): InlaadVoorbeeld {
	const verzen: VersVergelijking[] = [];
	let wistVerzen = 0;
	for (const hoofdstuk of betrokkenHoofdstukken(boek, backup)) {
		const lokaal = leesTussenstand(opslag, boek.id, hoofdstuk).verzen;
		const uitBackup = backup.tussenstanden.find((stand) => stand.hoofdstuk === hoofdstuk)?.verzen ?? {};
		for (const [versTekst, bewerkt] of Object.entries(uitBackup)) {
			const vers = Number(versTekst);
			const eigen = lokaal[vers];
			if (eigen === undefined) verzen.push({ hoofdstuk, vers, soort: 'nieuw' });
			else if (zelfdeBewerking(eigen, bewerkt)) verzen.push({ hoofdstuk, vers, soort: 'gelijk' });
			else verzen.push({ hoofdstuk, vers, soort: lokaalIsNieuwer(eigen, bewerkt) ? 'jouwe-blijft' : 'overschrijft' });
		}
		wistVerzen += Object.keys(lokaal).filter((vers) => !(Number(vers) in uitBackup)).length;
	}
	const lokaleKeuzes = leesKeuzes(opslag, boek.id);
	const keuzes = backup.keuzes.map(({ id, zoekterm, nieuw }): KeuzeVergelijking => ({
		id,
		zoekterm,
		nieuw,
		soort: lokaleKeuzes.some((lokaal) => lokaal.id === id) ? 'gelijk' : 'nieuw',
	}));
	const lokaleAntwoorden = leesAntwoorden(opslag, boek.id);
	const antwoorden = backup.antwoorden.map((uitBackup): AntwoordVergelijking => {
		const { kwestie, optie } = uitBackup;
		const eigen = lokaleAntwoorden.find((lokaal) => lokaal.kwestie === kwestie);
		if (eigen === undefined) return { kwestie, optie, soort: 'nieuw' };
		if (zelfdeAntwoord(eigen, uitBackup)) return { kwestie, optie, soort: 'gelijk' };
		return { kwestie, optie, soort: lokaalAntwoordIsNieuwer(eigen, uitBackup) ? 'jouwe-blijft' : 'overschrijft' };
	});
	const soortAantal = (soort: VersVergelijking['soort']) => verzen.filter((vers) => vers.soort === soort).length;
	return {
		verzen,
		keuzes,
		antwoorden,
		telling: {
			nieuw: soortAantal('nieuw'),
			overschrijft: soortAantal('overschrijft'),
			jouweBlijft: soortAantal('jouwe-blijft'),
			gelijk: soortAantal('gelijk'),
			keuzesNieuw: keuzes.filter((keuze) => keuze.soort === 'nieuw').length,
			antwoordenNieuw: antwoorden.filter((antwoord) => antwoord.soort === 'nieuw').length,
		},
		vervangenWist: {
			verzen: wistVerzen,
			keuzes: lokaleKeuzes.filter((lokaal) => !backup.keuzes.some((keuze) => keuze.id === lokaal.id)).length,
			antwoorden: lokaleAntwoorden.filter((lokaal) => !backup.antwoorden.some((antwoord) => antwoord.kwestie === lokaal.kwestie)).length,
		},
	};
}

export type InlaadUitkomst = {
	/** Het aantal verzen, keuzes en antwoorden dat nu in de opslag staat dankzij het inladen. */
	geschreven: { verzen: number; keuzes: number; antwoorden: number };
	/** Leeg als alles gelukt is. */
	meldingen: string[];
};

function schrijfHoofdstuk(opslag: Opslag, boek: string, hoofdstuk: number, verzen: Record<number, BewerktVers>): boolean {
	try {
		opslag.setItem(tussenstandSleutel(boek, hoofdstuk), JSON.stringify({ verzen }));
		return true;
	} catch {
		return false;
	}
}

function nietBewaard(hoofdstuk: number): string {
	return `Hoofdstuk ${hoofdstuk} kon niet in de browser worden bewaard, waarschijnlijk is de opslag vol.`;
}

const KEUZES_NIET_BEWAARD = 'De keuzes konden niet in de browser worden bewaard, waarschijnlijk is de opslag vol.';
const ANTWOORDEN_NIET_BEWAARD = 'De antwoorden konden niet in de browser worden bewaard, waarschijnlijk is de opslag vol.';

function voegSamen(opslag: Opslag, boek: string, backup: Backup): InlaadUitkomst {
	const meldingen: string[] = [];
	const geschreven = { verzen: 0, keuzes: 0, antwoorden: 0 };
	for (const { hoofdstuk, verzen: uitBackup } of backup.tussenstanden) {
		const verzen = leesTussenstand(opslag, boek, hoofdstuk).verzen;
		let veranderd = 0;
		for (const [versTekst, bewerkt] of Object.entries(uitBackup)) {
			const eigen = verzen[Number(versTekst)];
			if (eigen !== undefined && (zelfdeBewerking(eigen, bewerkt) || lokaalIsNieuwer(eigen, bewerkt))) continue;
			verzen[Number(versTekst)] = bewerkt;
			veranderd++;
		}
		if (veranderd === 0) continue;
		if (schrijfHoofdstuk(opslag, boek, hoofdstuk, verzen)) geschreven.verzen += veranderd;
		else meldingen.push(nietBewaard(hoofdstuk));
	}
	const lokaal = leesKeuzes(opslag, boek).reverse();
	const nieuweKeuzes = backup.keuzes.filter((keuze) => !lokaal.some((eigen) => eigen.id === keuze.id));
	if (nieuweKeuzes.length > 0) {
		const samen = [...lokaal, ...nieuweKeuzes].sort((een, ander) => Date.parse(een.toegepast) - Date.parse(ander.toegepast));
		if (schrijfKeuzes(opslag, boek, samen)) geschreven.keuzes += nieuweKeuzes.length;
		else meldingen.push(KEUZES_NIET_BEWAARD);
	}
	const lokaleAntwoorden = leesAntwoorden(opslag, boek);
	const samenAntwoorden = [...lokaleAntwoorden];
	let veranderdeAntwoorden = 0;
	for (const antwoord of backup.antwoorden) {
		const index = samenAntwoorden.findIndex((eigen) => eigen.kwestie === antwoord.kwestie);
		const eigen = samenAntwoorden[index];
		if (eigen === undefined) samenAntwoorden.push(antwoord);
		else if (zelfdeAntwoord(eigen, antwoord) || lokaalAntwoordIsNieuwer(eigen, antwoord)) continue;
		else samenAntwoorden[index] = antwoord;
		veranderdeAntwoorden++;
	}
	if (veranderdeAntwoorden > 0) {
		if (schrijfAntwoorden(opslag, boek, samenAntwoorden)) geschreven.antwoorden += veranderdeAntwoorden;
		else meldingen.push(ANTWOORDEN_NIET_BEWAARD);
	}
	return { geschreven, meldingen };
}

function vervang(opslag: Opslag, boek: BoekMetHoofdstukken, backup: Backup): InlaadUitkomst {
	const sleutels = [...betrokkenHoofdstukken(boek, backup).map((hoofdstuk) => tussenstandSleutel(boek.id, hoofdstuk)), keuzesSleutel(boek.id), antwoordenSleutel(boek.id)];
	const oudeWaarden = new Map(sleutels.map((sleutel) => [sleutel, opslag.getItem(sleutel)]));
	for (const sleutel of sleutels) opslag.removeItem(sleutel);

	const meldingen: string[] = [];
	const geschreven = { verzen: 0, keuzes: 0, antwoorden: 0 };
	for (const { hoofdstuk, verzen } of backup.tussenstanden) {
		if (schrijfHoofdstuk(opslag, boek.id, hoofdstuk, verzen)) geschreven.verzen += Object.keys(verzen).length;
		else meldingen.push(nietBewaard(hoofdstuk));
	}
	if (backup.keuzes.length > 0) {
		if (schrijfKeuzes(opslag, boek.id, backup.keuzes)) geschreven.keuzes = backup.keuzes.length;
		else meldingen.push(KEUZES_NIET_BEWAARD);
	}
	if (backup.antwoorden.length > 0) {
		if (schrijfAntwoorden(opslag, boek.id, backup.antwoorden)) geschreven.antwoorden = backup.antwoorden.length;
		else meldingen.push(ANTWOORDEN_NIET_BEWAARD);
	}
	if (meldingen.length === 0) return { geschreven, meldingen };

	try {
		for (const [sleutel, waarde] of oudeWaarden) {
			if (waarde === null) opslag.removeItem(sleutel);
			else opslag.setItem(sleutel, waarde);
		}
		return { geschreven: { verzen: 0, keuzes: 0, antwoorden: 0 }, meldingen: [...meldingen, 'Er is niets veranderd: de oude stand is teruggezet.'] };
	} catch {
		return { geschreven, meldingen: [...meldingen, 'De oude stand kon niet worden teruggezet. Laad de back-up opnieuw of kopieer je tekst.'] };
	}
}

/**
 * Schrijft de back-up in de opslag.
 * Samenvoegen houdt wat er is; bij een vers of een antwoord in beide wint het nieuwste, bij gelijke tijd de back-up; keuzes die al bestaan blijven.
 * Vervangen wist eerst alles van dit boek; lukt het schrijven niet helemaal, dan komt de oude stand terug.
 */
export function pasBackupToe(opslag: Opslag, boek: BoekMetHoofdstukken, backup: Backup, modus: InlaadModus): InlaadUitkomst {
	return modus === 'samenvoegen' ? voegSamen(opslag, boek.id, backup) : vervang(opslag, boek, backup);
}
