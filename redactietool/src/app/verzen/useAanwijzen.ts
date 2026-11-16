import { useEffect, useRef, useState } from 'preact/hooks';
import { dialoogOpen } from '../help/dialoogOpen';

/** Zo lang moet de aanwijzer op een cel blijven voor het vak opent, zodat een vak niet oplicht bij elke rij waar de muis langs gaat. */
const AANWIJSVERTRAGING_MS = 180;

/** Zo lang blijft het vak open nadat de aanwijzer het verlaat, zodat wie net over de rand schuift het niet kwijtraakt. */
const VERLAATVERTRAGING_MS = 400;

/**
 * Het vak dat nu door aanwijzen is uitgeklapt, gedeeld door alle cellen: zolang het open is (ook tijdens de verlaatvertraging) klapt geen ander vak uit door aanwijzen.
 * Een vastgezet vak, een vak dat niet overloopt en toetsenbordfocus doen hier niet aan mee.
 */
let uitgeklaptDoor: object | null = null;
const luisteraars = new Set<() => void>();

function zetUitgeklaptDoor(eigenaar: object | null): void {
	uitgeklaptDoor = eigenaar;
	for (const luisteraar of luisteraars) luisteraar();
}

type Aanwijshandelers = {
	onPointerEnter: () => void;
	onPointerLeave: () => void;
	onFocusIn: (gebeurtenis: FocusEvent) => void;
	onFocusOut: (gebeurtenis: FocusEvent) => void;
};

/**
 * `kanUitklappen`: het vak zweeft en klapt echt uit (zie `kanUitklappen` in celToestand.ts); alleen zo'n vak houdt andere vakken dicht.
 *
 * Een vak dat opengaat bij aanwijzen (met een korte vertraging) of toetsenbordfocus in de cel, en dichtgaat met Escape.
 * Na het verlaten blijft het even open en is `sluitend` waar, zodat het vak meteen laat zien dat de aanwijzer weg is; komt de aanwijzer binnen die tijd terug, dan blijft het gewoon open.
 * Escape houdt het vak dicht tot de aanwijzer de cel opnieuw ingaat of de focus er opnieuw in komt.
 */
export function useAanwijzen(kanUitklappen: boolean): { open: boolean; sluitend: boolean; handelers: Aanwijshandelers } {
	const [aangewezen, zetAangewezen] = useState(false);
	const [focus, zetFocus] = useState(false);
	const [weggedrukt, zetWeggedrukt] = useState(false);
	const [verlaten, zetVerlaten] = useState(false);
	const vertraging = useRef<number | null>(null);
	const ik = useRef({}).current;
	const [, zetUitgeklapteVak] = useState(uitgeklaptDoor);
	const doorAnderGeblokkeerd = kanUitklappen && uitgeklaptDoor !== null && uitgeklaptDoor !== ik;
	const uitgeklaptDoorAanwijzen = kanUitklappen && aangewezen && !weggedrukt && !doorAnderGeblokkeerd;
	const open = ((aangewezen && !doorAnderGeblokkeerd) || focus) && !weggedrukt;

	useEffect(() => {
		const luisteraar = () => zetUitgeklapteVak(uitgeklaptDoor);
		luisteraars.add(luisteraar);
		return () => {
			luisteraars.delete(luisteraar);
			if (uitgeklaptDoor === ik) zetUitgeklaptDoor(null);
		};
	}, []);

	useEffect(() => {
		if (uitgeklaptDoorAanwijzen && uitgeklaptDoor === null) zetUitgeklaptDoor(ik);
		if (!uitgeklaptDoorAanwijzen && uitgeklaptDoor === ik) zetUitgeklaptDoor(null);
	}, [uitgeklaptDoorAanwijzen]);

	const stopVertraging = () => {
		if (vertraging.current !== null) window.clearTimeout(vertraging.current);
		vertraging.current = null;
	};
	useEffect(() => stopVertraging, []);

	useEffect(() => {
		if (!open) return;
		const bijToets = (gebeurtenis: KeyboardEvent) => {
			if (gebeurtenis.key === 'Escape' && !dialoogOpen()) zetWeggedrukt(true);
		};
		window.addEventListener('keydown', bijToets);
		return () => window.removeEventListener('keydown', bijToets);
	}, [open]);

	return {
		open,
		sluitend: open && verlaten && aangewezen && !focus,
		handelers: {
			onPointerEnter: () => {
				stopVertraging();
				zetVerlaten(false);
				vertraging.current = window.setTimeout(() => {
					zetWeggedrukt(false);
					zetAangewezen(true);
				}, AANWIJSVERTRAGING_MS);
			},
			onPointerLeave: () => {
				stopVertraging();
				zetVerlaten(true);
				vertraging.current = window.setTimeout(() => {
					zetAangewezen(false);
					zetVerlaten(false);
				}, VERLAATVERTRAGING_MS);
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
