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
