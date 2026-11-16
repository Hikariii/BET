import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData, Referentie } from '../../data/types';
import { aantalOpenVragen } from '../vertaalvragen';
import { KortHoofdstuk } from './KortHoofdstuk';
import { stripStop } from './toetsenbord';
import { schuifAfstand, schuifstand, scrollVoorHuidig, type Schuifstand } from './stripSchuiven';

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

/** Schuift de strip alleen als het open hoofdstuk niet goed in beeld staat; één hoofdstukbreedte vanaf de rand telt als vervaagd. */
function houdHuidigInBeeld(lijst: HTMLElement): void {
	const huidig = lijst.querySelector<HTMLElement>('[aria-current="page"]');
	if (huidig === null) return;
	const links = huidig.getBoundingClientRect().left - lijst.getBoundingClientRect().left + lijst.scrollLeft;
	const nieuw = scrollVoorHuidig(lijst.scrollLeft, lijst.clientWidth, { links, breedte: huidig.offsetWidth }, huidig.offsetWidth);
	if (nieuw !== null) lijst.scrollLeft = nieuw;
}

/**
 * Alle hoofdstukken als horizontale strip in de hoofdstukbalk: per hoofdstuk nummer, vinkje en aantal open vragen.
 * Past hij niet, dan schuift hij zijwaarts: met pijltjes aan de randen (alleen als ze iets doen) of met het muiswiel.
 * Met het toetsenbord is de strip één tabstop: Tab komt bij het open hoofdstuk, links en rechts lopen langs de rest.
 */
export function HoofdstukStrip({ boek, referentie, huidigHoofdstuk }: Props) {
	const strip = useRef<HTMLElement>(null);
	const lijst = useRef<HTMLUListElement>(null);
	const [stand, zetStand] = useState<Schuifstand>({ terug: false, verder: false });
	const huidigeIndex = Math.max(0, boek.hoofdstukken.findIndex((hoofdstuk) => hoofdstuk.nummer === huidigHoofdstuk));
	const [tabstop, zetTabstop] = useState(huidigeIndex);

	useEffect(() => {
		const element = lijst.current;
		if (element === null) return;
		const meet = () => zetStand(schuifstand(element.scrollLeft, element.clientWidth, element.scrollWidth));
		// Bij het openen en bij een andere venster- of lettergrootte komt het open hoofdstuk in het midden; verandert alleen een hoofdstuk van maat, dan blijft de strip staan als het kan.
		let vorigeBreedte = 0;
		const waarnemer = new ResizeObserver(() => {
			if (element.clientWidth > 0 && element.clientWidth !== vorigeBreedte) centreerHuidig(element);
			else houdHuidigInBeeld(element);
			vorigeBreedte = element.clientWidth;
			meet();
		});
		waarnemer.observe(element);
		for (const hoofdstuk of element.children) waarnemer.observe(hoofdstuk);
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
		if (lijst.current !== null) houdHuidigInBeeld(lijst.current);
		zetTabstop(huidigeIndex);
	}, [huidigHoofdstuk]);

	const hoofdstukLinks = () => [...(lijst.current?.querySelectorAll<HTMLElement>('a') ?? [])];

	const bijToets = (gebeurtenis: KeyboardEvent) => {
		const links = hoofdstukLinks();
		const volgende = stripStop(tabstop, links.length, gebeurtenis.key);
		if (volgende === null) return;
		gebeurtenis.preventDefault();
		links[volgende]?.focus();
	};

	// Ook een klik zet de tabstop, zodat Shift+Tab terugkomt waar je was.
	const bijFocus = (gebeurtenis: FocusEvent) => {
		const index = hoofdstukLinks().findIndex((link) => link === gebeurtenis.target);
		if (index >= 0) zetTabstop(index);
	};

	const schuif = (richting: 1 | -1) => {
		const element = lijst.current;
		if (element === null) return;
		element.scrollBy({ left: richting * schuifAfstand(element.clientWidth), behavior: 'smooth' });
	};

	return (
		<nav class="hoofdstukstrip" ref={strip} aria-label={`Hoofdstukken van ${boek.naam}`}>
			<button type="button" class="strip-pijl strip-pijl-terug" hidden={!stand.terug} tabIndex={-1} onClick={() => schuif(-1)} aria-label="Eerdere hoofdstukken tonen">
				‹
			</button>
			<ul ref={lijst} onKeyDown={bijToets} onFocusIn={bijFocus}>
				{boek.hoofdstukken.map((hoofdstuk, index) => (
					<li>
						<KortHoofdstuk
							boek={boek.id}
							hoofdstuk={hoofdstuk}
							aantalOpenVragen={aantalOpenVragen(referentie.openVragen, hoofdstuk.nummer)}
							huidig={hoofdstuk.nummer === huidigHoofdstuk}
							tabstop={index === tabstop}
						/>
					</li>
				))}
			</ul>
			<button type="button" class="strip-pijl strip-pijl-verder" hidden={!stand.verder} tabIndex={-1} onClick={() => schuif(1)} aria-label="Latere hoofdstukken tonen">
				›
			</button>
		</nav>
	);
}
