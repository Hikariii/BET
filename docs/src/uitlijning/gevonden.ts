import type { HoofdstukData, VersRef } from '../data/types';
import { isFunctiewoord } from './functiewoorden';
import { lijnHoofdstukUit, type Uitlijningsdeel } from './uitlijn';
import type { Token } from './woorden';

/** Een langer stuk is geen woord of vaste woordgroep meer maar een herschreven zin; de koppeling zou dan niet kloppen. */
const MAXIMAAL_BRONWOORDEN_PER_VORM = 4;
const MAXIMAAL_NIEUWE_WOORDEN_PER_VORM = 6;

export type Vertaling = {
	/** In kleine letters; leeg als de bronvorm wegviel. */
	nieuw: string;
	/** Eerste voorkomen met hoofdletters zoals in de tekst. */
	voorbeeld: string;
	/** De bronvorm bleef ongewijzigd. */
	gelijk: boolean;
	aantal: number;
	/** Elk vers één keer, op volgorde van voorkomen. */
	verzen: VersRef[];
};

export type Bronvorm = {
	/** Een woord of korte woordgroep in kleine letters. */
	bronvorm: string;
	/** Eerste voorkomen met hoofdletters zoals in de bron. */
	voorbeeld: string;
	aantal: number;
	/** Meest voorkomende eerst. */
	vertalingen: Vertaling[];
};

type Voorkomen = { bronvorm: string; voorbeeld: string; nieuw: string; nieuwVoorbeeld: string; gelijk: boolean };

function samenvoegen(woorden: readonly Token[], vorm: (woord: Token) => string): string {
	return woorden.map(vorm).join(' ');
}

function voorkomensIn(deel: Uitlijningsdeel): Voorkomen[] {
	switch (deel.soort) {
		case 'toegevoegd':
			return [];
		case 'gelijk':
			return deel.bron.map((woord, index) => ({
				bronvorm: woord.vergelijkvorm,
				voorbeeld: woord.tekst,
				nieuw: woord.vergelijkvorm,
				nieuwVoorbeeld: deel.nieuw[index]?.tekst ?? woord.tekst,
				gelijk: true,
			}));
		case 'vervangen':
		case 'weggevallen': {
			if (deel.bron.length > MAXIMAAL_BRONWOORDEN_PER_VORM || deel.nieuw.length > MAXIMAAL_NIEUWE_WOORDEN_PER_VORM) return [];
			return [
				{
					bronvorm: samenvoegen(deel.bron, (woord) => woord.vergelijkvorm),
					voorbeeld: samenvoegen(deel.bron, (woord) => woord.tekst),
					nieuw: samenvoegen(deel.nieuw, (woord) => woord.vergelijkvorm),
					nieuwVoorbeeld: samenvoegen(deel.nieuw, (woord) => woord.tekst),
					gelijk: false,
				},
			];
		}
	}
}

/**
 * Per bronvorm (woord of korte woordgroep) alle vertalingen in het boek, ook "ongewijzigd" en "weggevallen", met aantallen en verzen.
 * Het resultaat is automatisch afgeleid uit de woorduitlijning; bij vrij herschreven zinnen is de koppeling onzeker.
 * Meest voorkomende bronvormen eerst.
 */
export function vindVertalingen(hoofdstukken: readonly Pick<HoofdstukData, 'nummer' | 'bron' | 'vereenvoudigd'>[]): Bronvorm[] {
	const bronvormen = new Map<string, Bronvorm>();
	for (const hoofdstuk of hoofdstukken) {
		for (const { vers, delen } of lijnHoofdstukUit(hoofdstuk.bron, hoofdstuk.vereenvoudigd)) {
			for (const deel of delen) {
				for (const voorkomen of voorkomensIn(deel)) {
					let bronvorm = bronvormen.get(voorkomen.bronvorm);
					if (bronvorm === undefined) {
						bronvorm = { bronvorm: voorkomen.bronvorm, voorbeeld: voorkomen.voorbeeld, aantal: 0, vertalingen: [] };
						bronvormen.set(voorkomen.bronvorm, bronvorm);
					}
					bronvorm.aantal++;
					let vertaling = bronvorm.vertalingen.find((kandidaat) => kandidaat.nieuw === voorkomen.nieuw);
					if (vertaling === undefined) {
						vertaling = { nieuw: voorkomen.nieuw, voorbeeld: voorkomen.nieuwVoorbeeld, gelijk: voorkomen.gelijk, aantal: 0, verzen: [] };
						bronvorm.vertalingen.push(vertaling);
					}
					vertaling.aantal++;
					const plek = { hoofdstuk: hoofdstuk.nummer, vers };
					if (vertaling.verzen.at(-1)?.hoofdstuk !== plek.hoofdstuk || vertaling.verzen.at(-1)?.vers !== plek.vers) vertaling.verzen.push(plek);
				}
			}
		}
	}
	const resultaat = [...bronvormen.values()];
	for (const bronvorm of resultaat) bronvorm.vertalingen.sort((a, b) => b.aantal - a.aantal || a.nieuw.localeCompare(b.nieuw, 'nl'));
	return resultaat.sort((a, b) => b.aantal - a.aantal || a.bronvorm.localeCompare(b.bronvorm, 'nl'));
}

/** Aantal voorkomens buiten de meest voorkomende vertaling, maal het aandeel daarvan: een woord dat in 3 van 244 gevallen anders gaat ("zei") staat onder een woord dat in 17 van 28 gevallen wisselt ("menigte"). */
function mateVanWisseling(bronvorm: Bronvorm): number {
	const afwijkend = bronvorm.aantal - (bronvorm.vertalingen[0]?.aantal ?? 0);
	return (afwijkend * afwijkend) / bronvorm.aantal;
}

/** Bronvormen met meer dan één uitkomst, de sterkst wisselende eerst. Woorden als "en" en "de" vallen af: dat zijn geen vertaalkeuzes. */
export function verschillendVertaald(bronvormen: readonly Bronvorm[]): Bronvorm[] {
	return bronvormen
		.filter((bronvorm) => bronvorm.vertalingen.length > 1 && !bronvorm.bronvorm.split(' ').every(isFunctiewoord))
		.sort((a, b) => mateVanWisseling(b) - mateVanWisseling(a) || b.aantal - a.aantal || a.bronvorm.localeCompare(b.bronvorm, 'nl'));
}
