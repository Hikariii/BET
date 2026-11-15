import { bewaarVers } from '../../bewerken/tussenstand';
import type { VersInhoud } from '../../bewerken/types';
import { knipVers } from '../../bewerken/versknip';
import type { HoofdstukData } from '../../data/types';
import type { Opmaak } from '../../formaat/types';
import { maakGeheugenopslag, type Geheugenopslag } from './geheugenopslag';

/** De galerij toont de gegevens van dit boek; de gekozen verzen zijn van dit boek. */
export const GALERIJ_BOEK = 'lukas';

export type Vers = { hoofdstuk: number; vers: number };

/** Verzen uit de echte hoofdstukken, gekozen om de lastige gevallen te tonen. */
export const VERZEN = {
	jezuswoorden: { hoofdstuk: 4, vers: 25 },
	domein: { hoofdstuk: 7, vers: 48 },
	onderwijs: { hoofdstuk: 4, vers: 31 },
	onderstreeptEnVet: { hoofdstuk: 4, vers: 18 },
	langVers: { hoofdstuk: 12, vers: 1 },
	meerdereAlineas: { hoofdstuk: 4, vers: 35 },
	veelRegels: { hoofdstuk: 1, vers: 17 },
	metVraag: { hoofdstuk: 5, vers: 12 },
	metOpenVraag: { hoofdstuk: 6, vers: 9 },
	zonderRegels: { hoofdstuk: 4, vers: 30 },
	gekozen: { hoofdstuk: 4, vers: 26 },
	editorMetWaarschuwing: { hoofdstuk: 5, vers: 24 },
	gewijzigd: { hoofdstuk: 4, vers: 44 },
	verouderd: { hoofdstuk: 4, vers: 15 },
	opslagVol: { hoofdstuk: 8, vers: 1 },
} as const satisfies Record<string, Vers>;

/** Het hoofdstuk waarvan de acties (kopiëren, export) in de galerij staan: het heeft een gewijzigd en een verouderd vers. */
export const HOOFDSTUK_MET_ACTIES = VERZEN.gewijzigd.hoofdstuk;

/** Het zoekwoord voor het tabblad Vervangen: komt voor in goedgekeurde en andere hoofdstukken en een paar keer over een opmaakgrens. */
export const ZOEKOPDRACHT = { zoek: 'leven', nieuw: 'bestaan' };

function vervangTekst(inhoud: VersInhoud, van: string, naar: string): VersInhoud {
	return {
		delen: inhoud.delen.map((deel) => ({
			...deel,
			stukken: deel.stukken.map((stuk) => ({ ...stuk, tekst: stuk.tekst.replace(van, naar) })),
		})),
	};
}

function zonderOpmaak(inhoud: VersInhoud, weg: readonly Opmaak[]): VersInhoud {
	return {
		delen: inhoud.delen.map((deel) => ({
			...deel,
			stukken: deel.stukken.map((stuk) => ({ ...stuk, opmaak: stuk.opmaak.filter((opmaak) => !weg.includes(opmaak)) })),
		})),
	};
}

/** De sleutel waaronder de tussenstand van een hoofdstuk staat, zonder het formaat ervan na te schrijven. */
function sleutelVan(boek: string, hoofdstuk: number): string {
	const sonde = maakGeheugenopslag();
	const leeg: VersInhoud = { delen: [] };
	bewaarVers(sonde, boek, hoofdstuk, 1, leeg, leeg);
	const [sleutel] = sonde.sleutels();
	if (sleutel === undefined) throw new Error('De tussenstand schreef niets weg.');
	return sleutel;
}

function repoVan(hoofdstukken: readonly HoofdstukData[], { hoofdstuk, vers }: Vers): VersInhoud {
	const gevonden = hoofdstukken.find((kandidaat) => kandidaat.nummer === hoofdstuk);
	const inhoud = gevonden === undefined ? null : knipVers(gevonden.vereenvoudigd, vers);
	if (inhoud === null) throw new Error(`De galerij verwacht vers ${hoofdstuk}:${vers} in de gegevens.`);
	return inhoud;
}

/**
 * Opslag in het geheugen met de bewerkingen die de galerij nodig heeft: een gewijzigd vers,
 * een verouderde bewerking en een bewerking die opmaak uit de bron mist.
 * Bewaren in het hoofdstuk van `VERZEN.opslagVol` mislukt, zoals bij een volle browseropslag.
 */
export function maakVoorbeeldopslag(boek: string, hoofdstukken: readonly HoofdstukData[]): Geheugenopslag {
	const opslag = maakGeheugenopslag(new Set([sleutelVan(boek, VERZEN.opslagVol.hoofdstuk)]));

	const gewijzigd = repoVan(hoofdstukken, VERZEN.gewijzigd);
	const nieuweTekst = vervangTekst(gewijzigd, 'synagogen van Galilea', 'gebedshuizen in Galilea');
	bewaarVers(opslag, boek, VERZEN.gewijzigd.hoofdstuk, VERZEN.gewijzigd.vers, nieuweTekst, gewijzigd);

	const verouderd = repoVan(hoofdstukken, VERZEN.verouderd);
	const oudeRepo = vervangTekst(verouderd, 'hun synagogen', 'hun gebedshuizen');
	const bewerkt = vervangTekst(oudeRepo, 'allen geprezen', 'iedereen geprezen');
	bewaarVers(opslag, boek, VERZEN.verouderd.hoofdstuk, VERZEN.verouderd.vers, bewerkt, oudeRepo);

	const metOpmaak = repoVan(hoofdstukken, VERZEN.editorMetWaarschuwing);
	const opmaakWeg = zonderOpmaak(metOpmaak, ['zonde', 'genade']);
	bewaarVers(opslag, boek, VERZEN.editorMetWaarschuwing.hoofdstuk, VERZEN.editorMetWaarschuwing.vers, opmaakWeg, metOpmaak);

	return opslag;
}
