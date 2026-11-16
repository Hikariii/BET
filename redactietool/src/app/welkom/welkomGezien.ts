import type { Opslag } from '../../bewerken/tussenstand';

const SLEUTEL = 'bet-welkom-gezien';

/** Of de gebruiker "Niet meer tonen" bij het welkom gekozen heeft. */
export function isWelkomGezien(opslag: Opslag): boolean {
	try {
		return opslag.getItem(SLEUTEL) !== null;
	} catch {
		return false;
	}
}

/** Onthoudt dat het welkom niet meer getoond hoeft te worden; een weigerende opslag (privémodus, vol) laat het welkom bij het volgende bezoek terugkomen. */
export function bewaarWelkomGezien(opslag: Opslag): void {
	try {
		opslag.setItem(SLEUTEL, 'ja');
	} catch {
		return;
	}
}
