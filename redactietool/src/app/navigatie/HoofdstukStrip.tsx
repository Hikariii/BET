import { useEffect, useRef } from 'preact/hooks';
import type { BoekData, Referentie } from '../../data/types';
import { aantalOpenVragen } from '../vertaalvragen';
import { KortHoofdstuk } from './KortHoofdstuk';

type Props = {
	boek: BoekData;
	referentie: Referentie;
	/** Het hoofdstuk dat open staat. */
	huidigHoofdstuk: number | null;
};

/** Alle hoofdstukken als horizontale strip, met dezelfde informatie als de ingeklapte zijbalk. Voor de variant zonder zijbalk. */
export function HoofdstukStrip({ boek, referentie, huidigHoofdstuk }: Props) {
	const strip = useRef<HTMLElement>(null);
	useEffect(() => {
		strip.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
	}, [huidigHoofdstuk]);
	return (
		<nav class="hoofdstukstrip" ref={strip} aria-label={`Hoofdstukken van ${boek.naam}`}>
			<ul>
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
		</nav>
	);
}
