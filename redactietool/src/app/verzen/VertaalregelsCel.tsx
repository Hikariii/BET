import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { celToestand } from './celToestand';
import { useAanwijzen } from './useAanwijzen';
import './verzen.css';

type Props = {
	nummer: number | null;
	/** Of de naslagkaart onder dit vers open staat; de cel staat dan vast en volledig in de kolom. */
	naslagOpen: boolean;
	/** De vertaalregels van het vers; `gekapt` bewaart na enkele regels de rest achter "nog N regels". */
	regels: (gekapt: boolean) => ComponentChildren;
};

/**
 * De cel Vertaalregels van een vers: zo hoog als het vers, wat niet past vervaagt onderaan.
 * Bij aanwijzen of toetsenbordfocus klapt het vak uit over de volgende verzen, zonder dat iets verschuift.
 * Zolang de naslagkaart onder het vers open staat, staat de cel vast in de kolom met alle regels.
 */
export function VertaalregelsCel({ nummer, naslagOpen, regels }: Props) {
	const { open, handelers } = useAanwijzen();
	const celRef = useRef<HTMLTableCellElement>(null);
	const inhoudRef = useRef<HTMLDivElement>(null);
	const [overloopt, zetOverloopt] = useState(false);
	const { vast, klassen, focusbaar } = celToestand(naslagOpen, overloopt, open);

	useEffect(() => {
		const cel = celRef.current;
		const inhoud = inhoudRef.current;
		if (cel === null || inhoud === null) return;
		const meet = () => zetOverloopt(inhoud.offsetTop + inhoud.offsetHeight > cel.clientHeight + 1);
		meet();
		const waarnemer = new ResizeObserver(meet);
		waarnemer.observe(cel);
		waarnemer.observe(inhoud);
		return () => waarnemer.disconnect();
	}, []);

	return (
		<td ref={celRef} class="regels" {...handelers}>
			<div
				class={klassen}
				tabIndex={focusbaar ? 0 : undefined}
				role={focusbaar ? 'group' : undefined}
				aria-label={focusbaar ? `Vertaalregels van vers ${nummer}` : undefined}
			>
				<div ref={inhoudRef}>{regels(!vast)}</div>
			</div>
		</td>
	);
}
