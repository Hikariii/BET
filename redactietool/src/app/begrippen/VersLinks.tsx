import { useState } from 'preact/hooks';
import type { VersRef } from '../../data/types';
import { versAdres } from '../adres';
import { VersLinkMetVoorproef } from './VersVoorproefVak';

type Props = {
	boek: string;
	verzen: readonly VersRef[];
	/** Hoeveel links zichtbaar zijn voordat "meer" verschijnt. */
	zichtbaar?: number;
};

const STANDAARD_ZICHTBAAR = 12;

/** Een lijst verzen als links ("4:18, 4:20 …"), met een knop voor de rest als het er veel zijn; bij aanwijzen het vers zelf (zie `VoorproefContext`). */
export function VersLinks({ boek, verzen, zichtbaar = STANDAARD_ZICHTBAAR }: Props) {
	const [alles, zetAlles] = useState(false);
	if (verzen.length === 0) {
		return <span class="geen-verzen">geen verzen</span>;
	}
	const getoond = alles ? verzen : verzen.slice(0, zichtbaar);
	return (
		<span class="verslinks">
			{getoond.map(({ hoofdstuk, vers }, index) => (
				<>
					{index > 0 && ', '}
					<VersLinkMetVoorproef adres={versAdres(boek, hoofdstuk, vers)} hoofdstuk={hoofdstuk} vers={vers} />
				</>
			))}
			{verzen.length > getoond.length && (
				<button type="button" class="meer" onClick={() => zetAlles(true)}>
					nog {verzen.length - getoond.length}
				</button>
			)}
		</span>
	);
}
