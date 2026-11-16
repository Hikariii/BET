import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { LogVers } from '../../data/types';
import { ZICHTBARE_REGELS } from '../kapRegels';
import { InlineMarkdown } from '../Markdownweergave';
import type { Dichtheid } from './dichtheid';
import { maakSamenvatting } from './samenvatting';
import { useAanwijzen } from './useAanwijzen';

type Props = {
	dichtheid: Dichtheid;
	nummer: number | null;
	logVerzen: readonly LogVers[];
	heeftVraag: boolean;
	/** De vertaalregels van het vers; `kapNa` bewaart na zoveel regels de rest achter "nog N regels", `null` toont alles. */
	regels: (kapNa: number | null) => ComponentChildren;
};

/** Een kanttekening toont één regel; de rest staat achter "nog N regels", zodat de notities niet sneller groeien dan de verzen. */
const KANTTEKENING_REGELS = 1;

/** De cel Vertaalregels van een vers in een van de drie dichte-verzenvarianten. */
export function VersRegelsCel({ dichtheid, ...rest }: Props) {
	switch (dichtheid) {
		case 'd1':
			return <OverloopCel {...rest} />;
		case 'd2':
			return <SamenvattingCel {...rest} />;
		case 'd3':
			return <KanttekeningCel {...rest} />;
	}
}

function klassen(...namen: (string | false)[]): string {
	return namen.filter((naam) => naam !== false).join(' ');
}

function heeftInhoud(logVerzen: readonly LogVers[], heeftVraag: boolean): boolean {
	return heeftVraag || logVerzen.some((logVers) => logVers.wijzigingen.length > 0);
}

/** d1: de cel is zo hoog als het vers; wat niet past vervaagt en klapt bij aanwijzen of focus uit over de volgende verzen. */
function OverloopCel({ nummer, regels }: Omit<Props, 'dichtheid'>) {
	const { open, handelers } = useAanwijzen();
	const celRef = useRef<HTMLTableCellElement>(null);
	const inhoudRef = useRef<HTMLDivElement>(null);
	const [overloopt, zetOverloopt] = useState(false);

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
				class={klassen('zweefvak', overloopt && 'overloopt', overloopt && open && 'open')}
				tabIndex={overloopt ? 0 : undefined}
				role={overloopt ? 'group' : undefined}
				aria-label={overloopt ? `Vertaalregels van vers ${nummer}` : undefined}
			>
				<div ref={inhoudRef}>{regels(ZICHTBARE_REGELS)}</div>
			</div>
		</td>
	);
}

/** d2: één regel per vers; bij aanwijzen of focus een breed vak onder het vers met alle regels. */
function SamenvattingCel({ nummer, logVerzen, heeftVraag, regels }: Omit<Props, 'dichtheid'>) {
	const { open, handelers } = useAanwijzen();
	if (!heeftInhoud(logVerzen, heeftVraag)) return <td class="regels" />;
	const samenvatting = maakSamenvatting(logVerzen);
	return (
		<td class="regels" {...handelers}>
			<div class="samenvatting" tabIndex={0} role="group" aria-label={`Vertaalregels van vers ${nummer}, samenvatting`}>
				{samenvatting.eersteRegel !== null && (
					<span class="samenvatting-tekst">
						<InlineMarkdown tekst={samenvatting.eersteRegel} />
					</span>
				)}
				<span class="samenvatting-labels">
					{samenvatting.paragrafen.map((paragraaf) => (
						<span>§{paragraaf}</span>
					))}
					{samenvatting.heeftPrecedent && <span>precedent</span>}
					{heeftVraag && <span>vraag</span>}
				</span>
			</div>
			<div class={klassen('zweefvak', open && 'open')}>{regels(null)}</div>
		</td>
	);
}

/** d3: de regels als notitie in de rechtermarge; `useKanttekeningen` houdt de notities uit elkaars weg. */
function KanttekeningCel({ nummer, logVerzen, heeftVraag, regels }: Omit<Props, 'dichtheid'>) {
	return (
		<td class="regels">
			{heeftInhoud(logVerzen, heeftVraag) && (
				<div class="notitie">
					<span class="notitie-nummer" aria-hidden="true">
						{nummer}
					</span>
					{regels(KANTTEKENING_REGELS)}
				</div>
			)}
		</td>
	);
}
