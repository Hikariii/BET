import type { Grootte } from './weergave/weergave';

/** De ontwerpvarianten van de proef; `?ontwerp=v3` kiest er één. */
export const ONTWERPEN = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8a', 'v8b', 'v8c', 'v8d', 'v8e'] as const;
export type OntwerpNaam = (typeof ONTWERPEN)[number];

export type OntwerpConfig = {
	/** Eén balk, of een boekbalk met daaronder een hoofdstukbalk. */
	bovenbalk: 'een' | 'twee';
	/** De hoofdstukken in een zijbalk (inklapbaar) of als strip in de bovenbalk. */
	navigatie: 'zijbalk' | 'strip';
	/** `tekens`: leesbreedte in tekens, de kolom groeit met de grootte. `vol`: de hele breedte, de letter groeit mee met het scherm. */
	breedte: 'tekens' | 'vol';
	/** De bewaarstatus als tekst, als icoon met venster, als link naar de overzichtspagina, of als korte link (pictogram, "Bewaard" en het aantal verzen). */
	status: 'tekst' | 'icoon' | 'pagina' | 'kort';
	/**
	 * Hoe je binnen het boek naar Hoofdstukken, Vertaalkeuzes, Zo vertaald, Vertaalvragen en Zoeken en vervangen komt.
	 * `knop`: de knop Keuzes en vragen (zoals altijd). `tabbladen`: elke plek een tabblad in de boekbalk.
	 * `menu`: Hoofdstukken links, de vier andere onderdelen in het menu Hele boek. `werkbalk`: elke plek een pictogram met een kort woord. `tabbladen-iconen`: de volledige namen van `tabbladen` met de pictogrammen van `werkbalk`.
	 */
	boeknavigatie: 'knop' | 'tabbladen' | 'menu' | 'werkbalk' | 'tabbladen-iconen';
	grootteStandaard: Extract<Grootte, 0 | 1>;
	zijbalkStandaardIngeklapt: boolean;
	/** Waar de hoofdstukstrip staat (alleen bij `navigatie: 'strip'`): in een eigen rij onder de balk, of in de hoofdstukbalk tussen titel en acties. */
	stripPlek: 'rij' | 'hoofdstukbalk';
};

/** Zonder `?ontwerp=` is de tool zoals hij was: `variant` is dan `null`. */
export type Ontwerp = { variant: null } | { variant: OntwerpNaam; titel: string; config: OntwerpConfig };

const VARIANTEN: Record<OntwerpNaam, { titel: string; config: OntwerpConfig }> = {
	v1: {
		titel: 'Compact',
		config: { bovenbalk: 'een', navigatie: 'zijbalk', breedte: 'tekens', status: 'tekst', boeknavigatie: 'knop', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v2: {
		titel: 'Twee balken',
		config: { bovenbalk: 'twee', navigatie: 'zijbalk', breedte: 'tekens', status: 'tekst', boeknavigatie: 'knop', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v3: {
		titel: 'Hoofdstukstrip',
		config: { bovenbalk: 'een', navigatie: 'strip', breedte: 'vol', status: 'icoon', boeknavigatie: 'knop', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v4: {
		titel: 'Volle breedte',
		config: { bovenbalk: 'een', navigatie: 'zijbalk', breedte: 'vol', status: 'icoon', boeknavigatie: 'knop', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v5: {
		titel: 'Werkbank',
		config: { bovenbalk: 'twee', navigatie: 'zijbalk', breedte: 'tekens', status: 'pagina', boeknavigatie: 'knop', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v6: {
		titel: 'Groot lezen',
		config: { bovenbalk: 'een', navigatie: 'zijbalk', breedte: 'tekens', status: 'tekst', boeknavigatie: 'knop', grootteStandaard: 1, zijbalkStandaardIngeklapt: true, stripPlek: 'rij' },
	},
	v7: {
		titel: 'Strip, twee balken',
		config: { bovenbalk: 'twee', navigatie: 'strip', breedte: 'vol', status: 'pagina', boeknavigatie: 'knop', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v8a: {
		titel: 'Plekken als tabbladen',
		config: { bovenbalk: 'twee', navigatie: 'strip', breedte: 'vol', status: 'pagina', boeknavigatie: 'tabbladen', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v8b: {
		titel: 'Menu Hele boek',
		config: { bovenbalk: 'twee', navigatie: 'strip', breedte: 'vol', status: 'pagina', boeknavigatie: 'menu', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v8c: {
		titel: 'Compacte werkbalk',
		config: { bovenbalk: 'twee', navigatie: 'strip', breedte: 'vol', status: 'kort', boeknavigatie: 'werkbalk', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v8d: {
		titel: 'Tabbladen met pictogrammen',
		config: { bovenbalk: 'twee', navigatie: 'strip', breedte: 'vol', status: 'pagina', boeknavigatie: 'tabbladen-iconen', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'rij' },
	},
	v8e: {
		titel: 'v8d, strip in de hoofdstukbalk',
		config: { bovenbalk: 'twee', navigatie: 'strip', breedte: 'vol', status: 'pagina', boeknavigatie: 'tabbladen-iconen', grootteStandaard: 0, zijbalkStandaardIngeklapt: false, stripPlek: 'hoofdstukbalk' },
	},
};

function isOntwerpNaam(waarde: string | null): waarde is OntwerpNaam {
	return ONTWERPEN.some((naam) => naam === waarde);
}

/** Leest `?ontwerp=v1` tot `v8d` uit de zoekdeel van het adres (`window.location.search`); een onbekende waarde telt als geen. */
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

/** De css-bestanden van een variant in `ontwerp/`, in laadvolgorde: v7 is de basis (opzet van v3 met de bovenbalk van v5) waarop v8a tot en met v8e voortbouwen (v8e ook op v8d). */
export function cssVanOntwerp(variant: OntwerpNaam): string[] {
	if (variant === 'v8e') return ['v7', 'v8d', 'v8e'];
	return variant.startsWith('v8') ? ['v7', variant] : [variant];
}
