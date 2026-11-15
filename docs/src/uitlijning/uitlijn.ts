import { isFunctiewoord } from './functiewoorden';
import type { Hoofdstuk } from '../formaat/types';
import { tekstPerVers } from './versTekst';
import { woordenVan, type Token } from './woorden';

/**
 * Een stuk van de woorduitlijning van één vers. Alleen woorden doen mee; leestekens en hoofdletters tellen niet.
 * `gelijk`: dezelfde woorden aan beide kanten. `vervangen`: aaneengesloten stukken tussen twee gelijke ankers.
 * `weggevallen`: alleen in de bron (`nieuw` is leeg). `toegevoegd`: alleen in de vereenvoudiging (`bron` is leeg).
 */
export type Uitlijningsdeel = {
	soort: 'gelijk' | 'vervangen' | 'weggevallen' | 'toegevoegd';
	bron: readonly Token[];
	nieuw: readonly Token[];
};

export type VersUitlijning = {
	vers: number;
	delen: readonly Uitlijningsdeel[];
};

const GEWICHT_INHOUDSWOORD = 5;
const GEWICHT_FUNCTIEWOORD = 1;

function gewicht(woord: Token): number {
	return isFunctiewoord(woord.vergelijkvorm) ? GEWICHT_FUNCTIEWOORD : GEWICHT_INHOUDSWOORD;
}

type Overeenkomst = (bronWoord: Token, nieuwWoord: Token) => boolean;

/** Indexparen van overeenkomende woorden, de reeks met het hoogste totaalgewicht (inhoudswoorden wegen zwaarder dan functiewoorden). */
function overeenkomendeWoorden(bron: readonly Token[], nieuw: readonly Token[], komtOvereen: Overeenkomst): [number, number][] {
	const breedte = nieuw.length + 1;
	const score = new Int32Array((bron.length + 1) * breedte);
	const scoreOp = (i: number, j: number) => score[i * breedte + j] ?? 0;
	const matchOp = (i: number, j: number): number | null => {
		const bronWoord = bron[i];
		const nieuwWoord = nieuw[j];
		if (bronWoord === undefined || nieuwWoord === undefined || !komtOvereen(bronWoord, nieuwWoord)) return null;
		return scoreOp(i + 1, j + 1) + gewicht(bronWoord);
	};

	for (let i = bron.length - 1; i >= 0; i--) {
		for (let j = nieuw.length - 1; j >= 0; j--) {
			score[i * breedte + j] = Math.max(scoreOp(i + 1, j), scoreOp(i, j + 1), matchOp(i, j) ?? 0);
		}
	}

	const paren: [number, number][] = [];
	let i = 0;
	let j = 0;
	while (i < bron.length && j < nieuw.length) {
		if (matchOp(i, j) === scoreOp(i, j)) {
			paren.push([i, j]);
			i++;
			j++;
		} else if (scoreOp(i + 1, j) === scoreOp(i, j)) {
			i++;
		} else {
			j++;
		}
	}
	return paren;
}

function deelVan(soort: Uitlijningsdeel['soort'], bron: readonly Token[], nieuw: readonly Token[]): Uitlijningsdeel {
	return { soort, bron, nieuw };
}

function wisseling(bron: readonly Token[], nieuw: readonly Token[]): Uitlijningsdeel | null {
	if (bron.length === 0 && nieuw.length === 0) return null;
	if (nieuw.length === 0) return deelVan('weggevallen', bron, nieuw);
	if (bron.length === 0) return deelVan('toegevoegd', bron, nieuw);
	return deelVan('vervangen', bron, nieuw);
}

const MINIMALE_GEDEELDE_BEGINLETTERS = 4;
const MINIMAAL_GEDEELD_AANDEEL = 0.7;

/** Verschillende woorden met een lange gemeenschappelijke beginstreng, zoals "Heere" en "Heer" of "verblijd" en "verblijden". */
function isVerwant(bronWoord: Token, nieuwWoord: Token): boolean {
	const bronVorm = bronWoord.vergelijkvorm;
	const nieuweVorm = nieuwWoord.vergelijkvorm;
	if (bronVorm === nieuweVorm || isFunctiewoord(bronVorm) || isFunctiewoord(nieuweVorm)) return false;
	let gedeeld = 0;
	while (bronVorm[gedeeld] !== undefined && bronVorm[gedeeld] === nieuweVorm[gedeeld]) gedeeld++;
	return gedeeld >= MINIMALE_GEDEELDE_BEGINLETTERS && gedeeld >= MINIMAAL_GEDEELD_AANDEEL * Math.max(bronVorm.length, nieuweVorm.length);
}

function isGelijk(bronWoord: Token, nieuwWoord: Token): boolean {
	return bronWoord.vergelijkvorm === nieuwWoord.vergelijkvorm;
}

/** Verdeelt twee woordenreeksen in stukken rond de overeenkomende woorden. Opeenvolgende gelijke woorden vormen één stuk; verwante woorden elk een eigen vervanging. */
function lijnWoordenUit(bron: readonly Token[], nieuw: readonly Token[], komtOvereen: Overeenkomst, soortOvereenkomst: 'gelijk' | 'vervangen'): Uitlijningsdeel[] {
	const delen: Uitlijningsdeel[] = [];
	let bronPositie = 0;
	let nieuwPositie = 0;
	const sluitAf = (bronEinde: number, nieuwEinde: number) => {
		const deel = wisseling(bron.slice(bronPositie, bronEinde), nieuw.slice(nieuwPositie, nieuwEinde));
		if (deel !== null) delen.push(deel);
	};

	for (const [bronIndex, nieuwIndex] of overeenkomendeWoorden(bron, nieuw, komtOvereen)) {
		sluitAf(bronIndex, nieuwIndex);
		const bronWoord = bron[bronIndex];
		const nieuwWoord = nieuw[nieuwIndex];
		if (bronWoord === undefined || nieuwWoord === undefined) continue;
		const vorige = delen.at(-1);
		if (soortOvereenkomst === 'gelijk' && vorige?.soort === 'gelijk' && bronIndex === bronPositie && nieuwIndex === nieuwPositie) {
			delen[delen.length - 1] = deelVan('gelijk', [...vorige.bron, bronWoord], [...vorige.nieuw, nieuwWoord]);
		} else {
			delen.push(deelVan(soortOvereenkomst, [bronWoord], [nieuwWoord]));
		}
		bronPositie = bronIndex + 1;
		nieuwPositie = nieuwIndex + 1;
	}
	sluitAf(bron.length, nieuw.length);
	return delen;
}

/** Woorduitlijning van de bron- en de vereenvoudigde tekst van één vers. */
export function lijnVersUit(bronTekst: string, nieuweTekst: string): Uitlijningsdeel[] {
	const gelijkOfVervangen = lijnWoordenUit(woordenVan(bronTekst), woordenVan(nieuweTekst), isGelijk, 'gelijk');
	return gelijkOfVervangen.flatMap((deel) =>
		deel.soort === 'vervangen' && deel.bron.length + deel.nieuw.length > 2 ? lijnWoordenUit(deel.bron, deel.nieuw, isVerwant, 'vervangen') : [deel],
	);
}

/** Woorduitlijning per vers van een hoofdstuk, op volgorde van versnummer. Een vers dat aan één kant ontbreekt, valt aan die kant helemaal weg of komt erbij. */
export function lijnHoofdstukUit(bron: Hoofdstuk, vereenvoudigd: Hoofdstuk): VersUitlijning[] {
	const bronPerVers = tekstPerVers(bron);
	const nieuwPerVers = tekstPerVers(vereenvoudigd);
	const nummers = [...new Set([...bronPerVers.keys(), ...nieuwPerVers.keys()])].sort((a, b) => a - b);
	return nummers.map((vers) => ({
		vers,
		delen: lijnVersUit(bronPerVers.get(vers) ?? '', nieuwPerVers.get(vers) ?? ''),
	}));
}
