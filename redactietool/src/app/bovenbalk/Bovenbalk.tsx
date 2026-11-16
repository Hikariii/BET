import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { OntwerpConfig } from '../ontwerpProef';
import './bovenbalk.css';

type Props = {
	/** `een`: alles in één balk. `twee`: een boekbalk (boek, bewaarstatus, grootte) met daaronder een hoofdstukbalk (titel, acties). */
	uitvoering: OntwerpConfig['bovenbalk'];
	/** Het boek: de naam en, als de zijbalk het niet toont, de knop Keuzes en vragen. */
	boek: ComponentChildren;
	/** De hoofdstuktitel met status. */
	titel: ComponentChildren;
	/** Hoofdstuk kopiëren voor Word en Export voor Claude; `null` buiten een hoofdstuk. */
	acties: ComponentChildren;
	/** De bewaarstatus in de vorm van de variant. */
	bewaarstatus: ComponentChildren;
	/** Het grootte-keuzeblok. */
	grootte: ComponentChildren;
	/** De hoofdstukstrip, voor de variant zonder zijbalk; `null` als er een zijbalk is. */
	navigatie: ComponentChildren;
};

/**
 * De balk bovenaan die blijft staan bij scrollen en niet meeklapt met de zijbalk.
 * Zet de hoogte als `--balk-hoogte` op `<html>`, zodat de zijbalk en `scroll-margin-top` eronder beginnen.
 */
export function Bovenbalk({ uitvoering, boek, titel, acties, bewaarstatus, grootte, navigatie }: Props) {
	const balk = useRef<HTMLElement>(null);
	useLayoutEffect(() => {
		const element = balk.current;
		if (element === null) return;
		const zetHoogte = () => document.documentElement.style.setProperty('--balk-hoogte', `${element.getBoundingClientRect().height}px`);
		zetHoogte();
		const waarnemer = new ResizeObserver(zetHoogte);
		waarnemer.observe(element);
		return () => {
			waarnemer.disconnect();
			document.documentElement.style.removeProperty('--balk-hoogte');
		};
	}, []);

	return (
		<header class={`bovenbalk bovenbalk-${uitvoering}`} ref={balk}>
			{uitvoering === 'een' ? (
				<div class="bovenbalk-rij">
					<div class="bovenbalk-boek">{boek}</div>
					<div class="bovenbalk-titel">{titel}</div>
					<div class="bovenbalk-acties">{acties}</div>
					<div class="bovenbalk-bewaarstatus">{bewaarstatus}</div>
					<div class="bovenbalk-grootte">{grootte}</div>
				</div>
			) : (
				<>
					<div class="bovenbalk-rij bovenbalk-boekbalk">
						<div class="bovenbalk-boek">{boek}</div>
						<div class="bovenbalk-bewaarstatus">{bewaarstatus}</div>
						<div class="bovenbalk-grootte">{grootte}</div>
					</div>
					<div class="bovenbalk-rij bovenbalk-hoofdstukbalk">
						<div class="bovenbalk-titel">{titel}</div>
						<div class="bovenbalk-acties">{acties}</div>
					</div>
				</>
			)}
			{navigatie !== null && <div class="bovenbalk-navigatie">{navigatie}</div>}
		</header>
	);
}
