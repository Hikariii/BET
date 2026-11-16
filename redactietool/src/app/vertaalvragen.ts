import type { OpenVraag } from '../data/types';

const STATUS_OPEN = 'open';

export function isOpen(vraag: OpenVraag): boolean {
	return vraag.status.trim().toLowerCase() === STATUS_OPEN;
}

/** De open vragen van het register, boekbreed: dezelfde telling als de groep Open vragen op het tabblad Vertaalvragen (een opmerking uit een log telt niet mee). */
export function aantalOpenVragenInBoek(vragen: readonly OpenVraag[]): number {
	return vragen.filter(isOpen).length;
}

/** Alle vragen, ook de besloten, die aan dit vers hangen. */
export function vragenBijVers(vragen: readonly OpenVraag[], hoofdstuk: number, vers: number): OpenVraag[] {
	return vragen.filter((vraag) => vraag.verzen.some((ref) => ref.hoofdstuk === hoofdstuk && ref.vers === vers));
}

/** Een vraag met verzen in meer dan één vers van het hoofdstuk telt één keer. */
export function aantalOpenVragen(vragen: readonly OpenVraag[], hoofdstuk: number): number {
	return vragen.filter((vraag) => isOpen(vraag) && vraag.verzen.some((ref) => ref.hoofdstuk === hoofdstuk)).length;
}
