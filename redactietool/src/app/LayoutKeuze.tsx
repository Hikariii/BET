import { LAYOUTPROEVEN, type LayoutProef } from './layoutProef';

type Props = {
	gekozen: LayoutProef;
	onKies: (layout: LayoutProef) => void;
};

/** De keuzestrook rechtsonder; alleen zichtbaar met `?layout=` in het adres. */
export function LayoutKeuze({ gekozen, onKies }: Props) {
	return (
		<nav class="layoutkeuze" aria-label="Lay-outproef">
			<span>Layout:</span>
			{LAYOUTPROEVEN.map((layout) => (
				<button type="button" aria-pressed={layout === gekozen} onClick={() => onKies(layout)}>
					{layout}
				</button>
			))}
		</nav>
	);
}
