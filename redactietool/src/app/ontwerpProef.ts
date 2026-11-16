import type { Grootte } from './weergave/weergave';

/** De zes ontwerpvarianten van de proefronde; `?ontwerp=v3` kiest er één. */
export const ONTWERPEN = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] as const;
export type OntwerpNaam = (typeof ONTWERPEN)[number];

export type OntwerpConfig = {
	/** Eén balk, of een boekbalk met daaronder een hoofdstukbalk. */
	bovenbalk: 'een' | 'twee';
	/** De hoofdstukken in een zijbalk (inklapbaar) of als strip in de bovenbalk. */
	navigatie: 'zijbalk' | 'strip';
	/** `tekens`: leesbreedte in tekens, de kolom groeit met de grootte. `vol`: de hele breedte, de letter groeit mee met het scherm. */
	breedte: 'tekens' | 'vol';
	/** De bewaarstatus als tekst, als icoon met venster, of als link naar de overzichtspagina. */
	status: 'tekst' | 'icoon' | 'pagina';
	grootteStandaard: Extract<Grootte, 0 | 1>;
	zijbalkStandaardIngeklapt: boolean;
};

/** Zonder `?ontwerp=` is de tool zoals hij was: `variant` is dan `null`. */
export type Ontwerp = { variant: null } | { variant: OntwerpNaam; titel: string; config: OntwerpConfig };

const VARIANTEN: Record<OntwerpNaam, { titel: string; config: OntwerpConfig }> = {
	v1: {
		titel: 'Compact',
		config: { bovenbalk: 'een', navigatie: 'zijbalk', breedte: 'tekens', status: 'tekst', grootteStandaard: 0, zijbalkStandaardIngeklapt: false },
	},
	v2: {
		titel: 'Twee balken',
		config: { bovenbalk: 'twee', navigatie: 'zijbalk', breedte: 'tekens', status: 'tekst', grootteStandaard: 0, zijbalkStandaardIngeklapt: false },
	},
	v3: {
		titel: 'Hoofdstukstrip',
		config: { bovenbalk: 'een', navigatie: 'strip', breedte: 'vol', status: 'icoon', grootteStandaard: 0, zijbalkStandaardIngeklapt: false },
	},
	v4: {
		titel: 'Volle breedte',
		config: { bovenbalk: 'een', navigatie: 'zijbalk', breedte: 'vol', status: 'icoon', grootteStandaard: 0, zijbalkStandaardIngeklapt: false },
	},
	v5: {
		titel: 'Werkbank',
		config: { bovenbalk: 'twee', navigatie: 'zijbalk', breedte: 'tekens', status: 'pagina', grootteStandaard: 0, zijbalkStandaardIngeklapt: false },
	},
	v6: {
		titel: 'Groot lezen',
		config: { bovenbalk: 'een', navigatie: 'zijbalk', breedte: 'tekens', status: 'tekst', grootteStandaard: 1, zijbalkStandaardIngeklapt: true },
	},
};

function isOntwerpNaam(waarde: string | null): waarde is OntwerpNaam {
	return ONTWERPEN.some((naam) => naam === waarde);
}

/** Leest `?ontwerp=v1` tot `v6` uit de zoekdeel van het adres (`window.location.search`); een onbekende waarde telt als geen. */
export function leesOntwerp(zoekdeel: string): Ontwerp {
	const waarde = new URLSearchParams(zoekdeel).get('ontwerp');
	return isOntwerpNaam(waarde) ? { variant: waarde, ...VARIANTEN[waarde] } : { variant: null };
}

/** Het adres van de huidige pagina met een andere (of geen) variant, voor de keuzestrook. De hash blijft staan zodat je op dezelfde plek blijft. */
export function adresMetOntwerp(huidig: string, variant: OntwerpNaam | null): string {
	const adres = new URL(huidig);
	if (variant === null) adres.searchParams.delete('ontwerp');
	else adres.searchParams.set('ontwerp', variant);
	return adres.href;
}
