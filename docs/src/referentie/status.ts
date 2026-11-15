import type { HoofdstukInfo, Status } from '../data/types';
import { kolomplaats, leesTabellen, ReferentieFout } from './tabel';

/** De statussen zoals ze in STATUS.md staan; `-` is een hoofdstuk dat nog niet begonnen is. */
const STATUS_IN_BESTAND: Readonly<Record<string, Status>> = {
	'-': 'nog niet begonnen',
	concept: 'concept',
	review: 'review',
	'bij editor': 'bij editor',
	verwerkt: 'verwerkt',
	goedgekeurd: 'goedgekeurd',
};
const HOOFDSTUKNUMMER = /^\S+ (\d+)$/;

/** Leest de tabel uit bijbel/<boek>/STATUS.md. Een onbekende status of een hoofdstuknaam zonder nummer geeft een ReferentieFout met het regelnummer. */
export function leesStatus(tekst: string): HoofdstukInfo[] {
	const tabel = leesTabellen(tekst)[0];
	if (tabel === undefined) throw new ReferentieFout(1, 'geen tabel gevonden');
	const hoofdstuk = kolomplaats(tabel, 'Hoofdstuk');
	const status = kolomplaats(tabel, 'Status');
	const versie = kolomplaats(tabel, 'Versie');
	const herkomst = kolomplaats(tabel, 'Herkomst');
	const opmerking = kolomplaats(tabel, 'Opmerking');

	return tabel.regels.map(({ regelnummer, cellen }) => {
		const hoofdstuknaam = cellen[hoofdstuk] ?? '';
		const nummer = HOOFDSTUKNUMMER.exec(hoofdstuknaam)?.[1];
		if (nummer === undefined) throw new ReferentieFout(regelnummer, `hoofdstuk '${hoofdstuknaam}' heeft geen nummer (verwacht: 'Lukas 4')`);

		const statustekst = cellen[status] ?? '';
		const gelezenStatus = Object.hasOwn(STATUS_IN_BESTAND, statustekst) ? STATUS_IN_BESTAND[statustekst] : undefined;
		if (gelezenStatus === undefined) throw new ReferentieFout(regelnummer, `onbekende status '${statustekst}'`);

		return {
			nummer: Number(nummer),
			status: gelezenStatus,
			versie: cellen[versie] ?? '',
			herkomst: cellen[herkomst] ?? '',
			opmerking: cellen[opmerking] ?? '',
		};
	});
}
