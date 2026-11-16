import { backupBestandsnaam } from '../../bewaren/backup';
import type { BewaardOverzicht } from '../../bewaren/overzicht';
import { tijdVan } from './bewaarTekst';

const DAG_IN_MS = 24 * 60 * 60 * 1000;

/** Vanaf hoeveel dagen een back-up (of een bewerking zonder back-up) oud genoeg is voor een herinnering. */
export const HERINNERING_NA_DAGEN = 7;

/** Het aantal kalenderdagen tussen twee momenten in de lokale tijd; 0 is dezelfde dag. Een moment in de toekomst telt als vandaag. */
function dagenTussen(eerder: Date, nu: Date): number {
	const eerderDag = new Date(eerder.getFullYear(), eerder.getMonth(), eerder.getDate());
	const nuDag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate());
	return Math.max(0, Math.round((nuDag.getTime() - eerderDag.getTime()) / DAG_IN_MS));
}

/** Hoe lang geleden in gewone woorden: "vandaag", "gisteren", "3 dagen geleden", "2 weken geleden", "3 maanden geleden". */
export function tijdGeleden(iso: string, nu: Date): string {
	const dagen = dagenTussen(new Date(iso), nu);
	if (dagen === 0) return 'vandaag';
	if (dagen === 1) return 'gisteren';
	if (dagen < 14) return `${dagen} dagen geleden`;
	if (dagen < 60) return `${Math.floor(dagen / 7)} weken geleden`;
	return `${Math.floor(dagen / 30)} maanden geleden`;
}

/** "Laatste back-up: nooit" of "Laatste back-up: vandaag (14:32)"; een eerdere dag krijgt ook de datum: "gisteren (15 nov, 09:00)". */
export function laatsteBackupRegel(laatsteBackup: string | null, nu: Date): string {
	return `Laatste back-up: ${laatsteBackup === null ? 'nooit' : `${tijdGeleden(laatsteBackup, nu)} (${tijdVan(laatsteBackup, nu)})`}`;
}

/** Het moment van elke bewerkte vers, elke toegepaste vervanging, elk antwoord en elke reactie, ook op de richtlijn. */
function bewerkingTijden(overzicht: BewaardOverzicht): number[] {
	return [
		...overzicht.hoofdstukken.flatMap((hoofdstuk) => hoofdstuk.verzen.map((vers) => Date.parse(vers.bewaard))),
		...overzicht.keuzes.map((keuze) => Date.parse(keuze.toegepast)),
		...overzicht.antwoorden.map((antwoord) => Date.parse(antwoord.gegeven)),
		...overzicht.reacties.map((reactie) => Date.parse(reactie.gegeven)),
		...overzicht.richtlijnReacties.map((reactie) => Date.parse(reactie.gegeven)),
	].filter((tijd) => !Number.isNaN(tijd));
}

/**
 * De zachte herinnering om een back-up te maken, of `null` als dat nog niet hoeft.
 * Met een back-up: er is na die back-up bewerkt en de back-up is meer dan 7 dagen oud.
 * Zonder back-up: de oudste bewerking is meer dan 7 dagen oud.
 */
export function backupHerinnering(overzicht: BewaardOverzicht, laatsteBackup: string | null, nu: Date): string | null {
	const tijden = bewerkingTijden(overzicht);
	const grens = nu.getTime() - HERINNERING_NA_DAGEN * DAG_IN_MS;
	if (laatsteBackup === null) {
		return Math.min(...tijden) < grens ? 'Maak een back-up: je hebt er nog geen gemaakt.' : null;
	}
	const backupMs = Date.parse(laatsteBackup);
	const bewerktNaBackup = tijden.some((tijd) => tijd > backupMs);
	return bewerktNaBackup && backupMs < grens ? `Maak een back-up: je laatste is van ${tijdGeleden(laatsteBackup, nu)}.` : null;
}

function tweeCijfers(getal: number): string {
	return String(getal).padStart(2, '0');
}

/** De bestandsnaam van een back-up met datum en tijd in de lokale tijd, zodat de nieuwste te zien is: `lukas.bet-bewaard-2026-11-16-1103.json`. */
export function backupBestandsnaamMetTijd(boek: string, nu: Date): string {
	const datum = `${nu.getFullYear()}-${tweeCijfers(nu.getMonth() + 1)}-${tweeCijfers(nu.getDate())}`;
	const tijd = `${tweeCijfers(nu.getHours())}${tweeCijfers(nu.getMinutes())}`;
	return backupBestandsnaam(boek).replace(/\.json$/, `-${datum}-${tijd}.json`);
}
