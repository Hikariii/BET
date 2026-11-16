import { useEffect } from 'preact/hooks';
import type { RefObject } from 'preact';
import { plaatsNotities, type Notitiemeting } from './dichtheid';

/** De ruimte tussen twee notities, als deel van de lettergrootte van de pagina. */
const TUSSENRUIMTE_IN_REM = 0.5;

/** Een notitie die minder dan dit verschoven is, staat op zijn vers en krijgt geen versnummer. */
const MINIMALE_VERSCHUIVING_PX = 1;

/**
 * Zet de kanttekeningen (`.notitie` in `tr.vers`) naast hun vers en schuift ze omlaag als de vorige doorloopt.
 * Meet opnieuw als de tabel of een notitie van grootte verandert (bewerken, uitklappen, een ander venster).
 * Zet per notitie `--verschuiving` en, bij verschuiving, `data-verschoven`; en `--kanttekening-overschot` op de tabel
 * voor het stuk dat de laatste notitie onder de tabel uitsteekt.
 */
export function useKanttekeningen(tabel: RefObject<HTMLTableElement | null>, actief: boolean, hoofdstuk: number): void {
	useEffect(() => {
		const element = tabel.current;
		if (!actief || element === null) return;
		const plaats = () => plaatsKanttekeningen(element);
		const waarnemer = new ResizeObserver(plaats);
		waarnemer.observe(element);
		element.querySelectorAll('.notitie').forEach((notitie) => waarnemer.observe(notitie));
		void document.fonts.ready.then(plaats);
		return () => waarnemer.disconnect();
	}, [tabel, actief, hoofdstuk]);
}

function plaatsKanttekeningen(tabel: HTMLTableElement): void {
	const rijen = [...tabel.querySelectorAll<HTMLTableRowElement>('tr.vers')];
	const notities: HTMLElement[] = [];
	const metingen: Notitiemeting[] = [];
	for (const rij of rijen) {
		const notitie = rij.querySelector<HTMLElement>('.notitie');
		if (notitie === null) continue;
		notities.push(notitie);
		metingen.push({ gewenstBoven: rij.getBoundingClientRect().top, hoogte: notitie.offsetHeight });
	}
	const remInPixels = parseFloat(getComputedStyle(document.documentElement).fontSize);
	const plaatsen = plaatsNotities(metingen, TUSSENRUIMTE_IN_REM * remInPixels);

	let onderkant = Number.NEGATIVE_INFINITY;
	notities.forEach((notitie, index) => {
		const meting = metingen[index];
		const plek = plaatsen[index];
		if (meting === undefined || plek === undefined) return;
		const verschuiving = plek - meting.gewenstBoven;
		notitie.style.setProperty('--verschuiving', `${verschuiving}px`);
		notitie.toggleAttribute('data-verschoven', verschuiving > MINIMALE_VERSCHUIVING_PX);
		onderkant = Math.max(onderkant, plek + meting.hoogte);
	});
	const overschot = Math.max(0, onderkant - tabel.getBoundingClientRect().bottom);
	tabel.style.setProperty('--kanttekening-overschot', `${overschot}px`);
}
