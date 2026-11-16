import { adresMetDichtheid, DICHTHEDEN, DICHTHEID_TITELS, type Dichtheid } from './dichtheid';
import './verzenkeuze.css';

/** Kleine strook rechtsonder, boven de keuzestrook van de ontwerpen, om tussen de dichte-verzenvarianten te wisselen. */
export function VerzenKeuze({ dichtheid }: { dichtheid: Dichtheid | null }) {
	return (
		<nav class="verzenkeuze" aria-label="Verzen dicht op elkaar">
			<ul>
				<li>
					<a href={adresMetDichtheid(window.location.href, null)} aria-current={dichtheid === null ? 'true' : undefined}>
						ruim
					</a>
				</li>
				{DICHTHEDEN.map((naam) => (
					<li>
						<a href={adresMetDichtheid(window.location.href, naam)} aria-current={naam === dichtheid ? 'true' : undefined}>
							{naam}
						</a>
					</li>
				))}
			</ul>
			<p class="verzenkeuze-titel">{dichtheid === null ? 'Verzen ruim' : DICHTHEID_TITELS[dichtheid]}</p>
		</nav>
	);
}
