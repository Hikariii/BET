import { hoofdstukJsonNaam } from '../data/bestandsnamen';
import type { BoekData, BoekLijst, HoofdstukData, Referentie, RichtlijnSectie } from '../data/types';

const DATAMAP = `${import.meta.env.BASE_URL}data`;

/** De JSON komt uit het bouwscript van deze repo en heeft de vorm uit `data/types.ts`. */
async function laadJson<Vorm>(pad: string): Promise<Vorm> {
	const antwoord = await fetch(`${DATAMAP}/${pad}`);
	if (!antwoord.ok) {
		throw new Error(`${pad}: ${antwoord.status} ${antwoord.statusText}`);
	}
	return (await antwoord.json()) as Vorm;
}

export function laadBoeken(): Promise<BoekLijst> {
	return laadJson('boeken.json');
}

export function laadBoek(boekId: string): Promise<BoekData> {
	return laadJson(`${boekId}/boek.json`);
}

export function laadReferentie(boekId: string): Promise<Referentie> {
	return laadJson(`${boekId}/referentie.json`);
}

export function laadHoofdstuk(boekId: string, nummer: number): Promise<HoofdstukData> {
	return laadJson(`${boekId}/${hoofdstukJsonNaam(nummer)}`);
}

export function laadRichtlijn(): Promise<RichtlijnSectie[]> {
	return laadJson('richtlijn.json');
}
