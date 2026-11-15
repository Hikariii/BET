import type { HoofdstukData, Precedent, VersRef } from '../data/types';
import { tekstPerVers } from '../uitlijning/versTekst';
import { leesBronVormen, leesDoelVormen, leesPlaatsVerzen } from './precedentVormen';
import { komtEenVanVoor, maakZoekvorm, zoekWoorden, type Zoekvorm } from './precedentZoek';
import type { PrecedentTelling } from './types';

/** Hoeveel andere woorden tussen de woorden van een bronvorm van drie woorden of meer mogen staan ("God niet vrezen" in "God niet te vrezen"). */
const TUSSENWOORDEN_BRONVORM = 1;
/** Eén woord ruimte voor "op de proef te stellen" bij "op de proef stellen". */
const TUSSENWOORDEN_DOELVORM = 1;

/** De uitkomst van `telPrecedenten`: het contracttype met wat de scherm nodig heeft om de aantallen goed te duiden. */
export type GetelPrecedent = PrecedentTelling & {
	/** Waar de vereenvoudigde vorm de bronvorm is: `toegepast` telt dan de verzen waar die vorm in bron en vereenvoudiging staat, en `nietToegepast` is leeg. */
	blijft: boolean;
	/** Bij een telbaar precedent: waarom de telling onzeker is (haakjes genegeerd, Plaats niet teruggevonden). */
	opmerkingen: string[];
};

type Vers = {
	ref: VersRef;
	bron: string[];
	vereenvoudigd: string[];
};

function leesVerzen(hoofdstukken: readonly HoofdstukData[]): Vers[] {
	return hoofdstukken.flatMap((hoofdstuk) => {
		const bron = tekstPerVers(hoofdstuk.bron);
		const vereenvoudigd = tekstPerVers(hoofdstuk.vereenvoudigd);
		return [...bron].map(([vers, tekst]) => ({
			ref: { hoofdstuk: hoofdstuk.nummer, vers },
			bron: zoekWoorden(tekst),
			vereenvoudigd: zoekWoorden(vereenvoudigd.get(vers) ?? ''),
		}));
	});
}

function sleutel({ hoofdstuk, vers }: VersRef): string {
	return `${hoofdstuk}:${vers}`;
}

function nietTelbaar(precedent: Precedent, reden: string): GetelPrecedent {
	return { precedent, telbaar: false, reden, toegepast: [], nietToegepast: [], blijft: false, opmerkingen: [] };
}

function telPrecedent(precedent: Precedent, verzen: readonly Vers[], verzenOpSleutel: ReadonlyMap<string, Vers>): GetelPrecedent {
	const bronVormen = leesBronVormen(precedent.bron);
	if (bronVormen.soort === 'niet telbaar') return nietTelbaar(precedent, bronVormen.reden);
	const doelVormen = leesDoelVormen(precedent.vereenvoudigd);
	if (doelVormen.soort === 'niet telbaar') return nietTelbaar(precedent, doelVormen.reden);

	const bronZoekvormen = bronVormen.vormen.map((vorm) => maakZoekvorm(vorm, TUSSENWOORDEN_BRONVORM));
	const inBron = verzen.filter((vers) => komtEenVanVoor(vers.bron, bronZoekvormen));
	const uitPlaats = leesPlaatsVerzen(precedent.plaats).flatMap((ref) => verzenOpSleutel.get(sleutel(ref)) ?? []);
	if (inBron.length === 0 && uitPlaats.length === 0) {
		return nietTelbaar(precedent, 'de bronvorm komt in de bron niet voor en Plaats noemt geen verzen');
	}
	const plekken = [...new Set([...inBron, ...uitPlaats])].sort((een, ander) => een.ref.hoofdstuk - ander.ref.hoofdstuk || een.ref.vers - ander.ref.vers);

	const opmerkingen: string[] = [];
	if (bronVormen.haakjesGenegeerd) opmerkingen.push('de haakjes in de kolom Bron zijn niet gebruikt bij het zoeken');
	if (inBron.length === 0) opmerkingen.push('de bronvorm is in de bron niet teruggevonden: geteld vanuit Plaats');
	else {
		const nietGevonden = uitPlaats.filter((vers) => !inBron.includes(vers)).length;
		if (nietGevonden > 0) opmerkingen.push(`${nietGevonden} van de ${uitPlaats.length} verzen uit Plaats: bronvorm niet teruggevonden in de bron`);
	}

	const staatNogOud = (vers: Vers) => komtEenVanVoor(vers.vereenvoudigd, bronZoekvormen);
	const doelZoekvormen: Zoekvorm[] =
		doelVormen.soort === 'vormen' ? doelVormen.vormen.map((vorm) => maakZoekvorm(vorm, TUSSENWOORDEN_DOELVORM)) : [];
	// Bevat de vereenvoudigde vorm de bronvorm zelf ("huichelaars" bij "huichelaar(s)", "bezeten man" bij "bezetene"), dan blijft de bronvorm staan.
	const blijft =
		doelVormen.soort === 'blijft' || doelVormen.vormen.some((doel) => komtEenVanVoor(doel, bronZoekvormen));
	if (blijft) {
		return { precedent, telbaar: true, reden: null, toegepast: plekken.filter(staatNogOud).map((vers) => vers.ref), nietToegepast: [], blijft, opmerkingen };
	}
	return {
		precedent,
		telbaar: true,
		reden: null,
		toegepast: plekken.filter((vers) => !staatNogOud(vers) && komtEenVanVoor(vers.vereenvoudigd, doelZoekvormen)).map((vers) => vers.ref),
		nietToegepast: plekken.filter(staatNogOud).map((vers) => vers.ref),
		blijft,
		opmerkingen,
	};
}

/**
 * Telt per precedent de verzen waar het is toegepast en waar de bronvorm nog staat.
 * Plekken van een precedent zijn de verzen waar de bronvorm in de bron staat plus de verzen uit de kolom Plaats.
 * Toegepast: de vereenvoudigde vorm staat in het vers en de bronvorm niet.
 * Niet toegepast: de bronvorm staat nog in de vereenvoudiging.
 * Een precedent waarvan Bron of Vereenvoudigd geen vorm is die te zoeken is, is niet telbaar, met een reden.
 */
export function telPrecedenten(precedenten: readonly Precedent[], hoofdstukken: readonly HoofdstukData[]): GetelPrecedent[] {
	const verzen = leesVerzen(hoofdstukken);
	const verzenOpSleutel = new Map(verzen.map((vers) => [sleutel(vers.ref), vers]));
	return precedenten.map((precedent) => telPrecedent(precedent, verzen, verzenOpSleutel));
}
