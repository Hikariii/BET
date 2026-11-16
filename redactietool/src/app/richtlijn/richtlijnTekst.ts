import type { Markering, RichtlijnSectie } from '../../data/types';
import type { RichtlijnReactie } from '../../reacties/richtlijnReacties';

const MARKERING_VOORAF: Record<Markering['soort'], string> = {
	nieuw: 'nieuw in',
	gewijzigd: 'gewijzigd in',
	open: 'open in',
};

/** Het label bij een kop: `nieuw in v1.4`, `gewijzigd in v1.4` of `open in v1.4`. */
export function markeringTekst({ soort, versie }: Markering): string {
	return `${MARKERING_VOORAF[soort]} v${versie}`;
}

/** Het label in de inhoudsopgave bij een paragraaf met een reactie: `voorstel` als de vertaler een nieuwe of andere regel voorstelt, anders `gereageerd`. */
export function reactieLabel(reactie: Pick<RichtlijnReactie, 'voorstel'>): 'voorstel' | 'gereageerd' {
	return reactie.voorstel ? 'voorstel' : 'gereageerd';
}

/** De `id` van een sectie op de pagina: `richtlijn-17B`, of `richtlijn-sectie-<volgnummer>` voor een kop zonder nummer. */
export function sectieId(sectie: RichtlijnSectie, volgnummer: number): string {
	return sectie.paragraaf === '' ? `richtlijn-sectie-${volgnummer}` : `richtlijn-${sectie.paragraaf}`;
}

/** De kop van een sectie als tekst: `§17B Messias / Christus`, of alleen de titel bij een kop zonder nummer. */
export function sectiekop(sectie: Pick<RichtlijnSectie, 'paragraaf' | 'titel'>): string {
	return sectie.paragraaf === '' ? sectie.titel : `§${sectie.paragraaf} ${sectie.titel}`;
}
