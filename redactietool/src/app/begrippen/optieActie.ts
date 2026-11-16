import { isHoudOptie } from '../../begrippen/opties';
import type { Voorstel } from '../../vervangen/voorstel';

/**
 * Wat de knop achter een optie van een vertaalvraag doet.
 * `kiezen`: de tool legt het antwoord vast (een optie die de tekst houdt) of vult Zoeken en vervangen helemaal in (een markeringswissel met een zoekterm).
 * `zoek-plekken`: de tool kan niet invullen wat er moet komen; Zoeken en vervangen opent met de verzen van de vraag als bereik en, als de vraag één woord noemt, dat woord als zoekterm.
 * `geen`: de tool heeft niets om mee te zoeken, want de vraag noemt geen enkel woord en geen vers.
 */
export type OptieActie = 'kiezen' | 'zoek-plekken' | 'geen';

/** `voorstel` is wat `maakVoorstel` van deze optie maakt; bij een houden-optie speelt het niet mee. */
export function optieActie(vraag: { verzen: readonly unknown[] }, optie: string, voorstel: Voorstel): OptieActie {
	if (isHoudOptie(optie)) return 'kiezen';
	if (voorstel.opdracht === 'markering' && voorstel.zoekterm !== '') return 'kiezen';
	return voorstel.zoekterm !== '' || vraag.verzen.length > 0 ? 'zoek-plekken' : 'geen';
}
