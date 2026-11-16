import type { BewaardeKeuze, BewaardOverzicht } from '../../bewaren/overzicht';
import { keuzeBeschrijving } from '../begrippen/vervangenVoorbeeld';

export function meervoud(aantal: number, enkelvoud: string, meervoudsvorm: string): string {
	return `${aantal} ${aantal === 1 ? enkelvoud : meervoudsvorm}`;
}

const TIJD = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' });
const DATUM_EN_TIJD = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function zelfdeDag(een: Date, ander: Date): boolean {
	return een.toDateString() === ander.toDateString();
}

/** Alleen de tijd als het vandaag was (`14:32`), anders ook de datum (`15 nov, 09:00`). */
export function tijdVan(iso: string, nu: Date = new Date()): string {
	const moment = new Date(iso);
	return (zelfdeDag(moment, nu) ? TIJD : DATUM_EN_TIJD).format(moment);
}

/** Het aantal verzen, hoofdstukken, vervangingen, antwoorden en reacties in één zin, zonder de tijd: "12 verzen in 3 hoofdstukken, 1 antwoord, 2 reacties". */
export function bewaarTelling(overzicht: BewaardOverzicht): string {
	const { verzen, hoofdstukken, keuzes, antwoorden, reacties } = overzicht.totaal;
	if (verzen === 0 && keuzes === 0 && antwoorden === 0 && reacties === 0) return 'nog niets';
	const delen: string[] = [];
	if (verzen > 0) delen.push(`${meervoud(verzen, 'vers', 'verzen')} in ${meervoud(hoofdstukken, 'hoofdstuk', 'hoofdstukken')}`);
	if (keuzes > 0) delen.push(meervoud(keuzes, 'vervanging', 'vervangingen'));
	if (antwoorden > 0) delen.push(meervoud(antwoorden, 'antwoord', 'antwoorden'));
	if (reacties > 0) delen.push(meervoud(reacties, 'reactie', 'reacties'));
	return delen.join(', ');
}

/** De regel voor de bewaarstatus: "Opgeslagen in deze browser · 12 verzen in 3 hoofdstukken · 14:32". */
export function bewaarRegel(overzicht: BewaardOverzicht, nu: Date = new Date()): string {
	if (overzicht.laatstBewaard === null) return 'Nog niets opgeslagen in deze browser';
	const delen = ['Opgeslagen in deze browser', bewaarTelling(overzicht), tijdVan(overzicht.laatstBewaard, nu)];
	if (overzicht.totaal.verouderd > 0) delen.push(`${overzicht.totaal.verouderd} door Claude veranderd`);
	return delen.join(' · ');
}

function somOp(delen: readonly string[]): string {
	return delen.length <= 1 ? (delen[0] ?? '') : `${delen.slice(0, -1).join(', ')} en ${delen.at(-1)}`;
}

/**
 * De melding bij bewerkingen waar Claude de tekst sinds de bewerking heeft veranderd: welke plekken, wat te doen en hoe de eigen wijziging terug te zetten.
 * `plekken` zijn al leesbaar ("vers 12"); `voordat` zegt wanneer de lezer de tekst moet nalezen ("voordat je kopieert").
 */
export function verouderdMelding(plekken: readonly string[], voordat: string): string {
	const enkel = plekken.length === 1;
	return `Claude heeft ${somOp(plekken)} veranderd nadat jij ${enkel ? 'het' : 'ze'} bewerkte. Lees je tekst na ${voordat}. Wil je de tekst van Claude, kies dan bij ${enkel ? 'dat vers' : 'zo\'n vers'} Vers terugzetten (je eigen wijziging gaat dan weg).`;
}

/** Een toegepaste vervanging in één zin, ook bij een markeringswissel: `"Gezegend" door "Geprezen", 9 verzen, toegepast 11:02.` */
export function vervangingRegel(keuze: BewaardeKeuze, nu: Date = new Date()): string {
	return `${keuzeBeschrijving(keuze)}, ${meervoud(keuze.aantalVerzen, 'vers', 'verzen')}, toegepast ${tijdVan(keuze.toegepast, nu)}.`;
}
