import type { Opslag } from '../../bewerken/tussenstand';

/** De lettergrootte in stappen: 0 is zoals de tool nu is, de andere zijn kleiner of groter. */
export const GROOTTE_STAPPEN = [-1, 0, 1, 2] as const;
export type Grootte = (typeof GROOTTE_STAPPEN)[number];

const SCHAAL: Record<Grootte, number> = { '-1': 0.92, '0': 1, '1': 1.08, '2': 1.16 };

/** De factor waarmee de basisletter van de tool (`--schaal` op `<html>`) vergroot of verkleind wordt. */
export function schaalVan(grootte: Grootte): number {
	return SCHAAL[grootte];
}

/** Wat de gebruiker aan de weergave instelt en de browser onthoudt. */
export type Weergave = {
	grootte: Grootte;
	/** Alle vertaalregels staan vast in hun kolom, zoals met de punaise per vers (de punaise in de kolomkop). */
	alleRegelsVast: boolean;
};

const SLEUTEL = 'bet-weergave';

const STANDAARD: Weergave = { grootte: 0, alleRegelsVast: false };

function isGrootte(waarde: unknown): waarde is Grootte {
	return GROOTTE_STAPPEN.some((stap) => stap === waarde);
}

/** Leest de onthouden weergave; wat ontbreekt of onleesbaar is, krijgt de standaard (grootte 0, regels niet vast). */
export function leesWeergave(opslag: Opslag): Weergave {
	let json: unknown;
	try {
		const tekst = opslag.getItem(SLEUTEL);
		json = tekst === null ? null : JSON.parse(tekst);
	} catch {
		return STANDAARD;
	}
	if (typeof json !== 'object' || json === null) return STANDAARD;
	const grootte: unknown = Reflect.get(json, 'grootte');
	const alleRegelsVast: unknown = Reflect.get(json, 'alleRegelsVast');
	return { grootte: isGrootte(grootte) ? grootte : STANDAARD.grootte, alleRegelsVast: alleRegelsVast === true };
}

/** Onthoudt de weergave; een weigerende opslag (privémodus, vol) laat de instelling alleen tot het herladen gelden. */
export function bewaarWeergave(opslag: Opslag, weergave: Weergave): void {
	try {
		opslag.setItem(SLEUTEL, JSON.stringify(weergave));
	} catch {
		return;
	}
}
