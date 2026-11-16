import type { Tabblad } from '../adres';
import { PLEKNAAM, type Plek } from '../navigatie/boekplekken';

/** De pagina's van een boek waar de help een eigen onderdeel voor heeft: de plekken uit de balk en de pagina Bewaard. */
export type HelpPlek = Plek | 'bewaard';

/** De plekken in de volgorde van de balk, met Bewaard achteraan. De lijst volgt `PLEKNAAM`, zodat een nieuwe plek vanzelf meetelt. */
export const HELP_PLEKKEN: readonly HelpPlek[] = [...(Object.keys(PLEKNAAM) as Plek[]), 'bewaard'];

/** De onderdelen die op elke pagina hetzelfde zijn. De id is de naam van het Markdown-bestand in `src/help/`. */
export const ALGEMENE_ONDERDELEN = ['snel-aan-de-slag', 'hoofdmenu', 'bewaren-en-laden', 'terugvoeren', 'kleuren'] as const;
export type AlgemeenOnderdeel = (typeof ALGEMENE_ONDERDELEN)[number];

/** Een onderdeel van de help; de id is de naam van het Markdown-bestand in `src/help/`, zonder `.md`. */
export type HelpOnderdeel = AlgemeenOnderdeel | `pagina-${HelpPlek}`;

export function paginaOnderdeel(plek: HelpPlek): HelpOnderdeel {
	return `pagina-${plek}`;
}

/** Alle onderdelen die een Markdown-bestand moeten hebben. */
export function alleOnderdelen(): HelpOnderdeel[] {
	return [...ALGEMENE_ONDERDELEN, ...HELP_PLEKKEN.map(paginaOnderdeel)];
}

type Pagina = 'hoofdstuk' | 'begrippen' | 'bewaard';

/** De plek waar de lezer is, uit de pagina en het tabblad van de indeling. */
export function helpPlekBijPagina(pagina: Pagina, tabblad: Tabblad | null): HelpPlek {
	if (pagina === 'bewaard') return 'bewaard';
	return pagina === 'begrippen' && tabblad !== null ? tabblad : 'hoofdstukken';
}
