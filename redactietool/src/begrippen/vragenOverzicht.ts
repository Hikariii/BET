import type { Vertaalvraag, VraagStatus } from './types';

export type VragenFilter = {
	status: VraagStatus | 'alle';
	herkomst: 'alle' | 'register' | 'logs';
	hoofdstuk: number | 'alle';
	zoekterm: string;
};

export const GEEN_FILTER: VragenFilter = { status: 'alle', herkomst: 'alle', hoofdstuk: 'alle', zoekterm: '' };

/** Een vraag hoort bij een hoofdstuk als ze uit het log van dat hoofdstuk komt of een van haar verzen erin staat. */
function hoortBijHoofdstuk(vraag: Vertaalvraag, hoofdstuk: number): boolean {
	const uitLog = vraag.herkomst.soort !== 'register' && vraag.herkomst.hoofdstuk === hoofdstuk;
	return uitLog || vraag.verzen.some((ref) => ref.hoofdstuk === hoofdstuk);
}

function bevatTekst(vraag: Vertaalvraag, zoekterm: string): boolean {
	const doorzoekbaar = [vraag.kwestie, vraag.tekst, vraag.gekozen ?? '', vraag.alternatief ?? ''].join('\n').toLowerCase();
	return doorzoekbaar.includes(zoekterm.trim().toLowerCase());
}

/** Houdt de volgorde van `vragen`. */
export function filterVragen(vragen: readonly Vertaalvraag[], filter: VragenFilter): Vertaalvraag[] {
	return vragen.filter(
		(vraag) =>
			(filter.status === 'alle' || vraag.status === filter.status) &&
			(filter.herkomst === 'alle' || (filter.herkomst === 'register') === (vraag.herkomst.soort === 'register')) &&
			(filter.hoofdstuk === 'alle' || hoortBijHoofdstuk(vraag, filter.hoofdstuk)) &&
			bevatTekst(vraag, filter.zoekterm),
	);
}

export type HoofdstukVragen = { hoofdstuk: number; vragen: Vertaalvraag[] };

/** De vragen uit de logs, per hoofdstuk van het log (oplopend); binnen een hoofdstuk blijft de volgorde van `vragen`. */
export function groepeerLogVragen(vragen: readonly Vertaalvraag[]): HoofdstukVragen[] {
	const groepen = new Map<number, Vertaalvraag[]>();
	for (const vraag of vragen) {
		if (vraag.herkomst.soort === 'register') continue;
		const groep = groepen.get(vraag.herkomst.hoofdstuk) ?? [];
		groep.push(vraag);
		groepen.set(vraag.herkomst.hoofdstuk, groep);
	}
	return [...groepen].map(([hoofdstuk, groepVragen]) => ({ hoofdstuk, vragen: groepVragen })).sort((a, b) => a.hoofdstuk - b.hoofdstuk);
}

export type OpenEnOverig = { open: Vertaalvraag[]; overig: Vertaalvraag[] };

/** Splitst in de open vragen (register en logs samen) en de rest; beide houden de volgorde van `vragen`, geen vraag staat in beide. */
export function splitsOpenVragen(vragen: readonly Vertaalvraag[]): OpenEnOverig {
	return {
		open: vragen.filter((vraag) => vraag.status === 'open'),
		overig: vragen.filter((vraag) => vraag.status !== 'open'),
	};
}

function sleutelBasis({ herkomst, kwestie }: Vertaalvraag): string {
	if (herkomst.soort === 'register') return `register-${kwestie}`;
	if (herkomst.soort === 'hoofdstuk') return `hoofdstuk-${herkomst.hoofdstuk}-${herkomst.nummer}`;
	return `vers-${herkomst.hoofdstuk}-${herkomst.vers}`;
}

/**
 * Een vaste sleutel per vraag, afgeleid uit de herkomst, zodat de weergave van een vraag bij filteren dezelfde blijft.
 * Hoort meer dan één vraag bij dezelfde basis (twee vragen bij één vers), dan telt een volgnummer in de volgorde van `vragen` mee.
 */
export function vraagSleutels(vragen: readonly Vertaalvraag[]): Map<Vertaalvraag, string> {
	const gezien = new Map<string, number>();
	const sleutels = new Map<Vertaalvraag, string>();
	for (const vraag of vragen) {
		const basis = sleutelBasis(vraag);
		const volgnummer = (gezien.get(basis) ?? 0) + 1;
		gezien.set(basis, volgnummer);
		sleutels.set(vraag, `${basis}-${volgnummer}`);
	}
	return sleutels;
}
