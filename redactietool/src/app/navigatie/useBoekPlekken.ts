import type { BoekData, Referentie } from '../../data/types';
import { boekPlekken, type BoekPlek } from './boekplekken';

/** Het hoofdstuk dat per boek het laatst open stond. Het scherm Keuzes en vragen is een andere pagina dan een hoofdstuk, dus de stand moet de wissel van pagina overleven. */
const laatsteHoofdstukPerBoek = new Map<string, number>();

/** De plekken in het boek met hun aantallen. */
export function useBoekPlekken(boek: BoekData, referentie: Referentie, huidigHoofdstuk: number | null): BoekPlek[] {
	if (huidigHoofdstuk !== null) laatsteHoofdstukPerBoek.set(boek.id, huidigHoofdstuk);
	return boekPlekken(boek.id, referentie, laatsteHoofdstukPerBoek.get(boek.id) ?? 1);
}
