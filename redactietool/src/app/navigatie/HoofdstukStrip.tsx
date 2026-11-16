import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData, Referentie } from '../../data/types';
import { aantalOpenVragen } from '../vertaalvragen';
import { KortHoofdstuk } from './KortHoofdstuk';
import { schuifAfstand, schuifstand, type Schuifstand } from './stripSchuiven';

type Props = {
	boek: BoekData;
	referentie: Referentie;
	/** Het hoofdstuk dat open staat. */
	huidigHoofdstuk: number | null;
};

/** Zet het huidige hoofdstuk in het midden van de strip, zonder de pagina zelf te laten scrollen (anders dan `scrollIntoView`). */
function centreerHuidig(lijst: HTMLElement): void {
	const huidig = lijst.querySelector<HTMLElement>('[aria-current="page"]');
	if (huidig === null) return;
	const links = huidig.getBoundingClientRect().left - lijst.getBoundingClientRect().left + lijst.scrollLeft;
	lijst.scrollLeft = links - (lijst.clientWidth - huidig.offsetWidth) / 2;
}

/**
 * Alle hoofdstukken als horizontale strip, met dezelfde informatie als de ingeklapte zijbalk. Voor de variant zonder zijbalk.
 * Past hij niet, dan schuift hij zijwaarts: met pijltjes aan de randen (alleen als ze iets doen) of met het muiswiel.
 */
export function HoofdstukStrip({ boek, referentie, huidigHoofdstuk }: Props) {
	const strip = useRef<HTMLElement>(null);
	const lijst = useRef<HTMLUListElement>(null);
	const [stand, zetStand] = useState<Schuifstand>({ terug: false, verder: false });

	useEffect(() => {
		const element = lijst.current;
		if (element === null) return;
		const meet = () => zetStand(schuifstand(element.scrollLeft, element.clientWidth, element.scrollWidth));
		let gecentreerd = false;
		const waarnemer = new ResizeObserver(() => {
			// De eerste keer dat de strip een breedte heeft, het huidige hoofdstuk in het midden zetten.
			if (!gecentreerd && element.clientWidth > 0) {
				centreerHuidig(element);
				gecentreerd = true;
			}
			meet();
		});
		waarnemer.observe(element);
		element.addEventListener('scroll', meet, { passive: true });
		// Een gewoon muiswiel scrolt verticaal; in de strip betekent dat zijwaarts.
		const wiel = (gebeurtenis: WheelEvent) => {
			if (Math.abs(gebeurtenis.deltaY) <= Math.abs(gebeurtenis.deltaX) || element.scrollWidth <= element.clientWidth) return;
			gebeurtenis.preventDefault();
			element.scrollLeft += gebeurtenis.deltaY;
		};
		element.addEventListener('wheel', wiel, { passive: false });
		return () => {
			waarnemer.disconnect();
			element.removeEventListener('scroll', meet);
			element.removeEventListener('wheel', wiel);
		};
	}, []);

	useEffect(() => {
		if (lijst.current !== null) centreerHuidig(lijst.current);
	}, [huidigHoofdstuk]);

	const schuif = (richting: 1 | -1) => {
		const element = lijst.current;
		if (element === null) return;
		element.scrollBy({ left: richting * schuifAfstand(element.clientWidth), behavior: 'smooth' });
	};

	return (
		<nav class="hoofdstukstrip" ref={strip} aria-label={`Hoofdstukken van ${boek.naam}`}>
			<button type="button" class="strip-pijl strip-pijl-terug" hidden={!stand.terug} onClick={() => schuif(-1)} aria-label="Eerdere hoofdstukken tonen">
				‹
			</button>
			<ul ref={lijst}>
				{boek.hoofdstukken.map((hoofdstuk) => (
					<li>
						<KortHoofdstuk
							boek={boek.id}
							hoofdstuk={hoofdstuk}
							aantalOpenVragen={aantalOpenVragen(referentie.openVragen, hoofdstuk.nummer)}
							huidig={hoofdstuk.nummer === huidigHoofdstuk}
						/>
					</li>
				))}
			</ul>
			<button type="button" class="strip-pijl strip-pijl-verder" hidden={!stand.verder} onClick={() => schuif(1)} aria-label="Latere hoofdstukken tonen">
				›
			</button>
		</nav>
	);
}
