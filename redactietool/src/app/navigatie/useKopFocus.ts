import { useEffect } from 'preact/hooks';
import { moetKopFocus } from './toetsenbord';

/**
 * De pagina die de lezer als laatste zag. Het staat buiten de component omdat de indeling opnieuw wordt opgebouwd
 * als je van een hoofdstuk naar een ander soort pagina gaat; een waarde in de component zou dan weg zijn.
 */
let vorigePagina: string | null = null;

/** Zet na een wissel van pagina de focus op de kop van de nieuwe pagina, zodat Tab daar verder gaat in plaats van bovenaan. */
export function useKopFocus(pagina: string): void {
	useEffect(() => {
		const kop = document.querySelector<HTMLElement>('main h1, .bovenbalk-hoofdstuktitel');
		if (kop !== null && moetKopFocus(vorigePagina, pagina)) {
			kop.tabIndex = -1;
			kop.focus({ preventScroll: true });
		}
		vorigePagina = pagina;
	}, [pagina]);
}
