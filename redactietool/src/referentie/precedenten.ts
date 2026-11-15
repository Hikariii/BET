import type { Precedent } from '../data/types';
import { kolomplaats, leesTabellen, ReferentieFout } from './tabel';

const PLAATSKOLOMMEN = ['Plaats', 'Aantal in Lk 4–24'];
const PLAATSKOLOM = 2;

/** Leest alle tabelregels uit referentie/precedenten.md; de `##`-kop boven de tabel wordt de sectie. */
export function leesPrecedenten(tekst: string): Precedent[] {
	return leesTabellen(tekst).flatMap((tabel) => {
		const bron = kolomplaats(tabel, 'Bron');
		const vereenvoudigd = kolomplaats(tabel, 'Vereenvoudigd');
		const status = kolomplaats(tabel, 'Status');
		const opmerking = kolomplaats(tabel, 'Opmerking');
		const plaatskop = tabel.kop[PLAATSKOLOM] ?? '';
		if (!PLAATSKOLOMMEN.includes(plaatskop)) {
			throw new ReferentieFout(tabel.kopregelnummer, `de derde kolom heet '${plaatskop}', verwacht: ${PLAATSKOLOMMEN.join(' of ')}`);
		}
		return tabel.regels.map(({ cellen }) => ({
			sectie: tabel.sectie,
			bron: cellen[bron] ?? '',
			vereenvoudigd: cellen[vereenvoudigd] ?? '',
			plaats: cellen[PLAATSKOLOM] ?? '',
			status: cellen[status] ?? '',
			opmerking: cellen[opmerking] ?? '',
		}));
	});
}
