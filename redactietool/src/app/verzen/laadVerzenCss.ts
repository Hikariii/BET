import type { Dichtheid } from './dichtheid';

const STIJLEN = import.meta.glob<unknown>('./*.css');

/** Laadt de css van een dichte-verzenvariant: de gedeelde basis `dicht.css` en dan `d1.css` tot `d3.css`. Komt na de css van de ontwerpen. */
export async function laadVerzenCss(dichtheid: Dichtheid): Promise<void> {
	for (const bestand of ['dicht', dichtheid]) {
		const laad = STIJLEN[`./${bestand}.css`];
		if (laad === undefined) throw new Error(`Er is geen css voor verzen ${bestand}.`);
		await laad();
	}
}
