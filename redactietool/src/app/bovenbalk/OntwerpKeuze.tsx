import { adresMetOntwerp, ONTWERPEN, type Ontwerp } from '../ontwerpProef';

/** Kleine strook rechtsonder om tussen de ontwerpvarianten te wisselen; alleen zichtbaar met `?ontwerp=` in het adres. */
export function OntwerpKeuze({ ontwerp }: { ontwerp: Ontwerp }) {
	if (ontwerp.variant === null) return null;
	return (
		<nav class="ontwerpkeuze" aria-label="Ontwerpvariant">
			<ul>
				{ONTWERPEN.map((naam) => (
					<li>
						<a href={adresMetOntwerp(window.location.href, naam)} aria-current={naam === ontwerp.variant ? 'true' : undefined}>
							{naam}
						</a>
					</li>
				))}
				<li>
					<a href={adresMetOntwerp(window.location.href, null)}>zonder</a>
				</li>
			</ul>
			<p class="ontwerpkeuze-titel">{ontwerp.titel}</p>
		</nav>
	);
}
