import { useEffect, useRef, useState } from 'preact/hooks';

/** Zo lang moet de aanwijzer op een cel blijven voor het vak opent, zodat een vak niet oplicht bij elke rij waar de muis langs gaat. */
const AANWIJSVERTRAGING_MS = 180;

/** Zo lang blijft het vak open nadat de aanwijzer het verlaat, zodat wie net over de rand schuift het niet kwijtraakt. */
const VERLAATVERTRAGING_MS = 600;

type Aanwijshandelers = {
	onPointerEnter: () => void;
	onPointerLeave: () => void;
	onFocusIn: (gebeurtenis: FocusEvent) => void;
	onFocusOut: (gebeurtenis: FocusEvent) => void;
};

/**
 * Een vak dat opengaat bij aanwijzen (met een korte vertraging) of toetsenbordfocus in de cel, en dichtgaat met Escape.
 * Na het verlaten blijft het even open; komt de aanwijzer binnen die tijd terug, dan blijft het gewoon open.
 * Escape houdt het vak dicht tot de aanwijzer de cel opnieuw ingaat of de focus er opnieuw in komt.
 */
export function useAanwijzen(): { open: boolean; handelers: Aanwijshandelers } {
	const [aangewezen, zetAangewezen] = useState(false);
	const [focus, zetFocus] = useState(false);
	const [weggedrukt, zetWeggedrukt] = useState(false);
	const vertraging = useRef<number | null>(null);
	const open = (aangewezen || focus) && !weggedrukt;

	const stopVertraging = () => {
		if (vertraging.current !== null) window.clearTimeout(vertraging.current);
		vertraging.current = null;
	};
	useEffect(() => stopVertraging, []);

	useEffect(() => {
		if (!open) return;
		const bijToets = (gebeurtenis: KeyboardEvent) => {
			if (gebeurtenis.key === 'Escape') zetWeggedrukt(true);
		};
		window.addEventListener('keydown', bijToets);
		return () => window.removeEventListener('keydown', bijToets);
	}, [open]);

	return {
		open,
		handelers: {
			onPointerEnter: () => {
				stopVertraging();
				vertraging.current = window.setTimeout(() => {
					zetWeggedrukt(false);
					zetAangewezen(true);
				}, AANWIJSVERTRAGING_MS);
			},
			onPointerLeave: () => {
				stopVertraging();
				vertraging.current = window.setTimeout(() => zetAangewezen(false), VERLAATVERTRAGING_MS);
			},
			onFocusIn: (gebeurtenis) => {
				// Een klik met de muis op een knop in de cel telt niet: dan opent het vak alleen door aanwijzen.
				if (gebeurtenis.target instanceof Element && gebeurtenis.target.matches(':focus-visible')) {
					zetWeggedrukt(false);
					zetFocus(true);
				}
			},
			onFocusOut: (gebeurtenis) => {
				const cel = gebeurtenis.currentTarget;
				const naar = gebeurtenis.relatedTarget;
				if (!(cel instanceof Node) || !(naar instanceof Node) || !cel.contains(naar)) zetFocus(false);
			},
		},
	};
}
