import type { Hoofdstuk } from '../formaat/types';

/** De platte tekst per versnummer, zonder opmaak. Een alinea zonder versnummer aan het begin hoort bij het vers waar de vorige alinea mee eindigde; alinea's van één vers worden met een spatie samengevoegd. */
export function tekstPerVers(hoofdstuk: Hoofdstuk): Map<number, string> {
	const tekstPerNummer = new Map<number, string>();
	let huidigVers: number | null = null;
	for (const alinea of hoofdstuk.alineas) {
		if (alinea.soort !== 'tekst') continue;
		let beginVanAlinea = true;		for (const stuk of alinea.stukken) {
			if (stuk.soort === 'vers') {
				huidigVers = stuk.nummer;
			} else if (huidigVers !== null) {
				const eerder = tekstPerNummer.get(huidigVers) ?? '';
				const scheiding = beginVanAlinea && eerder !== '' ? ' ' : '';
				tekstPerNummer.set(huidigVers, eerder + scheiding + stuk.tekst);
				beginVanAlinea = false;
			}
		}
	}
	return tekstPerNummer;
}
