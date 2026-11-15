import type { Alineastijl, Hoofdstuk, Tekststuk } from '../formaat/types';

/** Het deel van één alinea dat bij een vers hoort, met de stijl van die alinea. */
export type VersDeel = {
	stijl: Alineastijl | null;
	stukken: readonly Tekststuk[];
};

export type VersGroep = {
	/** `null` voor tekst die vóór het eerste versnummer staat. */
	nummer: number | null;
	bron: readonly VersDeel[];
	vereenvoudigd: readonly VersDeel[];
};

/**
 * Zet bron en vereenvoudiging naast elkaar per vers.
 * Een vers dat over meer alinea's loopt, krijgt één deel per alinea;
 * een alinea met meer verzen levert delen aan elk van die verzen.
 * Een vers dat in één kant ontbreekt, krijgt daar een lege lijst.
 */
export function groepeerPerVers(bron: Hoofdstuk, vereenvoudigd: Hoofdstuk): VersGroep[] {
	const bronPerVers = verzamelPerVers(bron);
	const vereenvoudigdPerVers = verzamelPerVers(vereenvoudigd);
	const nummers = new Set([...bronPerVers.keys(), ...vereenvoudigdPerVers.keys()]);
	return [...nummers].sort(naarVolgorde).map((nummer) => ({
		nummer,
		bron: bronPerVers.get(nummer) ?? [],
		vereenvoudigd: vereenvoudigdPerVers.get(nummer) ?? [],
	}));
}

function naarVolgorde(eerste: number | null, tweede: number | null): number {
	return (eerste ?? 0) - (tweede ?? 0);
}

function verzamelPerVers(hoofdstuk: Hoofdstuk): Map<number | null, VersDeel[]> {
	const perVers = new Map<number | null, VersDeel[]>();
	let huidigVers: number | null = null;

	for (const alinea of hoofdstuk.alineas) {
		if (alinea.soort !== 'tekst') {
			continue;
		}
		let stukken: Tekststuk[] = [];
		const sluitDeelAf = () => {
			const deel = maakDeel(alinea.stijl, stukken);
			if (deel !== null) {
				perVers.set(huidigVers, [...(perVers.get(huidigVers) ?? []), deel]);
			}
			stukken = [];
		};
		for (const stuk of alinea.stukken) {
			if (stuk.soort === 'vers') {
				sluitDeelAf();
				huidigVers = stuk.nummer;
			} else {
				stukken.push(stuk);
			}
		}
		sluitDeelAf();
	}
	return perVers;
}

/** Haalt de spaties rond het versnummer weg; geeft `null` als er geen tekst overblijft. */
function maakDeel(stijl: Alineastijl | null, stukken: readonly Tekststuk[]): VersDeel | null {
	const bijgesneden = stukken.map((stuk) => ({ ...stuk }));
	while (bijgesneden[0]?.tekst.trim() === '') {
		bijgesneden.shift();
	}
	while (bijgesneden.at(-1)?.tekst.trim() === '') {
		bijgesneden.pop();
	}
	const eerste = bijgesneden[0];
	const laatste = bijgesneden.at(-1);
	if (eerste === undefined || laatste === undefined) {
		return null;
	}
	eerste.tekst = eerste.tekst.trimStart();
	laatste.tekst = laatste.tekst.trimEnd();
	return { stijl, stukken: bijgesneden };
}
