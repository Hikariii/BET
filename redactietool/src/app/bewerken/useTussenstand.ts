import { useMemo, useState } from 'preact/hooks';
import { leesTussenstand, type Opslag } from '../../bewerken/tussenstand';
import type { Tussenstand } from '../../bewerken/types';

/** Opslag die niets bewaart en bij bewaren een fout geeft, voor een browser die localStorage weigert (bv. in privémodus). */
const GEWEIGERDE_OPSLAG: Opslag = {
	getItem: () => null,
	setItem: () => {
		throw new Error('de browser staat geen opslag toe');
	},
	removeItem: () => {},
};

export function browseropslag(): Opslag {
	try {
		return window.localStorage;
	} catch {
		return GEWEIGERDE_OPSLAG;
	}
}

/** De tussenstand van een hoofdstuk, altijd vers uit de opslag gelezen; `herlees` na elke wijziging in de opslag. */
export function useTussenstand(boek: string, hoofdstuk: number): { tussenstand: Tussenstand; herlees: () => void } {
	const [versie, zetVersie] = useState(0);
	const tussenstand = useMemo(() => leesTussenstand(browseropslag(), boek, hoofdstuk), [boek, hoofdstuk, versie]);
	return { tussenstand, herlees: () => zetVersie((vorige) => vorige + 1) };
}
