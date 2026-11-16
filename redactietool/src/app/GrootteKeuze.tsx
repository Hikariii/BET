import { GROOTTE_STAPPEN, type Grootte } from './weergave/weergave';

type Props = {
	grootte: Grootte;
	onKies: (grootte: Grootte) => void;
};

const LABELS: Record<Grootte, { tekst: string; naam: string }> = {
	'-1': { tekst: 'A−', naam: 'Kleiner' },
	'0': { tekst: 'A', naam: 'Normaal' },
	'1': { tekst: 'A+', naam: 'Groter' },
	'2': { tekst: 'A++', naam: 'Grootst' },
};

/** De lettergrootte in vier stappen. Elke knop heeft de klasse `grootte-stap-min`, `-0`, `-1` of `-2`; `aria-pressed` zegt welke stap geldt. */
export function GrootteKeuze({ grootte, onKies }: Props) {
	return (
		<div class="grootte-keuze" role="group" aria-label="Lettergrootte">
			{GROOTTE_STAPPEN.map((stap) => (
				<button
					type="button"
					class={`grootte-stap grootte-stap-${stap < 0 ? 'min' : stap}`}
					aria-pressed={stap === grootte}
					aria-label={LABELS[stap].naam}
					title={LABELS[stap].naam}
					onClick={() => onKies(stap)}
				>
					{LABELS[stap].tekst}
				</button>
			))}
		</div>
	);
}
