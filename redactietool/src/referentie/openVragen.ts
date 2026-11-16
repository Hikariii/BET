import type { OpenVraag, VersRef } from '../data/types';
import { kolomplaats, leesTabellen, ReferentieFout } from './tabel';

const VERZEN_KOLOM = 'Verzen';
const NUMMERVORM = /^V[1-9]\d*$/;
const VERSAANDUIDING = /^(\d+):(\d+)(?:-(\d+))?$/;

/** Leest de eerste tabel uit referentie/open-vragen.md. Een ontbrekende kolom Nr of een leeg, dubbel of ongeldig nummer is een fout. Ontbreekt de kolom Verzen, dan heeft elke vraag geen verzen. */
export function leesOpenVragen(tekst: string): OpenVraag[] {
	const tabel = leesTabellen(tekst)[0];
	if (tabel === undefined) throw new ReferentieFout(1, 'geen tabel gevonden');
	const nr = kolomplaats(tabel, 'Nr');
	const plaats = kolomplaats(tabel, 'Plaats');
	const kwestie = kolomplaats(tabel, 'Begrip / kwestie');
	const gekozen = kolomplaats(tabel, 'Gekozen in tekst');
	const alternatief = kolomplaats(tabel, 'Alternatief');
	const status = kolomplaats(tabel, 'Status');
	const besluit = kolomplaats(tabel, 'Besluit');
	const verzen = tabel.kop.indexOf(VERZEN_KOLOM);

	const gezien = new Set<string>();
	return tabel.regels.map(({ regelnummer, cellen }) => ({
		nr: leesNummer(cellen[nr] ?? '', regelnummer, gezien),
		plaats: cellen[plaats] ?? '',
		kwestie: cellen[kwestie] ?? '',
		gekozen: cellen[gekozen] ?? '',
		alternatief: cellen[alternatief] ?? '',
		status: cellen[status] ?? '',
		besluit: cellen[besluit] ?? '',
		verzen: verzen === -1 ? [] : leesVerzen(cellen[verzen] ?? '', regelnummer),
	}));
}

/** Een nummer is `V` met een getal, zonder voorloopnul, en komt in de tabel één keer voor. */
function leesNummer(cel: string, regelnummer: number, gezien: Set<string>): string {
	if (cel === '') throw new ReferentieFout(regelnummer, 'de kolom Nr is leeg');
	if (!NUMMERVORM.test(cel)) throw new ReferentieFout(regelnummer, `ongeldig nummer '${cel}' in de kolom Nr (verwacht: 'V12')`);
	if (gezien.has(cel)) throw new ReferentieFout(regelnummer, `nummer '${cel}' komt al eerder voor in de kolom Nr`);
	gezien.add(cel);
	return cel;
}

/** Zet `1:45, 6:20-22` om in losse verzen; een bereik loopt binnen één hoofdstuk. */
function leesVerzen(cel: string, regelnummer: number): VersRef[] {
	if (cel === '') return [];
	return cel.split(',').flatMap((deel) => {
		const aanduiding = deel.trim();
		const gevonden = VERSAANDUIDING.exec(aanduiding);
		if (gevonden === null) {
			throw new ReferentieFout(regelnummer, `ongeldige versaanduiding '${aanduiding}' in de kolom ${VERZEN_KOLOM} (verwacht: '1:45' of '6:20-22')`);
		}
		const hoofdstuk = Number(gevonden[1]);
		const eerste = Number(gevonden[2]);
		const laatste = gevonden[3] === undefined ? eerste : Number(gevonden[3]);
		if (eerste < 1 || laatste < eerste) {
			throw new ReferentieFout(regelnummer, `ongeldig bereik '${aanduiding}' in de kolom ${VERZEN_KOLOM}`);
		}
		return Array.from({ length: laatste - eerste + 1 }, (_, afstand) => ({ hoofdstuk, vers: eerste + afstand }));
	});
}
