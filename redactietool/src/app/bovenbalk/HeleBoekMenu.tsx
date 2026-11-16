import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { BoekPlek, Plek } from '../navigatie/boekplekken';
import './boekplekken.css';

type Props = {
	/** De onderdelen van het boek in het menu: alle plekken behalve Hoofdstukken. */
	plekken: readonly BoekPlek[];
	/** De plek die open staat; het menu zegt zelf of die daarin zit. */
	huidig: Plek | null;
};

/** Het menu Hele boek: een knop die een lijst links opent, met de aantallen erbij. Escape sluit en zet de focus terug op de knop. */
export function HeleBoekMenu({ plekken, huidig }: Props) {
	const [open, zetOpen] = useState(false);
	const wortel = useRef<HTMLDivElement>(null);
	const knop = useRef<HTMLButtonElement>(null);
	const lijst = useRef<HTMLUListElement>(null);
	const lijstId = useId();
	const actief = plekken.some((plek) => plek.plek === huidig);

	useEffect(() => {
		if (!open) return;
		const bijKlikBuiten = (gebeurtenis: MouseEvent) => {
			if (!wortel.current?.contains(gebeurtenis.target as Node)) zetOpen(false);
		};
		document.addEventListener('mousedown', bijKlikBuiten);
		return () => document.removeEventListener('mousedown', bijKlikBuiten);
	}, [open]);

	function links(): HTMLAnchorElement[] {
		return Array.from(lijst.current?.querySelectorAll('a') ?? []);
	}
	function focusOpDeelnemer(verschuiving: 1 | -1 | 'eerste') {
		const alle = links();
		if (alle.length === 0) return;
		const huidigeIndex = alle.findIndex((link) => link === document.activeElement);
		const volgende = verschuiving === 'eerste' ? 0 : (huidigeIndex + verschuiving + alle.length) % alle.length;
		alle[volgende]?.focus();
	}

	const bijToets = (gebeurtenis: KeyboardEvent) => {
		if (gebeurtenis.key === 'Escape' && open) {
			gebeurtenis.stopPropagation();
			zetOpen(false);
			knop.current?.focus();
		} else if (gebeurtenis.key === 'ArrowDown' || gebeurtenis.key === 'ArrowUp') {
			gebeurtenis.preventDefault();
			const wasOpen = open;
			zetOpen(true);
			// De lijst staat pas na het openen in de pagina.
			if (wasOpen) focusOpDeelnemer(gebeurtenis.key === 'ArrowDown' ? 1 : -1);
			else setTimeout(() => focusOpDeelnemer('eerste'), 0);
		}
	};
	const bijFocusWeg = (gebeurtenis: FocusEvent) => {
		const naar = gebeurtenis.relatedTarget;
		if (open && naar instanceof Node && !wortel.current?.contains(naar)) zetOpen(false);
	};

	return (
		<div class="helebook-menu" ref={wortel} onKeyDown={bijToets} onFocusOut={bijFocusWeg}>
			<button
				type="button"
				ref={knop}
				class="helebook-knop"
				aria-expanded={open}
				aria-controls={lijstId}
				aria-current={actief ? 'page' : undefined}
				onClick={() => zetOpen(!open)}
			>
				Hele boek
				<span class="helebook-pijl" aria-hidden="true" />
			</button>
			<ul id={lijstId} class="helebook-lijst" ref={lijst} hidden={!open}>
				{plekken.map((plek) => (
					<li>
						<a class="helebook-plek" href={plek.adres} aria-current={plek.plek === huidig ? 'page' : undefined} onClick={() => zetOpen(false)}>
							<span>{plek.naam}</span>
							{plek.aantal !== null && <span class="helebook-aantal">{plek.aantal.tekst}</span>}
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}
