import type { Plek } from '../navigatie/boekplekken';

/** De `data-help`-sleutel van een plek in de balk; de help wijst hem aan met `{{wijs plek-… | … | …}}`. */
export function plekSleutel(plek: Plek): string {
	return `plek-${plek}`;
}

const LICHT_KLASSE = 'help-licht';
const LICHT_DUUR_MS = 2400;

/** Het eerste zichtbare element met deze `data-help`-sleutel, of `null` als de pagina het niet heeft. */
export function vindHelpElement(sleutel: string): HTMLElement | null {
	const kandidaten = document.querySelectorAll<HTMLElement>(`[data-help="${sleutel}"]`);
	return [...kandidaten].find((element) => element.closest('dialog') === null && element.getClientRects().length > 0) ?? null;
}

/** Brengt het element in beeld en laat het even oplichten; bij `prefers-reduced-motion` zonder beweging. */
export function laatOplichten(element: HTMLElement): void {
	const rustig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	element.scrollIntoView({ block: 'center', behavior: rustig ? 'auto' : 'smooth' });
	element.classList.remove(LICHT_KLASSE);
	// De animatie begint opnieuw als het element al licht gaf: eerst de stijl herberekenen.
	void element.offsetWidth;
	element.classList.add(LICHT_KLASSE);
	window.setTimeout(() => element.classList.remove(LICHT_KLASSE), LICHT_DUUR_MS);
}
