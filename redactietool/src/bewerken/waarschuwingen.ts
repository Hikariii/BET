import { ALINEASTIJLEN, OPMAAK_VOLGORDE } from '../formaat/types';
import type { VersInhoud, Waarschuwing } from './types';

/** Alle opmaak in een vers: de alineastijlen van de delen en de tags van de tekststukken met tekst. */
function opmaakInVers(vers: VersInhoud): Set<string> {
	const gevonden = new Set<string>();
	for (const deel of vers.delen) {
		if (deel.stijl !== null) gevonden.add(deel.stijl);
		for (const stuk of deel.stukken) {
			if (stuk.tekst === '') continue;
			for (const opmaak of stuk.opmaak) gevonden.add(opmaak);
		}
	}
	return gevonden;
}

/**
 * Waarschuwingen voor een bewerkt vers ten opzichte van de bron van dat vers: elke opmaak die de bron in het vers
 * heeft en het bewerkte vers niet meer. Dezelfde betekenis als "opmaak uit de bron ontbreekt" in `controleer_hoofdstuk.py`:
 * het gaat om aanwezigheid in het vers, niet om aantallen.
 */
export function waarschuwingenVoorVers(bron: VersInhoud, bewerkt: VersInhoud): Waarschuwing[] {
	const inBron = opmaakInVers(bron);
	const inBewerkt = opmaakInVers(bewerkt);
	const waarschuwingen: Waarschuwing[] = [];
	for (const stijl of ALINEASTIJLEN) {
		if (inBron.has(stijl) && !inBewerkt.has(stijl)) {
			waarschuwingen.push({
				soort: 'opmaak-weg',
				opmaak: stijl,
				tekst: `De alineastijl ${stijl} uit de bron staat niet meer in dit vers.`,
			});
		}
	}
	for (const opmaak of OPMAAK_VOLGORDE) {
		if (inBron.has(opmaak) && !inBewerkt.has(opmaak)) {
			waarschuwingen.push({
				soort: 'opmaak-weg',
				opmaak,
				tekst: `De markering ${opmaak} uit de bron staat niet meer in dit vers.`,
			});
		}
	}
	return waarschuwingen;
}
