import { verzamelVragen } from '../../begrippen/verzamelVragen';
import type { HoofdstukData, OpenVraag } from '../../data/types';
import { maakAdres } from '../adres';

/** Het adres van één vraag op het tabblad Vertaalvragen, met het nummer van de vraag (`V12`, `O5.2`); de pagina opent die vraag en brengt hem in beeld. */
export function vraagAdres(boek: string, nr: string): string {
	return maakAdres({ soort: 'begrippen', boek, tabblad: 'vragen', vraag: nr });
}

/** Hoe een nummer in een label of titel heet: "Vertaalvraag V12" voor een vraag uit het register, "Opmerking O5.2" voor een opmerking van Claude. */
export function vraagNaam(nr: string): string {
	return nr.startsWith('V') ? `Vertaalvraag ${nr}` : `Opmerking ${nr}`;
}

export type VersVraag = { adres: string; nr: string };

/**
 * Per vers van het hoofdstuk de eerste vertaalvraag die erbij hoort (adres en nummer), of `null`.
 * De vragen volgen de volgorde van het tabblad Vertaalvragen: de open vragen eerst.
 * Het nummer van een opmerking hangt alleen van het eigen hoofdstuk af, dus dit hoofdstuk alleen is genoeg om dezelfde nummers te krijgen als op dat tabblad.
 */
export function maakVersVraag(boek: string, openVragen: readonly OpenVraag[], hoofdstuk: Pick<HoofdstukData, 'nummer' | 'log'>): (vers: number) => VersVraag | null {
	const vragen = verzamelVragen(openVragen, [hoofdstuk]);
	return (vers) => {
		const vraag = vragen.find((kandidaat) => kandidaat.verzen.some((ref) => ref.hoofdstuk === hoofdstuk.nummer && ref.vers === vers));
		return vraag === undefined ? null : { adres: vraagAdres(boek, vraag.nr), nr: vraag.nr };
	};
}
