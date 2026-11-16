export const ALINEASTIJLEN = ['jezus', 'god', 'engel', 'citaat-ot'] as const;
export type Alineastijl = (typeof ALINEASTIJLEN)[number];

export const DOMEINEN = [
	'eeuwigleven',
	'genade',
	'geloof',
	'oordeel',
	'rechtvaardig',
	'zonde',
	'torah',
	'dag',
] as const;
export type Domein = (typeof DOMEINEN)[number];

export function isDomein(waarde: string): waarde is Domein {
	return (DOMEINEN as readonly string[]).includes(waarde);
}

/** Opmaak van buiten naar binnen, de volgorde waarin FORMAAT.md de tags nest. Alle domeinen horen bij het binnenste niveau. */
export const OPMAAK_VOLGORDE = ['onderwijs', 'highlight', 'onderstreept', 'vet', 'cursief', ...DOMEINEN] as const;
export type Opmaak = (typeof OPMAAK_VOLGORDE)[number];

/** Opmaak die als `{naam}…{/naam}` geschreven wordt; highlight is `==…==`. */
export const OPMAAK_MET_TAGNAAM = OPMAAK_VOLGORDE.filter((opmaak) => opmaak !== 'highlight');

export function nestingniveau(opmaak: Opmaak): number {
	return Math.min(OPMAAK_VOLGORDE.indexOf(opmaak), OPMAAK_VOLGORDE.indexOf('cursief') + 1);
}

export function openTag(opmaak: Opmaak): string {
	return opmaak === 'highlight' ? '==' : `{${opmaak}}`;
}

export function sluitTag(opmaak: Opmaak): string {
	return opmaak === 'highlight' ? '==' : `{/${opmaak}}`;
}

export type Tekststuk = {
	soort: 'tekst';
	tekst: string;
	/** Van buiten naar binnen, zoals de tags in de tekst staan. */
	opmaak: readonly Opmaak[];
};

/** Staat altijd buiten opmaak. */
export type Versnummer = {
	soort: 'vers';
	nummer: number;
};

export type Inlinestuk = Tekststuk | Versnummer;

export type Titel = {
	soort: 'titel';
	tekst: string;
};

export type LegeRegel = {
	soort: 'leeg';
};

export type Tekstalinea = {
	soort: 'tekst';
	stijl: Alineastijl | null;
	stukken: readonly Inlinestuk[];
};

/** Elke alinea is één regel van het bestand. */
export type Alinea = Titel | LegeRegel | Tekstalinea;

export type Hoofdstuk = {
	alineas: readonly Alinea[];
};

export class FormaatFout extends Error {
	constructor(
		readonly regel: number,
		reden: string,
	) {
		super(`regel ${regel}: ${reden}`);
		this.name = 'FormaatFout';
	}
}
