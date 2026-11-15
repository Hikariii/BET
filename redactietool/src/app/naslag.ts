/** Wat de naslagkaart toont; bij precedenten ook de logregel waar de verwijzing in stond. */
export type Naslag = { soort: 'richtlijn'; paragraaf: string } | { soort: 'precedenten'; regel: string };

/** De open naslagkaart en de rij van het vers waar hij onder staat. */
export type OpenNaslag = { rij: number; naslag: Naslag };

export function zelfdeNaslag(een: Naslag, ander: Naslag): boolean {
	if (een.soort === 'richtlijn') return ander.soort === 'richtlijn' && een.paragraaf === ander.paragraaf;
	return ander.soort === 'precedenten' && een.regel === ander.regel;
}

/** De kaart na een klik op een verwijzing in `rij`: dezelfde verwijzing nog eens sluit hem, een andere vervangt hem. */
export function wisselNaslag(huidig: OpenNaslag | null, rij: number, naslag: Naslag): OpenNaslag | null {
	const alOpen = huidig !== null && huidig.rij === rij && zelfdeNaslag(huidig.naslag, naslag);
	return alOpen ? null : { rij, naslag };
}
