import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const HOOFDMAP = path.resolve(import.meta.dirname, '../../..');
const BOEK = 'lukas';
const MAP = 'wijzigingslog';
/** `lukas-01.md`, maar niet `lukas-04-controle.md`. */
const WIJZIGINGSLOG = /^[a-z]+-\d{2}\.md$/;

export type Wijzigingslog = {
	/** Zoals het Python-script het noemt, bv. `wijzigingslog/lukas-01.md`. */
	naam: string;
	tekst: string;
};

export function leesWijzigingslogs(): Wijzigingslog[] {
	const mappad = path.join(HOOFDMAP, 'bijbel', BOEK, MAP);
	return readdirSync(mappad)
		.filter((bestandsnaam) => WIJZIGINGSLOG.test(bestandsnaam))
		.sort()
		.map((bestandsnaam) => ({
			naam: `${MAP}/${bestandsnaam}`,
			tekst: readFileSync(path.join(mappad, bestandsnaam), 'utf-8'),
		}));
}

export type PythonLogVers = {
	wijz: string[];
	vraag: string[];
	label: string;
	/** Alleen bij een vers dat in een reeks niet het eerste is. */
	zie?: string;
};

export type PythonLog = {
	verzen: Record<string, PythonLogVers>;
	algemene_vragen: string[];
};

/** Draait `scripts/log_naar_json.py`: de uitvoer van `parse_log` voor elk hoofdstuk. */
export function leesPythonUitvoer(): Record<string, PythonLog> {
	const uitvoer = execFileSync('python3', ['-I', path.join(HOOFDMAP, 'scripts/log_naar_json.py'), '--boek', BOEK], {
		cwd: HOOFDMAP,
		encoding: 'utf-8',
		maxBuffer: 256 * 1024 * 1024,
	});
	return (JSON.parse(uitvoer) as { bestanden: Record<string, PythonLog> }).bestanden;
}
