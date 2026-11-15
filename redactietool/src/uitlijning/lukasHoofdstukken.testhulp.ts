import type { HoofdstukData } from '../data/types';
import { leesBijbelbestanden } from '../formaat/bijbelbestanden.testhulp';
import { parseerHoofdstuk } from '../formaat/parseer';

export type BronEnVereenvoudigd = Pick<HoofdstukData, 'nummer' | 'bron' | 'vereenvoudigd'>;

export type LukasHoofdstuk = BronEnVereenvoudigd & {
	/** De bestandstekst, onafhankelijk van de parser. */
	bronTekst: string;
	vereenvoudigdTekst: string;
};

/** Alle hoofdstukken van Lukas uit `bijbel/lukas/`, bron en vereenvoudigd, geparseerd. */
export function leesLukasHoofdstukken(): LukasHoofdstuk[] {
	const bestanden = leesBijbelbestanden();
	const hoofdstukken: LukasHoofdstuk[] = [];
	for (const bestand of bestanden.filter((kandidaat) => kandidaat.naam.startsWith('bron/'))) {
		const nummer = Number(/lukas-(\d+)\.md$/.exec(bestand.naam)?.[1]);
		const vereenvoudigd = bestanden.find((kandidaat) => kandidaat.naam === `vereenvoudigd/lukas-${String(nummer).padStart(2, '0')}.md`);
		if (vereenvoudigd === undefined) throw new Error(`vereenvoudigd hoofdstuk ${nummer} ontbreekt`);
		hoofdstukken.push({
			nummer,
			bron: parseerHoofdstuk(bestand.tekst),
			vereenvoudigd: parseerHoofdstuk(vereenvoudigd.tekst),
			bronTekst: bestand.tekst,
			vereenvoudigdTekst: vereenvoudigd.tekst,
		});
	}
	return hoofdstukken.sort((a, b) => a.nummer - b.nummer);
}
