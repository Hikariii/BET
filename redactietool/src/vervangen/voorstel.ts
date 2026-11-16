import type { Opslag } from '../bewerken/tussenstand';
import type { VersRef } from '../data/types';
import { DOMEINEN, type Domein } from '../formaat/types';

/**
 * Wat een vertaalvraag meegeeft aan Zoeken en vervangen als de vertaler een optie kiest.
 * `van` en `naar` horen bij een markeringswissel, `nieuw` bij een tekstvervanging; wat niet zeker is, blijft leeg.
 */
export type Voorstel = {
	/** De kwestie van de vraag, de sleutel van het antwoord. */
	kwestie: string;
	/** De gekozen optie zoals hij in de vraag staat. */
	optie: string;
	opdracht: 'tekst' | 'markering';
	zoekterm: string;
	nieuw: string;
	van: Domein | null;
	naar: Domein | null;
	/** De verzen van de vraag: het bereik van de zoekopdracht. Leeg als de vraag geen verzen heeft. */
	verzen: VersRef[];
};

/** De sleutel waaronder het voorstel van een boek in de sessie staat. */
export function voorstelSleutel(boek: string): string {
	return `bet-voorstel/${boek}`;
}

function isObject(waarde: unknown): waarde is Record<string, unknown> {
	return typeof waarde === 'object' && waarde !== null && !Array.isArray(waarde);
}

function alsDomein(waarde: unknown): Domein | null {
	return DOMEINEN.find((domein) => domein === waarde) ?? null;
}

function alsVers(waarde: unknown): VersRef | null {
	if (!isObject(waarde)) return null;
	const { hoofdstuk, vers } = waarde;
	return typeof hoofdstuk === 'number' && typeof vers === 'number' ? { hoofdstuk, vers } : null;
}

/** Leest een voorstel uit opgeslagen JSON; `null` bij een onbruikbare vorm. */
export function alsVoorstel(waarde: unknown): Voorstel | null {
	if (!isObject(waarde) || !Array.isArray(waarde['verzen'])) return null;
	const { kwestie, optie, opdracht, zoekterm, nieuw } = waarde;
	if (typeof kwestie !== 'string' || typeof optie !== 'string' || typeof zoekterm !== 'string' || typeof nieuw !== 'string') return null;
	if (opdracht !== 'tekst' && opdracht !== 'markering') return null;
	const verzen = waarde['verzen'].map(alsVers);
	if (verzen.some((vers) => vers === null)) return null;
	return {
		kwestie,
		optie,
		opdracht,
		zoekterm,
		nieuw,
		van: alsDomein(waarde['van']),
		naar: alsDomein(waarde['naar']),
		verzen: verzen.flatMap((vers) => vers ?? []),
	};
}

/** Bewaart het voorstel voor het scherm dat opent. Geeft onwaar als de opslag het weigert. */
export function bewaarVoorstel(opslag: Opslag, boek: string, voorstel: Voorstel): boolean {
	try {
		opslag.setItem(voorstelSleutel(boek), JSON.stringify(voorstel));
		return true;
	} catch {
		return false;
	}
}

/** Haalt het voorstel op en verwijdert het, zodat het één keer geldt: een later bezoek aan het scherm begint leeg. */
export function neemVoorstel(opslag: Opslag, boek: string): Voorstel | null {
	try {
		const tekst = opslag.getItem(voorstelSleutel(boek));
		if (tekst === null) return null;
		opslag.removeItem(voorstelSleutel(boek));
		return alsVoorstel(JSON.parse(tekst));
	} catch {
		return null;
	}
}

/** De opslag die per tabblad geldt; weigert de browser hem, dan bewaart hij niets en geeft bewaren een fout. */
export function sessieopslag(): Opslag {
	try {
		return window.sessionStorage;
	} catch {
		return {
			getItem: () => null,
			setItem: () => {
				throw new Error('de browser staat geen opslag toe');
			},
			removeItem: () => {},
		};
	}
}
