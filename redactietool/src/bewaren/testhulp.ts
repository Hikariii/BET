import type { Opslag } from '../bewerken/tussenstand';
import type { VersInhoud } from '../bewerken/types';
import type { HoofdstukData } from '../data/types';
import { parseerHoofdstuk } from '../formaat/parseer';
import type { BoekMetHoofdstukken } from './types';

export class GeheugenOpslag implements Opslag {
	readonly items = new Map<string, string>();
	getItem(sleutel: string): string | null {
		return this.items.get(sleutel) ?? null;
	}
	setItem(sleutel: string, waarde: string): void {
		this.items.set(sleutel, waarde);
	}
	removeItem(sleutel: string): void {
		this.items.delete(sleutel);
	}
}

/** Een opslag waarin bewaren onder één van de sleutels de fout van een volle opslag geeft. */
export class OpslagMetVolleSleutel extends GeheugenOpslag {
	constructor(private readonly volBij: string) {
		super();
	}
	override setItem(sleutel: string, waarde: string): void {
		if (sleutel === this.volBij) throw new DOMException('De opslag is vol', 'QuotaExceededError');
		super.setItem(sleutel, waarde);
	}
}

export const BOEK: BoekMetHoofdstukken = { id: 'lukas', hoofdstukken: [{ nummer: 1 }, { nummer: 2 }, { nummer: 3 }] };

export function inhoud(tekst: string): VersInhoud {
	return { delen: [{ stijl: null, stukken: [{ soort: 'tekst', tekst, opmaak: [] }] }] };
}

/** Een hoofdstuk uit de repo met de gegeven verzen (versnummer naar tekst). */
export function repoHoofdstuk(nummer: number, verzen: Record<number, string>): HoofdstukData {
	const tekst = `# Lukas ${nummer}\n${Object.entries(verzen)
		.map(([vers, inhoudTekst]) => `[${vers}]${inhoudTekst}`)
		.join('')}\n`;
	return { nummer, bron: parseerHoofdstuk(tekst), vereenvoudigd: parseerHoofdstuk(tekst), log: { verzen: [], algemeneVragen: [] } };
}
