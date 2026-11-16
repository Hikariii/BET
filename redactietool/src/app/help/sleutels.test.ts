import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { BoekData } from '../../data/types';
import { boekPlekken } from '../navigatie/boekplekken';
import { alleOnderdelen } from './onderdelen';
import { helpnamen, helptekst, splitsBlokken } from './helptekst';
import { KNOPSLEUTELS } from './Voorbeeld';
import { plekSleutel } from './wijsAan';

const APP = fileURLToPath(new URL('..', import.meta.url));
const BOEK: BoekData = { id: 'lukas', naam: 'Lukas', prefix: 'lukas', hoofdstukken: [], stijlen: [] };
const NAMEN = helpnamen(BOEK);

function schermbestanden(map: string): string[] {
	return readdirSync(map, { withFileTypes: true }).flatMap((onderdeel) => {
		const pad = join(map, onderdeel.name);
		if (onderdeel.isDirectory()) return schermbestanden(pad);
		return onderdeel.name.endsWith('.tsx') ? [pad] : [];
	});
}

/** Elke `data-help="…"` in de schermen, met het bestand waar hij staat; de sleutels van de plekken in de balk komen uit `plekSleutel`. */
function sleutelsInCode(): Map<string, string> {
	const sleutels = new Map<string, string>();
	for (const bestand of schermbestanden(APP)) {
		for (const treffer of readFileSync(bestand, 'utf8').matchAll(/data-help="([a-z0-9-]+)"/g)) sleutels.set(treffer[1] ?? '', bestand);
	}
	const balk = join(APP, 'bovenbalk', 'BoekTabbladen.tsx');
	expect(readFileSync(balk, 'utf8')).toContain('data-help={plekSleutel(plek.plek)}');
	for (const plek of boekPlekken('lukas', { precedenten: [], openVragen: [] }, null, 1)) sleutels.set(plekSleutel(plek.plek), balk);
	return sleutels;
}

function sleutelsInHelp(): Map<string, Set<string>> {
	const namenPerSleutel = new Map<string, Set<string>>();
	for (const onderdeel of alleOnderdelen()) {
		for (const blok of splitsBlokken(helptekst(onderdeel), NAMEN)) {
			if (blok.soort === 'wijs') namenPerSleutel.set(blok.sleutel, (namenPerSleutel.get(blok.sleutel) ?? new Set()).add(blok.naam));
		}
	}
	return namenPerSleutel;
}

describe('data-help in de schermen en de help', () => {
	it('heeft in de code elke sleutel die de help aanwijst', () => {
		const inCode = sleutelsInCode();
		expect([...sleutelsInHelp().keys()].filter((sleutel) => !inCode.has(sleutel))).toEqual([]);
	});

	it('heeft in de help elke sleutel die de code zet', () => {
		const inHelp = sleutelsInHelp();
		expect([...sleutelsInCode().keys()].filter((sleutel) => !inHelp.has(sleutel))).toEqual([]);
	});

	it('wijst elke plek in de balk aan', () => {
		const inHelp = sleutelsInHelp();
		for (const plek of boekPlekken('lukas', { precedenten: [], openVragen: [] }, null, 1)) expect(inHelp.has(plekSleutel(plek.plek)), plek.plek).toBe(true);
	});

	it('toont bij een knop dezelfde tekst als op de echte knop', () => {
		const inCode = sleutelsInCode();
		const inHelp = sleutelsInHelp();
		for (const sleutel of KNOPSLEUTELS) {
			const bestand = inCode.get(sleutel);
			expect(bestand, sleutel).toBeDefined();
			for (const naam of inHelp.get(sleutel) ?? []) expect(readFileSync(bestand ?? '', 'utf8'), `${sleutel}: ${naam}`).toContain(naam);
		}
	});
});
