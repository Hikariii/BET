import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const HOOFDMAP = path.resolve(import.meta.dirname, '../../..');
const BOEK = 'lukas';
const MAPPEN = ['bron', 'vereenvoudigd'] as const;

export type Bijbelbestand = {
	/** Zoals het Python-script het noemt, bv. `bron/lukas-01.md`. */
	naam: string;
	tekst: string;
};

export function leesBijbelbestanden(): Bijbelbestand[] {
	return MAPPEN.flatMap((map) => {
		const mappad = path.join(HOOFDMAP, 'bijbel', BOEK, map);
		return readdirSync(mappad)
			.filter((bestandsnaam) => bestandsnaam.endsWith('.md'))
			.sort()
			.map((bestandsnaam) => ({
				naam: `${map}/${bestandsnaam}`,
				tekst: readFileSync(path.join(mappad, bestandsnaam), 'utf-8'),
			}));
	});
}

/** Beschrijft de eerste regel waarop twee teksten verschillen, voor een leesbare foutmelding. */
export function eerstAfwijkendeRegel(origineel: string, terug: string): string {
	const oorspronkelijk = origineel.split('\n');
	const nieuw = terug.split('\n');
	const index = oorspronkelijk.findIndex((regel, plek) => regel !== nieuw[plek]);
	if (index === -1) return `de tekst is ${oorspronkelijk.length === nieuw.length ? 'gelijk' : 'korter of langer'}`;
	return `regel ${index + 1}:\n  oorspronkelijk: ${JSON.stringify(oorspronkelijk[index])}\n  teruggeschreven: ${JSON.stringify(nieuw[index])}`;
}

export type PythonSegment = ['tekst', string, string[]] | ['vers', number, string[]];

export type PythonAlinea = {
	soort: 'leeg' | 'tekst' | 'titel';
	stijl: string | null;
	titel: string | null;
	segs: PythonSegment[];
	regel: number;
};

export type PythonUitvoer = {
	alineastijlen: string[];
	domeinen: string[];
	directe_opmaak: string[];
	onderwijs: string;
	bestanden: Record<string, PythonAlinea[]>;
};

/** Draait `scripts/formaat_naar_json.py`: de uitvoer van `parse_md` voor elk hoofdstuk. */
export function leesPythonUitvoer(): PythonUitvoer {
	const uitvoer = execFileSync('python3', ['-I', path.join(HOOFDMAP, 'scripts/formaat_naar_json.py'), '--boek', BOEK], {
		cwd: HOOFDMAP,
		encoding: 'utf-8',
		maxBuffer: 256 * 1024 * 1024,
	});
	return JSON.parse(uitvoer) as PythonUitvoer;
}
