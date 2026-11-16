import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import './bovenbalk.css';

type Props = {
	/** Het boek: de naam en de plekken in het boek als tabbladen. */
	boek: ComponentChildren;
	/** De hoofdstukkeuze (titel met status en bladerknoppen); zonder titel en acties (`null`) heeft de pagina geen hoofdstukbalk. */
	titel: ComponentChildren;
	/** Hoofdstuk kopiëren voor Word en Export voor Claude; `null` buiten een hoofdstuk. */
	acties: ComponentChildren;
	/** De bewaarstatus: een link naar de pagina Bewaard. */
	bewaarstatus: ComponentChildren;
	/** Het grootte-keuzeblok. */
	grootte: ComponentChildren;
	/** De knop Help met zijn venster. */
	help: ComponentChildren;
};

/**
 * De balk bovenaan die blijft staan bij scrollen: een boekbalk (boek, bewaarstatus, grootte, Help) met daaronder een hoofdstukbalk (hoofdstukkeuze, acties).
 * Zet de hoogte als `--balk-hoogte` op `<html>`, zodat `scroll-padding-top` en de pagina Opgeslagen eronder beginnen.
 */
export function Bovenbalk({ boek, titel, acties, bewaarstatus, grootte, help }: Props) {
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
		<header class="bovenbalk" ref={balk}>
			<div class="bovenbalk-rij bovenbalk-boekbalk">
				<div class="bovenbalk-boek">{boek}</div>
				<div class="bovenbalk-bewaarstatus" data-help="bewaarstatus">
					{bewaarstatus}
				</div>
				<div class="bovenbalk-grootte" data-help="grootte">
					{grootte}
				</div>
				<div class="bovenbalk-help">{help}</div>
			</div>
			{(titel !== null || acties !== null) && (
				<div class="bovenbalk-rij bovenbalk-hoofdstukbalk">
					<div class="bovenbalk-titel">{titel}</div>
					<div class="bovenbalk-acties">{acties}</div>
				</div>
			)}
		</header>
	);
}
