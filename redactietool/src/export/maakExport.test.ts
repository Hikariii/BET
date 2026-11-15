import { describe, expect, it } from 'vitest';
import type { BewerktVers, Tussenstand, VersInhoud } from '../bewerken/types';
import type { HoofdstukData } from '../data/types';
import { parseerHoofdstuk } from '../formaat/parseer';
import { exportBestandsnaam, maakExport } from './maakExport';
import type { ExportInvoer } from './maakExport';

const BRON = `# Lukas 4
[1]Jezus keerde terug.[2] {genade}Genade{/genade} was er.
@jezus [3]Volg mij.
@jezus Kom dan.
`;

const VEREENVOUDIGD = `# Lukas 4
[1]Jezus kwam terug.[2] {genade}Genade{/genade} was er.
@jezus [3]Volg mij.
@jezus Kom dan.
`;

const HOOFDSTUK: HoofdstukData = {
	nummer: 4,
	bron: parseerHoofdstuk(BRON),
	vereenvoudigd: parseerHoofdstuk(VEREENVOUDIGD),
	log: { verzen: [], algemeneVragen: [] },
};

const NU = new Date('2026-11-15T16:00:00.000Z');

function tekst(inhoud: string, opmaak: 'genade' | null = null) {
	return { soort: 'tekst' as const, tekst: inhoud, opmaak: opmaak === null ? [] : [opmaak] };
}

const VERS_1_REPO: VersInhoud = { delen: [{ stijl: null, stukken: [tekst('Jezus kwam terug.')] }] };
const VERS_2_REPO: VersInhoud = { delen: [{ stijl: null, stukken: [tekst(' '), tekst('Genade', 'genade'), tekst(' was er.')] }] };
const VERS_3_REPO: VersInhoud = {
	delen: [
		{ stijl: 'jezus', stukken: [tekst('Volg mij.')] },
		{ stijl: 'jezus', stukken: [tekst('Kom dan.')] },
	],
};

function bewerkt(inhoud: VersInhoud, basis: VersInhoud): BewerktVers {
	return { inhoud, basis, bewaard: '2026-11-15T15:00:00.000Z' };
}

function invoer(tussenstand: Tussenstand, toelichting = ''): ExportInvoer {
	return { boek: 'lukas', hoofdstuk: HOOFDSTUK, tussenstand, repoCommit: 'abc123', toelichting, nu: NU };
}

describe('maakExport', () => {
	it('geeft zonder bewerkingen een export zonder verzen', () => {
		expect(maakExport(invoer({ verzen: {} }, 'niets te doen'))).toEqual({
			formaat: 'bet-redactie-export',
			versie: 1,
			boek: 'lukas',
			hoofdstuk: 4,
			repoCommit: 'abc123',
			gemaakt: '2026-11-15T16:00:00.000Z',
			toelichting: 'niets te doen',
			verzen: [],
			structureleKeuzes: [],
			beantwoordeVragen: [],
		});
	});

	it('zet repo en bewerkte tekst per deel als FORMAAT-regel, met waarschuwing voor weggevallen opmaak', () => {
		const vers2: VersInhoud = { delen: [{ stijl: null, stukken: [tekst(' Genade was er niet.')] }] };
		const vers3: VersInhoud = {
			delen: [
				{ stijl: 'jezus', stukken: [tekst('Volg me.')] },
				{ stijl: 'jezus', stukken: [tekst('Kom '), tekst('dan', 'genade'), tekst('.')] },
			],
		};
		const uitkomst = maakExport(
			invoer({ verzen: { 2: bewerkt(vers2, VERS_2_REPO), 3: bewerkt(vers3, VERS_3_REPO) } }, 'uitleg'),
		);

		expect(uitkomst.toelichting).toBe('uitleg');
		expect(uitkomst.verzen).toEqual([
			{
				vers: 2,
				repo: [' {genade}Genade{/genade} was er.'],
				bewerkt: [' Genade was er niet.'],
				herkomst: 'zelf getypt',
				waarschuwingen: ['De markering genade uit de bron staat niet meer in dit vers.'],
				verouderd: false,
			},
			{
				vers: 3,
				repo: ['@jezus Volg mij.', '@jezus Kom dan.'],
				bewerkt: ['@jezus Volg me.', '@jezus Kom {genade}dan{/genade}.'],
				herkomst: 'zelf getypt',
				waarschuwingen: [],
				verouderd: false,
			},
		]);
	});

	it('markeert een bewerking als verouderd als de repo sinds de bewerking veranderde', () => {
		const eerdereRepo: VersInhoud = { delen: [{ stijl: null, stukken: [tekst('Jezus ging terug.')] }] };
		const vers1: VersInhoud = { delen: [{ stijl: null, stukken: [tekst('Jezus ging heen.')] }] };

		const [vers] = maakExport(invoer({ verzen: { 1: bewerkt(vers1, eerdereRepo) } })).verzen;

		expect(vers).toEqual({
			vers: 1,
			repo: ['Jezus kwam terug.'],
			bewerkt: ['Jezus ging heen.'],
			herkomst: 'zelf getypt',
			waarschuwingen: [],
			verouderd: true,
		});
	});

	it('neemt een vers dat niet meer bestaat op met lege repo-tekst en verouderd', () => {
		const vers9: VersInhoud = { delen: [{ stijl: null, stukken: [tekst('Een nieuw vers.')] }] };

		const [vers] = maakExport(invoer({ verzen: { 9: bewerkt(vers9, vers9) } })).verzen;

		expect(vers).toEqual({
			vers: 9,
			repo: [],
			bewerkt: ['Een nieuw vers.'],
			herkomst: 'zelf getypt',
			waarschuwingen: [],
			verouderd: true,
		});
	});

	it('markeert een bewerking met een andere indeling in alinea\'s als verouderd', () => {
		const eenDeel: VersInhoud = { delen: [{ stijl: 'jezus', stukken: [tekst('Volg mij. Kom dan.')] }] };

		const [vers] = maakExport(invoer({ verzen: { 3: bewerkt(eenDeel, VERS_3_REPO) } })).verzen;

		expect(vers?.repo).toEqual(['@jezus Volg mij.', '@jezus Kom dan.']);
		expect(vers?.bewerkt).toEqual(['@jezus Volg mij. Kom dan.']);
		expect(vers?.verouderd).toBe(true);
	});

	it('geeft FORMAAT-regels die bij parseren weer dezelfde stukken en stijl geven', () => {
		const vers3: VersInhoud = {
			delen: [
				{ stijl: 'jezus', stukken: [tekst('Volg '), tekst('mij', 'genade'), tekst('.')] },
				{ stijl: null, stukken: [tekst('Kom dan, '), { soort: 'tekst', tekst: 'zegt hij', opmaak: ['cursief', 'genade'] }] },
			],
		};
		const [uitkomst] = maakExport(invoer({ verzen: { 3: bewerkt(vers3, VERS_3_REPO) } })).verzen;
		if (uitkomst === undefined) throw new Error('er hoort een vers in de export te staan');

		const teruggelezen = parseerHoofdstuk(`${uitkomst.bewerkt.join('\n')}\n`);

		expect(teruggelezen.alineas).toEqual(vers3.delen.map((deel) => ({ soort: 'tekst', stijl: deel.stijl, stukken: deel.stukken })));
	});
});

describe('exportBestandsnaam', () => {
	it('geeft twee cijfers voor het hoofdstuk', () => {
		expect(exportBestandsnaam('lukas', 4)).toBe('lukas-04.redactie.json');
		expect(exportBestandsnaam('lukas', 12)).toBe('lukas-12.redactie.json');
	});
});
