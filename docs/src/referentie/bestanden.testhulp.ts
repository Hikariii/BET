import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const HOOFDMAP = path.resolve(import.meta.dirname, '../../..');
const LUKAS = path.join(HOOFDMAP, 'bijbel', 'lukas');

/** Leest een bestand uit de repo, bv. `richtlijn/redactierichtlijn.md`. */
export function leesRepobestand(relatiefPad: string): string {
	return readFileSync(path.join(HOOFDMAP, relatiefPad), 'utf-8');
}

/** De vereenvoudigde hoofdstukken van Lukas, op hoofdstuknummer: de tekst van elk vers. */
export function leesVereenvoudigdeVerzen(): Map<number, Map<number, string>> {
	const map = path.join(LUKAS, 'vereenvoudigd');
	const hoofdstukken = new Map<number, Map<number, string>>();
	for (const bestandsnaam of readdirSync(map).filter((naam) => naam.endsWith('.md'))) {
		const nummer = Number(/-(\d+)\.md$/.exec(bestandsnaam)?.[1]);
		const delen = readFileSync(path.join(map, bestandsnaam), 'utf-8').split(/\[(\d+)\]/);
		const verzen = new Map<number, string>();
		for (let plek = 1; plek < delen.length; plek += 2) {
			const vers = Number(delen[plek]);
			verzen.set(vers, (verzen.get(vers) ?? '') + (delen[plek + 1] ?? ''));
		}
		hoofdstukken.set(nummer, verzen);
	}
	return hoofdstukken;
}
