/**
 * De vaste woorden van de meldingen bij een volle opslag: één werkwoord ("opslaan") en één stap.
 * De melding zegt wat er niet is opgeslagen, dan de stap.
 */

/** De stap bij een volle opslag. */
export const RUIMTE_MAKEN = 'Download een back-up en maak ruimte vrij in de browser (Instellingen, browsergegevens).';

/** Alleen te gebruiken waar de tekst op het scherm blijft staan. */
export const TEKST_BLIJFT = 'Je tekst gaat niet verloren zolang dit venster open staat.';

/** "<wat> kon niet worden opgeslagen: de opslag van de browser is vol." */
export function nietOpgeslagen(wat: string): string {
	return `${wat} kon niet worden opgeslagen: de opslag van de browser is vol.`;
}
