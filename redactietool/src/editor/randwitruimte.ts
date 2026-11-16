import type { VersAlineadeel, VersInhoud } from '../bewerken/types';
import type { Tekststuk } from '../formaat/types';

/**
 * De witruimte aan begin en eind van elk deel zoals hij in het bestand staat: de spatie na het versnummer (`[4] Jezus`)
 * en vóór het volgende versnummer (`geleid, [5]`). Die hoort bij het bestand, niet bij de tekst die de vertaler bewerkt.
 */
export type Randen = readonly Rand[];

type Rand = { voor: string; na: string };

/** De tekst van de editor zonder de witruimte aan begin en eind van elk deel, en die witruimte apart om bij bewaren terug te zetten. */
export function zonderRandwitruimte(inhoud: VersInhoud): { inhoud: VersInhoud; randen: Randen } {
	const randen: Rand[] = [];
	const delen = inhoud.delen.map((deel): VersAlineadeel => {
		const tekst = deel.stukken.map((stuk) => stuk.tekst).join('');
		const zonderVoor = tekst.trimStart();
		const kern = zonderVoor.trimEnd();
		const voor = tekst.slice(0, tekst.length - zonderVoor.length);
		randen.push({ voor, na: zonderVoor.slice(kern.length) });
		return { stijl: deel.stijl, stukken: knip(deel.stukken, voor.length, voor.length + kern.length) };
	});
	return { inhoud: { delen }, randen };
}

/**
 * Zet de witruimte van het bestand terug om wat de vertaler bewerkte.
 * Witruimte die de vertaler zelf aan begin of eind van een deel typte, gaat eerst weg, zodat er precies de witruimte van het bestand staat.
 */
export function metRandwitruimte(inhoud: VersInhoud, randen: Randen): VersInhoud {
	return {
		delen: inhoud.delen.map((deel, index): VersAlineadeel => {
			const rand = randen[index] ?? { voor: '', na: '' };
			const tekst = deel.stukken.map((stuk) => stuk.tekst).join('');
			const zonderVoor = tekst.trimStart();
			const begin = tekst.length - zonderVoor.length;
			const kern = knip(deel.stukken, begin, begin + zonderVoor.trimEnd().length);
			return { stijl: deel.stijl, stukken: omringMet(kern, rand) };
		}),
	};
}

/** De stukken tussen twee tekenposities in de tekst van het deel; lege stukken vallen weg. */
function knip(stukken: readonly Tekststuk[], van: number, tot: number): Tekststuk[] {
	const uitkomst: Tekststuk[] = [];
	let positie = 0;
	for (const stuk of stukken) {
		const begin = Math.max(van, positie);
		const eind = Math.min(tot, positie + stuk.tekst.length);
		if (eind > begin) uitkomst.push({ ...stuk, tekst: stuk.tekst.slice(begin - positie, eind - positie) });
		positie += stuk.tekst.length;
	}
	return uitkomst;
}

/** De witruimte van het bestand staat buiten de opmaak (FORMAAT.md); grenst er een stuk zonder opmaak aan, dan gaat ze daarin op, zoals in het bestand. */
function omringMet(stukken: Tekststuk[], { voor, na }: Rand): Tekststuk[] {
	const uitkomst = [...stukken];
	if (voor !== '') {
		const eerste = uitkomst[0];
		if (eerste !== undefined && eerste.opmaak.length === 0) uitkomst[0] = { ...eerste, tekst: voor + eerste.tekst };
		else uitkomst.unshift({ soort: 'tekst', tekst: voor, opmaak: [] });
	}
	if (na !== '') {
		const laatste = uitkomst.at(-1);
		if (laatste !== undefined && laatste.opmaak.length === 0) uitkomst[uitkomst.length - 1] = { ...laatste, tekst: laatste.tekst + na };
		else uitkomst.push({ soort: 'tekst', tekst: na, opmaak: [] });
	}
	return uitkomst;
}
