import { ALINEASTIJL_NAAR_WORD, DOMEIN_NAAR_WORD, TITEL_WORD } from '../data/stijlkoppeling';
import type { WordStijl } from '../data/types';

/** De stijlen die de tool uit het Word-sjabloon van een boek nodig heeft, met hun soort. */
const NODIG: readonly { id: string; soort: WordStijl['soort'] }[] = [
	...Object.values(ALINEASTIJL_NAAR_WORD).map((id) => ({ id, soort: 'alinea' as const })),
	...Object.values(DOMEIN_NAAR_WORD).map((id) => ({ id, soort: 'teken' as const })),
	{ id: TITEL_WORD, soort: 'teken' },
];

const SOORTNAAM = { alinea: 'alineastijl', teken: 'tekenstijl' } as const;

/** Meldingen voor stijlen die het sjabloon niet heeft, of heeft als ander soort stijl; een lege lijst als alles er is. */
export function ontbrekendeStijlen(stijlen: readonly WordStijl[]): string[] {
	return NODIG.flatMap(({ id, soort }) => {
		const gevonden = stijlen.find((stijl) => stijl.id === id);
		if (gevonden === undefined) return [`${SOORTNAAM[soort]} '${id}' ontbreekt`];
		if (gevonden.soort !== soort) return [`'${id}' is een ${SOORTNAAM[gevonden.soort]}, verwacht een ${SOORTNAAM[soort]}`];
		return [];
	});
}
