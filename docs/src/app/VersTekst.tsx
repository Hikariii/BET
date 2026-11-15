import type { WordStijl } from '../data/types';
import { alineaOpmaakstijl, tekststukOpmaakstijl } from './stijl';
import type { VersDeel } from './groepeerPerVers';

type Props = {
	delen: readonly VersDeel[];
	stijlen: readonly WordStijl[];
};

/** Eén alinea per deel, met de opmaak uit het Word-sjabloon. */
export function VersTekst({ delen, stijlen }: Props) {
	return (
		<>
			{delen.map((deel) => (
				<p style={alineaOpmaakstijl(deel.stijl, stijlen)}>
					{deel.stukken.map((stuk) => (
						<span style={tekststukOpmaakstijl(stuk, stijlen)}>{stuk.tekst}</span>
					))}
				</p>
			))}
		</>
	);
}
