import type { Uitkomst } from '../antwoorden/antwoorden';
import { nietOpgeslagen, RUIMTE_MAKEN, TEKST_BLIJFT } from '../bewerken/opslagVol';
import type { Opslag } from '../bewerken/tussenstand';

/**
 * Een reactie van de vertaler op een opmerking van Claude (een `O`-nummer uit een wijzigingslog).
 * Het O-nummer is afgeleid van de plek in het log en kan verschuiven als het log verandert; `kwestie` laat Claude zien welke opmerking bedoeld was.
 * Een reactie zonder tekst en zonder `wordtVraag` bestaat niet.
 * Het register `open-vragen.md` verandert hierdoor niet; dat doet Claude bij het terugvoeren, na akkoord van de eigenaar.
 */
export type Reactie = {
	nr: string;
	/** Het hoofdstuk van het log waar de opmerking in staat. */
	hoofdstuk: number;
	kwestie: string;
	tekst: string;
	/** De vertaler wil dat Claude van deze opmerking een vertaalvraag in het register maakt. */
	wordtVraag: boolean;
	/** ISO-tijd waarop de reactie voor het laatst is vastgelegd; bij samenvoegen van een back-up wint per nummer de nieuwste. */
	gegeven: string;
};

/** De sleutel waaronder de reacties van een boek in de opslag staan. */
export function reactiesSleutel(boek: string): string {
	return `bet-reacties/${boek}`;
}

/** Leest één reactie uit opgeslagen JSON; `null` bij een onbruikbare vorm. */
export function alsReactie(waarde: unknown): Reactie | null {
	if (typeof waarde !== 'object' || waarde === null || Array.isArray(waarde)) return null;
	const { nr, hoofdstuk, kwestie, tekst, wordtVraag, gegeven } = waarde as Record<string, unknown>;
	if (typeof nr !== 'string' || typeof kwestie !== 'string' || typeof tekst !== 'string' || typeof gegeven !== 'string') return null;
	if (typeof hoofdstuk !== 'number' || !Number.isInteger(hoofdstuk) || hoofdstuk < 1 || typeof wordtVraag !== 'boolean') return null;
	return { nr, hoofdstuk, kwestie, tekst, wordtVraag, gegeven };
}

/** Alle reacties van een boek, op volgorde van bewaren; onleesbare opslag geeft een lege lijst, een onleesbare reactie wordt overgeslagen. */
export function leesReacties(opslag: Opslag, boek: string): Reactie[] {
	try {
		const tekst = opslag.getItem(reactiesSleutel(boek));
		if (tekst === null) return [];
		const json: unknown = JSON.parse(tekst);
		if (!Array.isArray(json)) return [];
		return json.flatMap((waarde) => alsReactie(waarde) ?? []);
	} catch {
		return [];
	}
}

/** Schrijft de lijst terug; zonder reacties verdwijnt de sleutel. Geeft `false` als de opslag het weigert. */
export function schrijfReacties(opslag: Opslag, boek: string, reacties: readonly Reactie[]): boolean {
	try {
		if (reacties.length === 0) opslag.removeItem(reactiesSleutel(boek));
		else opslag.setItem(reactiesSleutel(boek), JSON.stringify(reacties));
		return true;
	} catch {
		return false;
	}
}

const OPSLAG_VOL = `${nietOpgeslagen('De reactie')} ${RUIMTE_MAKEN} ${TEKST_BLIJFT}`;

function opgeslagen(gelukt: boolean): Uitkomst {
	return gelukt ? { gelukt: true } : { gelukt: false, melding: OPSLAG_VOL };
}

/** Haalt de reactie op een opmerking weg; bestaat er geen, dan gebeurt er niets. */
export function haalReactieWeg(opslag: Opslag, boek: string, nr: string): Uitkomst {
	const reacties = leesReacties(opslag, boek);
	if (!reacties.some((reactie) => reactie.nr === nr)) return { gelukt: true };
	return opgeslagen(
		schrijfReacties(
			opslag,
			boek,
			reacties.filter((reactie) => reactie.nr !== nr),
		),
	);
}

/**
 * Bewaart een reactie; een eerdere reactie op dezelfde opmerking wordt vervangen.
 * Een reactie met alleen witruimte als tekst en zonder `wordtVraag` bestaat niet: dan is bewaren hetzelfde als weghalen.
 */
export function bewaarReactie(opslag: Opslag, boek: string, reactie: Reactie): Uitkomst {
	const schoon = { ...reactie, tekst: reactie.tekst.trim() };
	if (schoon.tekst === '' && !schoon.wordtVraag) return haalReactieWeg(opslag, boek, schoon.nr);
	const overige = leesReacties(opslag, boek).filter((bestaand) => bestaand.nr !== schoon.nr);
	return opgeslagen(schrijfReacties(opslag, boek, [...overige, schoon]));
}
