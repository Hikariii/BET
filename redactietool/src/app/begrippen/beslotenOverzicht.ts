import type { GetelPrecedent } from '../../begrippen/telPrecedenten';
import { meervoud } from '../bewaren/bewaarTekst';

export const STATUSFILTERS = [
	{ waarde: 'alle', label: 'Alle statussen' },
	{ waarde: 'voorlopig', label: 'Voorlopig' },
	{ waarde: 'vast', label: 'Vast' },
] as const;

export type Statusfilter = (typeof STATUSFILTERS)[number]['waarde'];

export function isStatusfilter(waarde: string): waarde is Statusfilter {
	return STATUSFILTERS.some((filter) => filter.waarde === waarde);
}

/** Of de telling onzeker is: de telregel meldt een opmerking (haakjes genegeerd, Plaats niet teruggevonden). */
function isOnzeker(telling: GetelPrecedent): boolean {
	return telling.opmerkingen.length > 0;
}

/** Volgorde van de groepen: eerst wat zeker nog niet is toegepast, dan hetzelfde met een onzekere telling, dan de rest, en wat niet te tellen is onderaan. */
function groep(telling: GetelPrecedent): number {
	if (!telling.telbaar) return 3;
	if (telling.nietToegepast.length === 0) return 2;
	return isOnzeker(telling) ? 1 : 0;
}

export function metBronvormNogEerst(een: GetelPrecedent, ander: GetelPrecedent): number {
	return groep(een) - groep(ander) || ander.nietToegepast.length - een.nietToegepast.length || ander.toegepast.length - een.toegepast.length;
}

export function pastBijZoekterm(telling: GetelPrecedent, zoekterm: string): boolean {
	const gezocht = zoekterm.trim().toLowerCase();
	if (gezocht === '') return true;
	const { bron, vereenvoudigd } = telling.precedent;
	return bron.toLowerCase().includes(gezocht) || vereenvoudigd.toLowerCase().includes(gezocht);
}

export function pastBijStatus(telling: GetelPrecedent, filter: Statusfilter): boolean {
	return filter === 'alle' || telling.precedent.status === filter;
}

/** Alleen een telling zonder opmerking is zeker genoeg om het getal als "nog oud" te markeren; bij een onzekere telling kan een getal te hoog of te laag zijn. */
export function staatZekerNogOud(telling: GetelPrecedent): boolean {
	return telling.nietToegepast.length > 0 && !isOnzeker(telling);
}

/** De kopregel boven de tabel. */
export function beslotenSamenvatting(zichtbaar: readonly GetelPrecedent[], totaal: number): string {
	const metBronvormNog = zichtbaar.filter((telling) => telling.nietToegepast.length > 0);
	const waarvanOnzeker = metBronvormNog.filter(isOnzeker);
	const aantal = zichtbaar.length === totaal ? meervoud(totaal, 'vertaalkeuze', 'vertaalkeuzes') : `${zichtbaar.length} van ${totaal} vertaalkeuzes`;
	const nietZeker = waarvanOnzeker.length > 0 ? ` (bij ${waarvanOnzeker.length} daarvan is dat niet zeker)` : '';
	return `${aantal}. Bij ${metBronvormNog.length} staat de oude vorm nog in de tekst${nietZeker}.`;
}

/** Sleutel van een rij: bron en vereenvoudigd samen zijn uniek over alle precedenten. */
export function precedentSleutel(telling: GetelPrecedent): string {
	return `${telling.precedent.bron}\u0000${telling.precedent.vereenvoudigd}`;
}
