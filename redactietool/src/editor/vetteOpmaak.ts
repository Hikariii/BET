import type { WordStijl } from '../data/types';
import { ALINEASTIJL_NAAR_WORD, DOMEIN_NAAR_WORD } from '../data/stijlkoppeling';
import { ALINEASTIJLEN, DOMEINEN, isDomein, type Alineastijl, type Domein } from '../formaat/types';

/**
 * Welke opmaak al vet is door haar Word-stijl.
 * FORMAAT.md: vet dat uit de stijl volgt, krijgt geen `{vet}`.
 */
export type VetteOpmaak = {
	domeinen: ReadonlySet<Domein>;
	alineastijlen: ReadonlySet<Alineastijl>;
};

/** Leest uit het vet-attribuut van de stijlen van het boek (`boek.stijlen`) welke domeinen en alineastijlen vet zijn. */
export function vetteOpmaakVan(stijlen: readonly WordStijl[]): VetteOpmaak {
	const isVet = (id: string) => stijlen.find((stijl) => stijl.id === id)?.vet === true;
	return {
		domeinen: new Set(DOMEINEN.filter((domein) => isVet(DOMEIN_NAAR_WORD[domein]))),
		alineastijlen: new Set(ALINEASTIJLEN.filter((stijl) => isVet(ALINEASTIJL_NAAR_WORD[stijl]))),
	};
}

/** Of tekst met deze opmaak in deze alineastijl al vet is, door een vet domein of een vette alineastijl. */
export function isVetDoorStijl(vette: VetteOpmaak, opmaak: readonly string[], alineastijl: Alineastijl | null): boolean {
	const vetDomein = opmaak.some((naam) => isDomein(naam) && vette.domeinen.has(naam));
	return vetDomein || (alineastijl !== null && vette.alineastijlen.has(alineastijl));
}
