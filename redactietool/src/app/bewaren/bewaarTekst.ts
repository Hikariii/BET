import type { BewaardOverzicht } from '../../bewaren/overzicht';

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

/** Het aantal verzen, hoofdstukken en keuzes in één zin, zonder de tijd: "12 verzen in 3 hoofdstukken". */
export function bewaarTelling(overzicht: BewaardOverzicht): string {
	const { verzen, hoofdstukken, keuzes } = overzicht.totaal;
	if (verzen === 0 && keuzes === 0) return 'nog niets';
	const delen: string[] = [];
	if (verzen > 0) delen.push(`${meervoud(verzen, 'vers', 'verzen')} in ${meervoud(hoofdstukken, 'hoofdstuk', 'hoofdstukken')}`);
	if (keuzes > 0) delen.push(meervoud(keuzes, 'keuze', 'keuzes'));
	return delen.join(', ');
}

/** De regel voor de bewaarstatus: "Opgeslagen in deze browser · 12 verzen in 3 hoofdstukken · 14:32". */
export function bewaarRegel(overzicht: BewaardOverzicht, nu: Date = new Date()): string {
	if (overzicht.laatstBewaard === null) return 'Nog niets opgeslagen in deze browser';
	const delen = ['Opgeslagen in deze browser', bewaarTelling(overzicht), tijdVan(overzicht.laatstBewaard, nu)];
	if (overzicht.totaal.verouderd > 0) delen.push(`${overzicht.totaal.verouderd} verouderd`);
	return delen.join(' · ');
}
