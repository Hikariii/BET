import type { VersRef } from '../data/types';
import { zoekWoorden } from './precedentZoek';

/** Een vorm als lijst woorden, klaar voor `maakZoekvorm`. */
type Vormwoorden = string[];

type BronVormen = { soort: 'vormen'; vormen: Vormwoorden[]; haakjesGenegeerd: boolean } | { soort: 'niet telbaar'; reden: string };

type DoelVormen = { soort: 'blijft' } | { soort: 'vormen'; vormen: Vormwoorden[] } | { soort: 'niet telbaar'; reden: string };

const OPEN_PLEK = /…|\.\.\./;

/** Een werkregel of verschijnsel in de kolom Vereenvoudigd: geen vorm die in de tekst te zoeken is. Alleen het deel vóór de eerste ";" telt. */
const WERKREGEL =
	/contextafhankelijk|weglaten|vervalt|niet doen|opsplitsen|rechtzetten|herhaal|krijgt een|zelfstandig naamwoord|geen uitleg|gekrulde|uitleg zoals|benoemen|alleen het werkwoord|hoofdletter|“|`/;

/** Een verschijnsel in de kolom Bron (opmaak, leestekens, zinsbouw) in plaats van een woordvorm. */
const VERSCHIJNSEL =
	/aanhalingsteken|komma's|apostrof|`|dubbelzinnig|grammaticale fouten|zinnen zonder|opsomming zonder|antwoord zonder|wisselend onderwerp|citaat na|gebed\/spreuk|spreker ontbreekt|volksnamen|drie keer|doen \+ infinitief|niet één|laten wie|uitleg (tussen|die)|rode Jezus|opening “/;

const VASTE_HAAKJES = /(?<=\p{L})\(([^)\s]+)\)|\(([^)\s]+)\)(?=\p{L})/u;

/** "discipel(en)" wordt "discipel" en "discipelen"; "(lampen)standaard" wordt "standaard" en "lampenstandaard". */
function vasteHaakjesUitgevouwen(tekst: string): string[] {
	const treffer = VASTE_HAAKJES.exec(tekst);
	if (treffer === null) return [tekst];
	const zonder = tekst.replace(VASTE_HAAKJES, '');
	const met = tekst.replace(VASTE_HAAKJES, treffer[1] ?? treffer[2] ?? '');
	return [...vasteHaakjesUitgevouwen(zonder), ...vasteHaakjesUitgevouwen(met)];
}

const HAAKJES = /\s*\([^)]*\)/g;

/** Splitst op " / " en, bij een lijst van korte stukken, op komma's. */
function varianten(tekst: string): string[] {
	return tekst.split(' / ').flatMap((deel) => {
		const stukken = deel.split(',').map((stuk) => stuk.trim());
		const isLijst = stukken.length >= 2 && stukken.every((stuk) => stuk.split(/\s+/).length <= 2);
		return isLijst ? stukken : [deel];
	});
}

function totVormen(tekst: string): Vormwoorden[] {
	const vormen: Vormwoorden[] = [];
	for (const variant of varianten(tekst)) {
		const woorden = zoekWoorden(variant).filter((woord) => woord !== '|');
		if (woorden.length > 0 && !vormen.some((vorm) => vorm.join(' ') === woorden.join(' '))) vormen.push(woorden);
	}
	return vormen;
}

/** De vormen uit de kolom Bron. Haakjes met een spatie ervoor (context of een optioneel deel) doen niet mee. */
export function leesBronVormen(cel: string): BronVormen {
	if (OPEN_PLEK.test(cel)) return { soort: 'niet telbaar', reden: 'de bronkolom heeft een open plek (…), die niet te zoeken is' };
	if (VERSCHIJNSEL.test(cel)) return { soort: 'niet telbaar', reden: 'de bronkolom beschrijft een verschijnsel (opmaak, leesteken of zinsbouw), geen woord' };
	const uitgevouwen = vasteHaakjesUitgevouwen(cel);
	const haakjesGenegeerd = uitgevouwen.some((tekst) => tekst.includes('('));
	const vormen = uitgevouwen.flatMap((tekst) => totVormen(tekst.replace(HAAKJES, ' ')));
	if (vormen.length === 0) return { soort: 'niet telbaar', reden: 'de bronkolom bevat geen woorden' };
	return { soort: 'vormen', vormen, haakjesGenegeerd };
}

/** De vormen uit de kolom Vereenvoudigd. "blijft" en een cel met alleen "eerste keer …" betekenen: de bronvorm blijft staan. */
export function leesDoelVormen(cel: string): DoelVormen {
	if (/^blijf/.test(cel) || /^eerste keer/.test(cel)) return { soort: 'blijft' };
	if (OPEN_PLEK.test(cel)) return { soort: 'niet telbaar', reden: 'de kolom Vereenvoudigd heeft een open plek (…), die niet te zoeken is' };
	const eersteDeel = (cel.split(/;| \u2014 /)[0] ?? '').split('→').at(-1) ?? '';
	if (WERKREGEL.test(eersteDeel)) return { soort: 'niet telbaar', reden: 'de kolom Vereenvoudigd beschrijft een werkregel, geen vaste vorm' };
	const zonderUitleg = eersteDeel.replace(/eerste keer.*$/, '');
	const vormen = vasteHaakjesUitgevouwen(zonderUitleg).flatMap((tekst) => totVormen(tekst.replace(HAAKJES, ' ')));
	if (vormen.length === 0) return { soort: 'niet telbaar', reden: 'de kolom Vereenvoudigd bevat geen woorden' };
	return { soort: 'vormen', vormen };
}

const PLAATS_VERWIJZING = /(\d+):(\d+)(?:\s*[–-]\s*(\d+))?/g;

/** De verzen uit de kolom Plaats ("4:35, 4:39", "4:18–19"). Wat tussen haakjes staat ("vgl. 5:26") is een verwijzing naar een ander vers en doet niet mee. */
export function leesPlaatsVerzen(plaats: string): VersRef[] {
	const verzen: VersRef[] = [];
	for (const treffer of plaats.replace(/\([^)]*\)/g, '').matchAll(PLAATS_VERWIJZING)) {
		const hoofdstuk = Number(treffer[1]);
		const eerste = Number(treffer[2]);
		const laatste = Number(treffer[3] ?? treffer[2]);
		for (let vers = eerste; vers <= laatste; vers++) verzen.push({ hoofdstuk, vers });
	}
	return verzen;
}
