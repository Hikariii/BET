/**
 * Een modale dialoog staat open, bijvoorbeeld de help of Back-up inladen.
 * Toetsen als `?` en Escape horen dan bij de dialoog en niet bij de pagina eronder.
 */
export function dialoogOpen(): boolean {
	return document.querySelector('dialog[open]') !== null;
}
