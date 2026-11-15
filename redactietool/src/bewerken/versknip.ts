import type { Alinea, Hoofdstuk, Inlinestuk, Tekstalinea, Tekststuk } from '../formaat/types';
import type { VersAlineadeel, VersInhoud } from './types';

/** Waar een deel van een vers staat: in alinea `alinea`, de stukken `van` tot (niet inbegrepen) `tot`. */
type Plek = {
	alinea: number;
	van: number;
	tot: number;
};

/**
 * Zoekt per tekstalinea het stuk na het versnummer tot het volgende versnummer of het einde van de alinea.
 * Een vers loopt door over volgende alinea's tot het volgende versnummer; titels en lege regels horen er niet bij.
 */
function zoekPlekken(hoofdstuk: Hoofdstuk, nummer: number): Plek[] {
	const plekken: Plek[] = [];
	let huidigVers: number | null = null;
	hoofdstuk.alineas.forEach((alinea, index) => {
		if (alinea.soort !== 'tekst') return;
		let van = 0;
		let metVersnummer = false;
		const sluitAf = (tot: number) => {
			// Een alinea die met een versnummer begint, heeft niets van het vorige vers.
			const heeftInhoud = metVersnummer || tot > van;
			if (huidigVers === nummer && heeftInhoud) plekken.push({ alinea: index, van, tot });
		};
		alinea.stukken.forEach((stuk, plek) => {
			if (stuk.soort !== 'vers') return;
			sluitAf(plek);
			huidigVers = stuk.nummer;
			metVersnummer = true;
			van = plek + 1;
		});
		sluitAf(alinea.stukken.length);
	});
	return plekken;
}

function tekstalinea(alinea: Alinea | undefined): Tekstalinea {
	if (alinea?.soort !== 'tekst') throw new Error('Interne fout: de plek van het vers is geen tekstalinea.');
	return alinea;
}

function alleenTekst(stukken: readonly Inlinestuk[]): Tekststuk[] {
	return stukken.filter((stuk): stuk is Tekststuk => stuk.soort === 'tekst');
}

/** Knipt de inhoud van een vers uit het hoofdstuk, met de spaties zoals ze in het bestand staan; `null` als het vers niet voorkomt. */
export function knipVers(hoofdstuk: Hoofdstuk, nummer: number): VersInhoud | null {
	const plekken = zoekPlekken(hoofdstuk, nummer);
	if (plekken.length === 0) return null;
	const delen = plekken.map((plek): VersAlineadeel => {
		const alinea = tekstalinea(hoofdstuk.alineas[plek.alinea]);
		return { stijl: alinea.stijl, stukken: alleenTekst(alinea.stukken.slice(plek.van, plek.tot)) };
	});
	return { delen };
}

/**
 * Voegt naast elkaar liggende stukken met gelijke opmaak samen en laat lege stukken weg,
 * zodat de serializer en de parser dezelfde stukken zien.
 */
function samenvoegen(stukken: readonly Tekststuk[]): Tekststuk[] {
	const resultaat: Tekststuk[] = [];
	for (const stuk of stukken) {
		if (stuk.tekst.includes('\n')) throw new Error('Een vers kan geen regeleinde bevatten: alineagrenzen horen bij de repo.');
		if (stuk.tekst === '') continue;
		const vorige = resultaat.at(-1);
		if (vorige !== undefined && vorige.opmaak.length === stuk.opmaak.length && vorige.opmaak.every((opmaak, plek) => opmaak === stuk.opmaak[plek])) {
			resultaat[resultaat.length - 1] = { ...vorige, tekst: vorige.tekst + stuk.tekst };
		} else {
			resultaat.push({ ...stuk });
		}
	}
	return resultaat;
}

/**
 * Zet nieuwe inhoud op de plek van een vers; alles buiten dat vers blijft precies gelijk.
 * De nieuwe inhoud moet evenveel delen hebben als het vers in het hoofdstuk. De stijl van elke alinea blijft zoals hij was.
 */
export function vervangVers(hoofdstuk: Hoofdstuk, nummer: number, inhoud: VersInhoud): Hoofdstuk {
	const plekken = zoekPlekken(hoofdstuk, nummer);
	if (plekken.length === 0) throw new Error(`Vers ${nummer} komt niet voor in dit hoofdstuk.`);
	if (plekken.length !== inhoud.delen.length) {
		throw new Error(
			`Vers ${nummer} heeft ${plekken.length} ${plekken.length === 1 ? 'deel' : 'delen'} in het hoofdstuk, maar de nieuwe inhoud heeft er ${inhoud.delen.length}. Alinea's splitsen of samenvoegen kan hier niet.`,
		);
	}
	const alineas = [...hoofdstuk.alineas];
	// Van achter naar voren, zodat een eerdere plek in dezelfde alinea niet verschuift.
	for (let nummerDeel = plekken.length - 1; nummerDeel >= 0; nummerDeel--) {
		const plek = plekken[nummerDeel];
		const deel = inhoud.delen[nummerDeel];
		if (plek === undefined || deel === undefined) throw new Error('Interne fout: deel ontbreekt.');
		const alinea = tekstalinea(alineas[plek.alinea]);
		alineas[plek.alinea] = {
			...alinea,
			stukken: [...alinea.stukken.slice(0, plek.van), ...samenvoegen(deel.stukken), ...alinea.stukken.slice(plek.tot)],
		};
	}
	return { alineas };
}
