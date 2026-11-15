import { describe, expect, it } from 'vitest';
import type { Log } from '../data/types';
import { leesLog } from './leesLog';
import { leesPythonUitvoer, leesWijzigingslogs, type PythonLog, type PythonLogVers } from './wijzigingslogs.testhulp';

const logs = leesWijzigingslogs();
const python = leesPythonUitvoer();

/**
 * Zet een log in de vorm van `parse_log`: per versnummer één item, het eerste vers van een reeks
 * draagt de regels, en een later vers met hetzelfde nummer overschrijft een eerder.
 */
function inPythonVorm(log: Log): PythonLog {
	const verzen: Record<string, PythonLogVers> = {};
	for (const sectie of log.verzen) {
		const [eerste, laatste] = [sectie.verzen[0], sectie.verzen[sectie.verzen.length - 1]];
		sectie.verzen.forEach((vers, index) => {
			verzen[String(vers)] =
				index === 0
					? {
							wijz: sectie.wijzigingen.map((regel) => regel.tekst),
							vraag: sectie.vragen,
							label: sectie.verzen.length > 1 ? `vers ${eerste}–${laatste}` : '',
						}
					: { wijz: [], vraag: [], label: '', zie: `zie bij vers ${eerste}` };
		});
	}
	return { verzen, algemene_vragen: log.algemeneVragen };
}

function verschillen(naam: string, verwacht: PythonLog, eigen: PythonLog): string[] {
	const gevonden: string[] = [];
	const versnummers = new Set([...Object.keys(verwacht.verzen), ...Object.keys(eigen.verzen)]);
	for (const vers of [...versnummers].sort((a, b) => Number(a) - Number(b))) {
		const plek = `${naam} vers ${vers}`;
		const python = verwacht.verzen[vers];
		const ts = eigen.verzen[vers];
		if (python === undefined || ts === undefined) {
			gevonden.push(`${plek}: ontbreekt aan de ${python === undefined ? 'Python' : 'TypeScript'}-kant`);
			continue;
		}
		for (const veld of ['wijz', 'vraag', 'label', 'zie'] as const) {
			if (JSON.stringify(python[veld]) !== JSON.stringify(ts[veld])) {
				gevonden.push(`${plek}: ${veld} Python=${JSON.stringify(python[veld])} TypeScript=${JSON.stringify(ts[veld])}`);
			}
		}
	}
	if (JSON.stringify(verwacht.algemene_vragen) !== JSON.stringify(eigen.algemene_vragen)) {
		gevonden.push(`${naam} algemene vragen: Python=${JSON.stringify(verwacht.algemene_vragen)} TypeScript=${JSON.stringify(eigen.algemene_vragen)}`);
	}
	return gevonden;
}

describe('pariteit met parse_log in scripts/md_naar_docx.py', () => {
	it('Python en TypeScript lezen dezelfde 24 logs', () => {
		expect(logs).toHaveLength(24);
		expect(Object.keys(python).sort()).toEqual(logs.map((log) => log.naam));
	});

	it('de logs bevatten wijzigingen, vragen en algemene vragen om te vergelijken', () => {
		const alleVerzen = Object.values(python).flatMap((log) => Object.values(log.verzen));
		expect(alleVerzen.filter((vers) => vers.wijz.length > 0).length).toBeGreaterThan(500);
		expect(alleVerzen.filter((vers) => vers.vraag.length > 0).length).toBeGreaterThan(50);
		expect(Object.values(python).every((log) => log.algemene_vragen.length > 0)).toBe(true);
	});

	describe.each(logs)('$naam', ({ naam, tekst }) => {
		it('geeft dezelfde wijzigingen, vragen en verzen per sectie als Python', () => {
			const verwacht = python[naam];
			expect(verwacht).toBeDefined();
			if (verwacht === undefined) return;
			expect(verschillen(naam, verwacht, inPythonVorm(leesLog(tekst)))).toEqual([]);
		});
	});
});
