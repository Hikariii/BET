import { useEffect, useRef } from 'preact/hooks';
import { buurVers, sprongRichting } from './toetsenbord';

const VERS_ID = /^vers-(\d+)$/;

/** Het nummer van het vers waar het element in staat; `null` buiten de verzen. */
function versVan(element: Element | null): number | null {
	const rij = element?.closest('tr.vers') ?? null;
	const nummer = VERS_ID.exec(rij?.id ?? '')?.[1];
	return nummer === undefined ? null : Number(nummer);
}

/** Het eerste bewerkbare vers dat onder de vaste balk in beeld staat; `null` als er geen is. */
function eersteZichtbareVers(): number | null {
	const balkOnderkant = document.querySelector('.bovenbalk')?.getBoundingClientRect().bottom ?? 0;
	for (const rij of document.querySelectorAll('tr.vers')) {
		if (rij.querySelector('.versklik') !== null && rij.getBoundingClientRect().bottom > balkOnderkant) return versVan(rij);
	}
	return null;
}

/**
 * `j` en `k` zetten de focus op "Vers N bewerken" van het volgende of vorige vers.
 * Staat de focus niet in een vers, dan begint de sprong bij het eerste vers dat in beeld is.
 * `bewerkbaar` geeft de versnummers waar een editor open kan, in oplopende volgorde.
 */
export function useSprongNaarVers(bewerkbaar: () => readonly number[]): void {
	const laatsteBewerkbaar = useRef(bewerkbaar);
	laatsteBewerkbaar.current = bewerkbaar;

	useEffect(() => {
		const bijToets = (gebeurtenis: KeyboardEvent) => {
			const doel = gebeurtenis.target instanceof HTMLElement ? gebeurtenis.target : null;
			const richting = sprongRichting(gebeurtenis, doel);
			if (richting === null) return;
			const nummers = laatsteBewerkbaar.current();
			const huidig = versVan(document.activeElement);
			const beginpunt = huidig ?? eersteZichtbareVers();
			const bestemming = huidig === null && richting === 1 ? beginpunt : buurVers(nummers, beginpunt, richting) ?? beginpunt;
			if (bestemming === null) return;
			gebeurtenis.preventDefault();
			document.querySelector<HTMLElement>(`#vers-${bestemming} .versklik`)?.focus();
		};
		document.addEventListener('keydown', bijToets);
		return () => document.removeEventListener('keydown', bijToets);
	}, []);
}
