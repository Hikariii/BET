import { useEffect, useRef, useState } from 'preact/hooks';
import { useOpslagTeller } from './useOpslagTeller';

/** Zo lang toont de balk dat er net is opgeslagen; het opslaan zelf is korter, maar zo is het te zien. */
const ZICHTBAAR_MS = 1000;

/**
 * Of er net iets in de browser is opgeslagen: waar vanaf een wijziging in de opslag tot een seconde na de laatste.
 * Niet bij het openen van de pagina, alleen bij een wijziging daarna.
 */
export function useNetOpgeslagen(): boolean {
	const teller = useOpslagTeller();
	const beginTeller = useRef(teller);
	const [net, zetNet] = useState(false);
	useEffect(() => {
		if (teller === beginTeller.current) return;
		zetNet(true);
		const klok = window.setTimeout(() => zetNet(false), ZICHTBAAR_MS);
		return () => window.clearTimeout(klok);
	}, [teller]);
	return net;
}
