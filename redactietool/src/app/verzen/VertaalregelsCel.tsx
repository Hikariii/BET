import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { celToestand, overloopNaMeting } from './celToestand';
import { useAanwijzen } from './useAanwijzen';
import './verzen.css';

type Props = {
	nummer: number | null;
	/** Of de naslagkaart onder dit vers open staat; de cel staat dan vast en volledig in de kolom. */
	naslagOpen: boolean;
	/** De punaise in de kolomkop zet alle vakken vast. */
	alleVast: boolean;
	/** De vertaalregels van het vers; `gekapt` bewaart na enkele regels de rest achter "nog N regels". */
	regels: (gekapt: boolean) => ComponentChildren;
};

/**
 * De cel Vertaalregels van een vers: zo hoog als het vers, wat niet past vervaagt onderaan.
 * Bij aanwijzen of toetsenbordfocus klapt het vak uit over de volgende verzen, zonder dat iets verschuift.
 * De punaise rechtsonder zet een uitgeklapt vak vast in de kolom met alle regels, net als zolang de naslagkaart onder het vers open staat.
 */
export function VertaalregelsCel({ nummer, naslagOpen, alleVast, regels }: Props) {
	const { open, handelers } = useAanwijzen();
	const celRef = useRef<HTMLTableCellElement>(null);
	const inhoudRef = useRef<HTMLDivElement>(null);
	const [overloopt, zetOverloopt] = useState(false);
	const [vastgezet, zetVastgezet] = useState(false);
	const toestand = celToestand({ naslagOpen, vastgezet, alleVast, overloopt, open });
	const vastRef = useRef(toestand.vast);
	vastRef.current = toestand.vast;

	useEffect(() => {
		const cel = celRef.current;
		const inhoud = inhoudRef.current;
		if (cel === null || inhoud === null) return;
		const meet = () => {
			const gemeten = inhoud.offsetTop + inhoud.offsetHeight > cel.clientHeight + 1;
			zetOverloopt((vorige) => overloopNaMeting(vorige, vastRef.current, gemeten));
		};
		meet();
		const waarnemer = new ResizeObserver(meet);
		waarnemer.observe(cel);
		waarnemer.observe(inhoud);
		return () => waarnemer.disconnect();
	}, []);

	return (
		<td ref={celRef} class="regels" {...handelers}>
			<div
				class={toestand.klassen}
				tabIndex={toestand.focusbaar ? 0 : undefined}
				role={toestand.focusbaar ? 'group' : undefined}
				aria-label={toestand.focusbaar ? `Vertaalregels van vers ${nummer}` : undefined}
			>
				<div ref={inhoudRef}>{regels(!toestand.vast)}</div>
				{toestand.punaise && <Punaise vastgezet={vastgezet} wissel={() => zetVastgezet(!vastgezet)} />}
			</div>
		</td>
	);
}

function Punaise({ vastgezet, wissel }: { vastgezet: boolean; wissel: () => void }) {
	const label = 'Vertaalregels vastzetten';
	return (
		<div class="punaisestrook">
			<button type="button" class="punaise" aria-pressed={vastgezet} aria-label={label} title={label} onClick={wissel}>
				<PunaiseIcoon vol={vastgezet} />
			</button>
		</div>
	);
}

/** Het speldje van de punaise: gevuld als het vak (of de hele kolom) vaststaat. */
export function PunaiseIcoon({ vol }: { vol: boolean }) {
	return (
		<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
			<path
				d="M7.5 3h5 M8.5 3v5l-2.5 3h8l-2.5-3V3 M10 11v6"
				fill={vol ? 'currentColor' : 'none'}
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	);
}
