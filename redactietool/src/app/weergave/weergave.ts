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
	zijbalkIngeklapt: boolean;
};

/** Een ontwerpvariant onthoudt zijn eigen stand, zodat de standaard van de ene variant de andere niet beïnvloedt. */
function sleutel(variant: string | null): string {
	return variant === null ? 'bet-weergave' : `bet-weergave/${variant}`;
}

function isGrootte(waarde: unknown): waarde is Grootte {
	return GROOTTE_STAPPEN.some((stap) => stap === waarde);
}

/** Leest de onthouden weergave; wat ontbreekt of onleesbaar is, krijgt de waarde uit `standaard`. */
export function leesWeergave(opslag: Opslag, variant: string | null, standaard: Weergave): Weergave {
	let json: unknown;
	try {
		const tekst = opslag.getItem(sleutel(variant));
		json = tekst === null ? null : JSON.parse(tekst);
	} catch {
		return standaard;
	}
	if (typeof json !== 'object' || json === null) return standaard;
	const grootte: unknown = Reflect.get(json, 'grootte');
	const zijbalkIngeklapt: unknown = Reflect.get(json, 'zijbalkIngeklapt');
	return {
		grootte: isGrootte(grootte) ? grootte : standaard.grootte,
		zijbalkIngeklapt: typeof zijbalkIngeklapt === 'boolean' ? zijbalkIngeklapt : standaard.zijbalkIngeklapt,
	};
}

/** Onthoudt de weergave; een weigerende opslag (privémodus, vol) laat de instelling alleen tot het herladen gelden. */
export function bewaarWeergave(opslag: Opslag, variant: string | null, weergave: Weergave): void {
	try {
		opslag.setItem(sleutel(variant), JSON.stringify(weergave));
	} catch {
		return;
	}
}
