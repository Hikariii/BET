import type { OntwerpNaam } from './ontwerpProef';

const STIJLEN = import.meta.glob<unknown>('./ontwerp/v*.css');

/** Laadt het css-bestand van een ontwerpvariant (`ontwerp/v1.css` tot `v6.css`); het komt na de andere css in de pagina en wint dus bij gelijke specificiteit. */
export async function laadOntwerpCss(variant: OntwerpNaam): Promise<void> {
	const laad = STIJLEN[`./ontwerp/${variant}.css`];
	if (laad === undefined) throw new Error(`Er is geen css voor ontwerp ${variant}.`);
	await laad();
}
