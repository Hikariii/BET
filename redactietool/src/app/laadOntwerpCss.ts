import { cssVanOntwerp, type OntwerpNaam } from './ontwerpProef';

const STIJLEN = import.meta.glob<unknown>('./ontwerp/v*.css');

/** Laadt de css van een ontwerpvariant (`cssVanOntwerp`); die komt na de andere css in de pagina en wint dus bij gelijke specificiteit. */
export async function laadOntwerpCss(variant: OntwerpNaam): Promise<void> {
	for (const naam of cssVanOntwerp(variant)) {
		const laad = STIJLEN[`./ontwerp/${naam}.css`];
		if (laad === undefined) throw new Error(`Er is geen css voor ontwerp ${naam}.`);
		await laad();
	}
}
