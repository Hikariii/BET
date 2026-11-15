import type { Opslag } from '../../bewerken/tussenstand';

export type Geheugenopslag = Opslag & {
	/** De sleutels met een waarde; om de sleutel van een hoofdstuk te leren kennen zonder het formaat na te schrijven. */
	sleutels: () => string[];
};

/** Opslag in het geheugen; bewaren onder een van de sleutels in `volBij` geeft de fout van een volle opslag. */
export function maakGeheugenopslag(volBij: ReadonlySet<string> = new Set()): Geheugenopslag {
	const waarden = new Map<string, string>();
	return {
		getItem: (sleutel) => waarden.get(sleutel) ?? null,
		setItem: (sleutel, waarde) => {
			if (volBij.has(sleutel)) throw new DOMException('De opslag is vol.', 'QuotaExceededError');
			waarden.set(sleutel, waarde);
		},
		removeItem: (sleutel) => {
			waarden.delete(sleutel);
		},
		sleutels: () => [...waarden.keys()],
	};
}

/**
 * Laat `window.localStorage` de opslag in het geheugen teruggeven, zodat de schermen van de app
 * (die `browseropslag()` aanroepen) de bewerkingen van de gebruiker niet zien en niet overschrijven.
 * Geeft de functie terug die de browseropslag herstelt.
 */
export function vervangBrowseropslag(opslag: Opslag): () => void {
	const origineel = Object.getOwnPropertyDescriptor(window, 'localStorage');
	Object.defineProperty(window, 'localStorage', { configurable: true, get: () => opslag });
	return () => {
		if (origineel === undefined) Reflect.deleteProperty(window, 'localStorage');
		else Object.defineProperty(window, 'localStorage', origineel);
	};
}
