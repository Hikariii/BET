import { describe, expect, it } from 'vitest';
import { leesBijbelbestanden, leesPythonUitvoer, leesVoorbeelden, type PythonAlinea, type PythonSegment } from './bijbelbestanden.testhulp';
import { parseerHoofdstuk } from './parseer';
import { ALINEASTIJLEN, DOMEINEN, FormaatFout, OPMAAK_VOLGORDE, type Alinea } from './types';

const bestanden = leesBijbelbestanden();
const python = leesPythonUitvoer();
const voorbeelden = leesVoorbeelden();

function inPythonVorm(alinea: Alinea, regel: number): PythonAlinea {
	switch (alinea.soort) {
		case 'leeg':
			return { soort: 'leeg', stijl: null, titel: null, segs: [], regel };
		case 'titel':
			return { soort: 'titel', stijl: null, titel: alinea.tekst, segs: [], regel };
		case 'tekst':
			return {
				soort: 'tekst',
				stijl: alinea.stijl,
				titel: null,
				segs: alinea.stukken.map((stuk): PythonSegment =>
					stuk.soort === 'vers' ? ['vers', stuk.nummer, []] : ['tekst', stuk.tekst, [...stuk.opmaak]],
				),
				regel,
			};
	}
}

function verschillen(naam: string, verwacht: PythonAlinea[], eigen: PythonAlinea[]): string[] {
	const gevonden: string[] = [];
	const aantal = Math.max(verwacht.length, eigen.length);
	for (let index = 0; index < aantal; index++) {
		const regel = index + 1;
		const python = verwacht[index];
		const ts = eigen[index];
		const plek = `${naam} regel ${regel}`;
		if (python === undefined || ts === undefined) {
			gevonden.push(`${plek}: alinea ontbreekt aan de ${python === undefined ? 'Python' : 'TypeScript'}-kant`);
			continue;
		}
		for (const veld of ['regel', 'soort', 'stijl', 'titel'] as const) {
			if (python[veld] !== ts[veld]) gevonden.push(`${plek}: ${veld} Python=${JSON.stringify(python[veld])} TypeScript=${JSON.stringify(ts[veld])}`);
		}
		const pythonSegs = python.segs;
		const aantalSegs = Math.max(pythonSegs.length, ts.segs.length);
		for (let seg = 0; seg < aantalSegs; seg++) {
			const verwachtSeg = JSON.stringify(pythonSegs[seg]);
			const eigenSeg = JSON.stringify(ts.segs[seg]);
			if (verwachtSeg !== eigenSeg) {
				gevonden.push(`${plek}, stuk ${seg + 1}: Python=${verwachtSeg} TypeScript=${eigenSeg}`);
				break;
			}
		}
	}
	return gevonden;
}

describe('pariteit met parse_md in scripts/md_naar_docx.py', () => {
	it('Python en TypeScript lezen dezelfde bestanden', () => {
		expect(bestanden.length).toBeGreaterThan(0);
		expect(Object.keys(python.bestanden).sort()).toEqual(bestanden.map((bestand) => bestand.naam));
	});

	it('kent dezelfde alineastijlen, domeinen en directe opmaak', () => {
		const eigenDirecteOpmaak = OPMAAK_VOLGORDE.filter(
			(opmaak) => opmaak !== python.onderwijs && opmaak !== 'highlight' && !(DOMEINEN as readonly string[]).includes(opmaak),
		);
		expect([...ALINEASTIJLEN]).toEqual(python.alineastijlen);
		expect([...DOMEINEN]).toEqual(python.domeinen);
		expect([...eigenDirecteOpmaak].sort()).toEqual(python.directe_opmaak);
		expect(OPMAAK_VOLGORDE).toContain(python.onderwijs);
	});

	it('nest de opmaak in dezelfde volgorde', () => {
		expect([...OPMAAK_VOLGORDE]).toEqual(python.opmaak_volgorde);
	});

	describe.each(bestanden)('$naam', ({ naam, tekst }) => {
		it('geeft dezelfde alinea’s, stijlen, stukken en opmaak als Python', () => {
			const verwacht = python.bestanden[naam];
			expect(verwacht).toBeDefined();
			const eigen = parseerHoofdstuk(tekst).alineas.map((alinea, index) => inPythonVorm(alinea, index + 1));
			expect(verschillen(naam, verwacht ?? [], eigen)).toEqual([]);
		});
	});
});

describe('voorbeelden in voorbeelden.json', () => {
	it('heeft voor Python een uitkomst voor elk voorbeeld', () => {
		expect(Object.keys(python.voorbeelden.ongeldig)).toEqual(voorbeelden.ongeldig.map(({ naam }) => naam));
		expect(Object.keys(python.voorbeelden.geldig)).toEqual(voorbeelden.geldig.map(({ naam }) => naam));
	});

	describe.each(voorbeelden.ongeldig)('ongeldig: $naam', ({ naam, tekst }) => {
		it('weigert TypeScript', () => {
			expect(() => parseerHoofdstuk(tekst)).toThrow(FormaatFout);
		});

		it('weigert Python', () => {
			expect(python.voorbeelden.ongeldig[naam]).toEqual(expect.any(String));
		});
	});

	describe.each(voorbeelden.geldig)('geldig: $naam', ({ naam, tekst }) => {
		it('leest TypeScript', () => {
			expect(() => parseerHoofdstuk(tekst)).not.toThrow();
		});

		it('leest Python', () => {
			expect(python.voorbeelden.geldig[naam]).toBeNull();
		});
	});
});
