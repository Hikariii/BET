import { useMemo, useState } from 'preact/hooks';
import { meldendeOpslag, meldOpslagGewijzigd } from '../../bewaren/wijziging';
import { leesTussenstand, type Opslag } from '../../bewerken/tussenstand';
import type { Tussenstand } from '../../bewerken/types';
import { useOpslagTeller } from '../bewaren/useOpslagTeller';

/** Opslag die niets bewaart en bij bewaren een fout geeft, voor een browser die localStorage weigert (bv. in privémodus). */
const GEWEIGERDE_OPSLAG: Opslag = {
	getItem: () => null,
	setItem: () => {
		throw new Error('de browser staat geen opslag toe');
	},
	removeItem: () => {},
};

/** De opslag van de browser zonder meldingen, voor instellingen die geen bewaarde tekst zijn. */
export function ruweBrowseropslag(): Opslag {
	try {
		return window.localStorage;
	} catch {
		return GEWEIGERDE_OPSLAG;
	}
}

/** De opslag van de browser; elke schrijf- of wisactie laat de bewaarstatus en de open hoofdstukken opnieuw lezen. */
export function browseropslag(): Opslag {
	return meldendeOpslag(ruweBrowseropslag(), meldOpslagGewijzigd);
}

/** De tussenstand van een hoofdstuk, altijd vers uit de opslag gelezen; `herlees` na elke wijziging in de opslag. */
export function useTussenstand(boek: string, hoofdstuk: number): { tussenstand: Tussenstand; herlees: () => void } {
	const [versie, zetVersie] = useState(0);
	const opslagTeller = useOpslagTeller();
	const tussenstand = useMemo(() => leesTussenstand(ruweBrowseropslag(), boek, hoofdstuk), [boek, hoofdstuk, versie, opslagTeller]);
	return { tussenstand, herlees: () => zetVersie((vorige) => vorige + 1) };
}
