import { verzamelVragen } from '../../begrippen/verzamelVragen';
import { vraagSleutels } from '../../begrippen/vragenOverzicht';
import type { HoofdstukData, OpenVraag } from '../../data/types';
import { maakAdres } from '../adres';

/** Het adres van één vraag op het tabblad Vertaalvragen; de pagina opent die vraag en brengt hem in beeld. */
export function vraagAdres(boek: string, sleutel: string): string {
	return maakAdres({ soort: 'begrippen', boek, tabblad: 'vragen', vraag: sleutel });
}

/** De sleutel die `vraagSleutels` aan de vraag uit het register geeft; een kwestie komt in het register één keer voor. */
export function registerVraagSleutel(kwestie: string): string {
	return `register-${kwestie}-1`;
}

/**
 * Per vers van het hoofdstuk het adres van de eerste vertaalvraag die erbij hoort, of `null`.
 * De vragen volgen de volgorde van het tabblad Vertaalvragen: de open vragen eerst.
 * De sleutels zijn dezelfde als op dat tabblad, ook al kent deze lijst alleen de logvragen van dit hoofdstuk: een sleutel hangt alleen van het register en het eigen hoofdstuk af.
 */
export function maakVersVraagAdres(boek: string, openVragen: readonly OpenVraag[], hoofdstuk: Pick<HoofdstukData, 'nummer' | 'log'>): (vers: number) => string | null {
	const vragen = verzamelVragen(openVragen, [hoofdstuk]);
	const sleutels = vraagSleutels(vragen);
	return (vers) => {
		const vraag = vragen.find((kandidaat) => kandidaat.verzen.some((ref) => ref.hoofdstuk === hoofdstuk.nummer && ref.vers === vers));
		return vraag === undefined ? null : vraagAdres(boek, sleutels.get(vraag) ?? '');
	};
}
