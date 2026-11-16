import type { Vertaalvraag } from './types';

/** Waar de lezer op filtert: de status, waarbij "open" alleen een open vraag uit het register is en een opmerking met een statuswoord "open" onder "Claude twijfelde nog" valt. */
export const FILTERSTATUSSEN = ['open', 'Claude twijfelde nog', 'voorlopig besloten', 'besloten', 'onbeslist'] as const;
export type FilterStatus = (typeof FILTERSTATUSSEN)[number];

export type VragenFilter = {
	status: FilterStatus | 'alle';
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

function filterStatus(vraag: Vertaalvraag): FilterStatus {
	if (vraag.status !== 'open') return vraag.status;
	return vraag.herkomst.soort === 'register' ? 'open' : 'Claude twijfelde nog';
}

/** Een zoekterm als `V12` of `O11.3` vindt dat nummer, en `O11` alle opmerkingen van hoofdstuk 11; verder telt de tekst. */
function bevatTekst(vraag: Vertaalvraag, zoekterm: string): boolean {
	const term = zoekterm.trim().toLowerCase();
	const nr = vraag.nr.toLowerCase();
	const doorzoekbaar = [vraag.kwestie, vraag.tekst, vraag.gekozen ?? '', vraag.alternatief ?? ''].join('\n').toLowerCase();
	return nr === term || nr.startsWith(`${term}.`) || doorzoekbaar.includes(term);
}

/** Houdt de volgorde van `vragen`. */
export function filterVragen(vragen: readonly Vertaalvraag[], filter: VragenFilter): Vertaalvraag[] {
	return vragen.filter(
		(vraag) =>
			(filter.status === 'alle' || filterStatus(vraag) === filter.status) &&
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

export type Indeling = {
	/** De vragen uit het register met status open: de vragen die de redactie kan beantwoorden. */
	open: Vertaalvraag[];
	/** De overige vragen uit het register. */
	metBesluit: Vertaalvraag[];
	/** Alle opmerkingen uit de logs, ook die met een statuswoord "open". */
	opmerkingen: Vertaalvraag[];
};

/** Deelt in drie groepen in; elke groep houdt de volgorde van `vragen`, en elke vraag staat in precies één groep. */
export function deelVragenIn(vragen: readonly Vertaalvraag[]): Indeling {
	const register = vragen.filter((vraag) => vraag.herkomst.soort === 'register');
	return {
		open: register.filter((vraag) => vraag.status === 'open'),
		metBesluit: register.filter((vraag) => vraag.status !== 'open'),
		opmerkingen: vragen.filter((vraag) => vraag.herkomst.soort !== 'register'),
	};
}
