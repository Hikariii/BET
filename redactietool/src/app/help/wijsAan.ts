import type { Plek } from '../navigatie/boekplekken';

/** De `data-help`-sleutel van een plek in de balk; de help wijst hem aan met `{{wijs plek-… | … | …}}`. */
export function plekSleutel(plek: Plek): string {
	return `plek-${plek}`;
}

const LICHT_KLASSE = 'help-licht';
const LICHT_DUUR_MS = 2400;

type Rechthoek = { left: number; right: number; top: number; bottom: number };

/** Of het midden van `element` binnen `rand` valt; wat daarbuiten ligt is afgekapt door een vak met `overflow` en niet te zien. */
export function middenBinnen(element: Rechthoek, rand: Rechthoek): boolean {
	const x = (element.left + element.right) / 2;
	const y = (element.top + element.bottom) / 2;
	return x >= rand.left && x <= rand.right && y >= rand.top && y <= rand.bottom;
}

/** De voorouder met `overflow` (niet `visible`) die het element afkapt, zodat het niet echt te zien is; `null` als het zichtbaar is. */
function afkapper(element: HTMLElement): HTMLElement | null {
	const rechthoek = element.getBoundingClientRect();
	for (let voorouder = element.parentElement; voorouder !== null && voorouder !== document.body; voorouder = voorouder.parentElement) {
		const { overflowX, overflowY } = getComputedStyle(voorouder);
		if (overflowX === 'visible' && overflowY === 'visible') continue;
		if (!middenBinnen(rechthoek, voorouder.getBoundingClientRect())) return voorouder;
	}
	return null;
}

/**
 * Het eerste echt zichtbare element met deze `data-help`-sleutel, of `null` als de pagina het niet heeft.
 * Zijn alle elementen afgekapt, zoals "nog N regels" in een ingeklapt vak, dan is het vak dat ze afkapt het zichtbare om aan te wijzen.
 */
export function vindHelpElement(sleutel: string): HTMLElement | null {
	const kandidaten = [...document.querySelectorAll<HTMLElement>(`[data-help="${sleutel}"]`)].filter(
		(element) => element.closest('dialog') === null && element.getClientRects().length > 0,
	);
	return kandidaten.find((element) => afkapper(element) === null) ?? (kandidaten[0] === undefined ? null : afkapper(kandidaten[0]));
}

/** Laat het element even oplichten en brengt het in beeld; bij `prefers-reduced-motion` zonder beweging. In de bovenbalk (die blijft staan) verschuift de pagina niet. */
export function laatOplichten(element: HTMLElement): void {
	const rustig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const inBovenbalk = element.closest('.bovenbalk') !== null;
	element.scrollIntoView({ block: inBovenbalk ? 'nearest' : 'center', inline: 'nearest', behavior: rustig ? 'auto' : 'smooth' });
	element.classList.remove(LICHT_KLASSE);
	// De animatie begint opnieuw als het element al licht gaf: eerst de stijl herberekenen.
	void element.offsetWidth;
	element.classList.add(LICHT_KLASSE);
	window.setTimeout(() => element.classList.remove(LICHT_KLASSE), LICHT_DUUR_MS);
}
