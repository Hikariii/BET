import type { LogVers } from '../../data/types';

/** Wat de ene regel in de smalle weergave van de vertaalregels van een vers laat zien. */
export type Samenvatting = {
	/** De eerste vertaalregel; `null` zonder regels. */
	eersteRegel: string | null;
	/** De richtlijnparagrafen waar de regels naar verwijzen, zonder dubbelen, in volgorde van voorkomen. */
	paragrafen: string[];
	heeftPrecedent: boolean;
};

export function maakSamenvatting(logVerzen: readonly LogVers[]): Samenvatting {
	const regels = logVerzen.flatMap((logVers) => logVers.wijzigingen);
	const verwijzingen = regels.flatMap((regel) => regel.verwijzingen);
	const paragrafen = new Set<string>();
	for (const verwijzing of verwijzingen) {
		if (verwijzing.soort === 'paragraaf') paragrafen.add(verwijzing.paragraaf);
	}
	return {
		eersteRegel: regels[0]?.tekst ?? null,
		paragrafen: [...paragrafen],
		heeftPrecedent: verwijzingen.some((verwijzing) => verwijzing.soort === 'precedent'),
	};
}
