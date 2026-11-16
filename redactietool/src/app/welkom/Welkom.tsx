import { useEffect, useRef, useState } from 'preact/hooks';
import { ruweBrowseropslag } from '../bewerken/useTussenstand';
import { bewaarWelkomGezien, isWelkomGezien } from './welkomGezien';
import './welkom.css';

/**
 * Een vlak bovenaan de pagina bij het eerste bezoek: wat de tool doet, dat de browser het werk bewaart en waar de Help staat.
 * "Sluiten" verbergt het tot het herladen, "Niet meer tonen" onthoudt dat in de browser.
 * Het vlak is geen modaal venster, zodat het niemand tegenhoudt; de focus gaat er wel naartoe en Escape sluit het.
 */
export function Welkom() {
	const [zichtbaar, zetZichtbaar] = useState(() => !isWelkomGezien(ruweBrowseropslag()));
	const vlak = useRef<HTMLElement>(null);
	const eerdereFocus = useRef<Element | null>(null);

	useEffect(() => {
		if (!zichtbaar) return;
		eerdereFocus.current = document.activeElement;
		vlak.current?.focus({ preventScroll: true });
	}, []);

	if (!zichtbaar) return null;

	const sluit = () => {
		zetZichtbaar(false);
		const eerder = eerdereFocus.current;
		if (eerder instanceof HTMLElement && eerder !== document.body && eerder.isConnected) eerder.focus();
	};

	return (
		<section
			class="welkom"
			ref={vlak}
			tabIndex={-1}
			aria-labelledby="welkom-titel"
			onKeyDown={(gebeurtenis) => {
				if (gebeurtenis.key === 'Escape') sluit();
			}}
		>
			<h2 id="welkom-titel">Welkom bij de redactietool</h2>
			<p>
				Met deze tool lees en bewerk je de vereenvoudiging naast de bron en breng je hem naar Word. Je werk wordt automatisch opgeslagen in deze browser op deze
				computer; maak bij Opgeslagen een back-up. De knop Help rechtsboven legt uit hoe alles werkt.
			</p>
			<p class="welkom-knoppen">
				<button
					type="button"
					onClick={() => {
						bewaarWelkomGezien(ruweBrowseropslag());
						sluit();
					}}
				>
					Niet meer tonen
				</button>
				<button type="button" onClick={sluit}>
					Sluiten
				</button>
			</p>
		</section>
	);
}
