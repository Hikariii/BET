/**
 * De lay-outproeven voor de leespagina: `?layout=r1` tot `r4` (andere plek voor de vertaalregels),
 * `p1` tot `p3` (andere plek voor de naslag) en `nu` voor de huidige. Weg zodra de eigenaar gekozen heeft.
 */
export const LAYOUTPROEVEN = ['nu', 'r1', 'r2', 'r3', 'r4', 'p1', 'p2', 'p3'] as const;
export type LayoutProef = (typeof LAYOUTPROEVEN)[number];

const PARAMETER = 'layout';

function isLayoutProef(waarde: string): waarde is LayoutProef {
	return (LAYOUTPROEVEN as readonly string[]).includes(waarde);
}

/** De proef uit de zoekreeks van het adres; `null` zonder (geldige) parameter, dan blijft de tool zoals hij is. */
export function layoutUitZoekreeks(zoekreeks: string): LayoutProef | null {
	const waarde = new URLSearchParams(zoekreeks).get(PARAMETER);
	return waarde !== null && isLayoutProef(waarde) ? waarde : null;
}

/** De zoekreeks met de gekozen proef erin, met `?` ervoor; andere parameters blijven staan. */
export function zoekreeksMetLayout(zoekreeks: string, layout: LayoutProef): string {
	const parameters = new URLSearchParams(zoekreeks);
	parameters.set(PARAMETER, layout);
	return `?${parameters.toString()}`;
}

/** Waar de vertaalregels van een vers staan. */
export type RegelsWeergave = 'kolom' | 'onder-gekozen' | 'onder-altijd' | 'uitklapbaar' | 'zwevend';

/** r1 tot r3 hebben geen kolom en dus ook geen schakelaar; p2 heeft de kolom nodig voor de naslag; de rest volgt de schakelaar. */
export function regelsWeergave(layout: LayoutProef | null, regelsAltijdZichtbaar: boolean): RegelsWeergave {
	switch (layout) {
		case 'r1':
			return 'onder-altijd';
		case 'r2':
			return 'uitklapbaar';
		case 'r3':
			return 'zwevend';
		case 'p2':
			return 'kolom';
		case 'nu':
		case 'r4':
		case 'p1':
		case 'p3':
		case null:
			return regelsAltijdZichtbaar ? 'kolom' : 'onder-gekozen';
	}
}

/** Waar de naslag opent: `rechts` duwt de pagina (zoals nu), `zwevend` ligt over de pagina, `kolom` neemt de plek van de vertaalregels, `kaart` staat onder het vers. */
export type NaslagPlek = 'rechts' | 'zwevend' | 'kolom' | 'kaart';

export function naslagPlek(layout: LayoutProef | null): NaslagPlek {
	switch (layout) {
		case 'r4':
		case 'p1':
			return 'zwevend';
		case 'p2':
			return 'kolom';
		case 'p3':
			return 'kaart';
		case 'nu':
		case 'r1':
		case 'r2':
		case 'r3':
		case null:
			return 'rechts';
	}
}
