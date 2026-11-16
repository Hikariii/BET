import type { Node } from 'prosemirror-model';
import { EditorState, TextSelection, type Command } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import type { VersInhoud } from '../bewerken/types';
import { DOMEINEN, type Alineastijl, type Opmaak } from '../formaat/types';
import { GEEN_VETTE_OPMAAK } from './editor.testhulp';
import { versInhoudNaarDocument } from './versDocument';
import type { VetteOpmaak } from './vetteOpmaak';
import { kiesKleur, schakelOpmaak, schakelVet, werkbalkToestand, wisOpmaak, type KnopToestand } from './werkbalk';

const ALLE_DOMEINEN_VET: VetteOpmaak = { domeinen: new Set(DOMEINEN), alineastijlen: new Set(['god']) };

type Stuk = readonly [tekst: string, ...opmaak: Opmaak[]];

function stand(stukken: readonly Stuk[], stijl: Alineastijl | null = null): EditorState {
	const inhoud: VersInhoud = {
		delen: [{ stijl, stukken: stukken.map(([tekst, ...opmaak]) => ({ soort: 'tekst', tekst, opmaak })) }],
	};
	return EditorState.create({ doc: versInhoudNaarDocument(inhoud) });
}

function positieVan(doc: Node, tekst: string): number {
	const alleTekst = doc.textBetween(0, doc.content.size, '\n', '\n');
	const plek = alleTekst.indexOf(tekst);
	expect(plek, `'${tekst}' staat in het document`).toBeGreaterThanOrEqual(0);
	return plek + 1;
}

function selecteer(state: EditorState, tekst: string): EditorState {
	const van = positieVan(state.doc, tekst);
	return state.apply(state.tr.setSelection(TextSelection.create(state.doc, van, van + tekst.length)));
}

function cursorNa(state: EditorState, tekst: string): EditorState {
	return state.apply(state.tr.setSelection(TextSelection.create(state.doc, positieVan(state.doc, tekst) + tekst.length)));
}

/** De tekststukken van het document zoals de editor ze heeft, met de namen van hun marks (zonder normalisatie). */
function stukkenVan(state: EditorState): Stuk[] {
	const stukken: Stuk[] = [];
	state.doc.descendants((node) => {
		if (node.isText) stukken.push([node.text ?? '', ...(node.marks.map((mark) => mark.type.name) as Opmaak[])]);
	});
	return stukken;
}

function voerUit(state: EditorState, command: Command): { gelukt: boolean; na: EditorState } {
	let na = state;
	const gelukt = command(state, (transactie) => {
		na = state.apply(transactie);
	});
	return { gelukt, na };
}

function uitgeschakeld(reden: string): KnopToestand {
	return { soort: 'uitgeschakeld', reden };
}

describe('vet', () => {
	it('zet vet aan en weer uit op de geselecteerde tekst', () => {
		const begin = selecteer(stand([['Zij zagen Christus komen.']]), 'Christus');
		expect(werkbalkToestand(begin, GEEN_VETTE_OPMAAK).vet).toEqual({ soort: 'uit' });

		const aan = voerUit(begin, schakelVet(GEEN_VETTE_OPMAAK));
		expect(aan.gelukt).toBe(true);
		expect(stukkenVan(aan.na)).toEqual([['Zij zagen '], ['Christus', 'vet'], [' komen.']]);
		expect(werkbalkToestand(aan.na, GEEN_VETTE_OPMAAK).vet).toEqual({ soort: 'aan' });

		const uit = voerUit(aan.na, schakelVet(GEEN_VETTE_OPMAAK));
		expect(stukkenVan(uit.na)).toEqual([['Zij zagen Christus komen.']]);
	});

	it('is aan als de hele selectie vet is, en uit als een deel niet vet is; aanzetten vult de rest aan', () => {
		const gemengd = selecteer(stand([['de '], ['Christus', 'vet'], [' kwam']]), 'de Christus kwam');
		expect(werkbalkToestand(gemengd, GEEN_VETTE_OPMAAK).vet).toEqual({ soort: 'uit' });

		const aan = voerUit(gemengd, schakelVet(GEEN_VETTE_OPMAAK));
		expect(stukkenVan(aan.na)).toEqual([['de Christus kwam', 'vet']]);
		expect(werkbalkToestand(aan.na, GEEN_VETTE_OPMAAK).vet).toEqual({ soort: 'aan' });
	});

	it('zet geen vet op tekst die al vet is door haar domein, en wel op de rest van de selectie', () => {
		const begin = selecteer(stand([['door '], ['genade', 'genade'], [' gered']]), 'door genade gered');
		const { na } = voerUit(begin, schakelVet(ALLE_DOMEINEN_VET));
		expect(stukkenVan(na)).toEqual([['door ', 'vet'], ['genade', 'genade'], [' gered', 'vet']]);
	});

	it('is uitgeschakeld met een reden als alles al vet is door de stijl', () => {
		const inDomein = selecteer(stand([['door '], ['genade', 'genade']]), 'genade');
		expect(werkbalkToestand(inDomein, ALLE_DOMEINEN_VET).vet).toEqual(uitgeschakeld('Al vet door de stijl.'));
		const poging = voerUit(inDomein, schakelVet(ALLE_DOMEINEN_VET));
		expect(poging.gelukt).toBe(false);
		expect(poging.na.doc.eq(inDomein.doc)).toBe(true);

		const inAlinea = selecteer(stand([['Ik ben'], [' God']], 'god'), 'Ik ben');
		expect(werkbalkToestand(inAlinea, ALLE_DOMEINEN_VET).vet).toEqual(uitgeschakeld('Al vet door de stijl.'));
		expect(werkbalkToestand(inAlinea, GEEN_VETTE_OPMAAK).vet).toEqual({ soort: 'uit' });
	});

	it('is aan en haalt vet weg als de tekst vet is door een mark en ook door haar stijl', () => {
		const begin = selecteer(stand([['genade', 'vet', 'genade']]), 'genade');
		expect(werkbalkToestand(begin, ALLE_DOMEINEN_VET).vet).toEqual({ soort: 'aan' });
		const { na } = voerUit(begin, schakelVet(ALLE_DOMEINEN_VET));
		expect(stukkenVan(na)).toEqual([['genade', 'genade']]);
	});
});

describe('de selectie wordt bijgeknipt', () => {
	it('laat witruimte aan de rand van de selectie buiten de opmaak', () => {
		const begin = selecteer(stand([['Zij zagen hem komen']]), ' zagen ');
		const { na } = voerUit(begin, schakelVet(GEEN_VETTE_OPMAAK));
		expect(stukkenVan(na)).toEqual([['Zij '], ['zagen', 'vet'], [' hem komen']]);
	});

	it('knipt leestekens niet af en laat een tag midden in een woord toe', () => {
		const begin = selecteer(stand([['Hij zei: “redding” en r']]), 'edding”');
		const { na } = voerUit(begin, schakelOpmaak('highlight'));
		expect(stukkenVan(na)).toEqual([['Hij zei: “r'], ['edding”', 'highlight'], [' en r']]);
	});

	it('doet niets met een selectie van alleen witruimte', () => {
		const begin = selecteer(stand([['een  twee']]), '  ');
		expect(werkbalkToestand(begin, GEEN_VETTE_OPMAAK).vet).toEqual(uitgeschakeld('De selectie bevat alleen spaties.'));
		for (const command of [schakelVet(GEEN_VETTE_OPMAAK), schakelOpmaak('onderstreept'), kiesKleur('zonde', GEEN_VETTE_OPMAAK), wisOpmaak]) {
			const poging = voerUit(begin, command);
			expect(poging.gelukt).toBe(false);
			expect(poging.na.doc.eq(begin.doc)).toBe(true);
		}
	});

	it('knipt per alinea bij als de selectie meer alinea’s raakt', () => {
		const inhoud: VersInhoud = {
			delen: [
				{ stijl: null, stukken: [{ soort: 'tekst', tekst: 'eerste deel ', opmaak: [] }] },
				{ stijl: null, stukken: [{ soort: 'tekst', tekst: ' tweede deel', opmaak: [] }] },
			],
		};
		const state = EditorState.create({ doc: versInhoudNaarDocument(inhoud) });
		const selectie = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 7, state.doc.content.size - 6)));
		const { na } = voerUit(selectie, schakelVet(GEEN_VETTE_OPMAAK));
		expect(stukkenVan(na)).toEqual([['eerste '], ['deel', 'vet'], [' '], [' '], ['tweede', 'vet'], [' deel']]);
	});
});

describe('onderstreept en markeren', () => {
	it.each(['onderstreept', 'highlight'] as const)('%s gaat aan en weer uit, en is pas aan als de hele selectie het heeft', (opmaak) => {
		const begin = selecteer(stand([['het '], ['Evangelie', opmaak], [' van Jezus']]), 'het Evangelie');
		expect(werkbalkToestand(begin, GEEN_VETTE_OPMAAK)[opmaak === 'highlight' ? 'markeren' : 'onderstreept']).toEqual({ soort: 'uit' });

		const aan = voerUit(begin, schakelOpmaak(opmaak));
		expect(stukkenVan(aan.na)).toEqual([['het Evangelie', opmaak], [' van Jezus']]);

		const uit = voerUit(aan.na, schakelOpmaak(opmaak));
		expect(stukkenVan(uit.na)).toEqual([['het Evangelie van Jezus']]);
	});
});

describe('kleur', () => {
	it('geeft een domein aan gewone tekst en meldt dat als actieve kleur', () => {
		const begin = selecteer(stand([['Door goedheid gered']]), 'goedheid');
		expect(werkbalkToestand(begin, GEEN_VETTE_OPMAAK).actieveKleur).toBeNull();
		const { na } = voerUit(begin, kiesKleur('genade', GEEN_VETTE_OPMAAK));
		expect(stukkenVan(na)).toEqual([['Door '], ['goedheid', 'genade'], [' gered']]);
		expect(werkbalkToestand(na, GEEN_VETTE_OPMAAK).actieveKleur).toBe('genade');
		expect(werkbalkToestand(na, GEEN_VETTE_OPMAAK).kleur).toEqual({ soort: 'aan' });
	});

	it('vervangt het ene domein door het andere en haalt hem weg bij nog eens kiezen of Geen kleur', () => {
		const begin = selecteer(stand([['goedheid', 'genade']]), 'goedheid');
		const zonde = voerUit(begin, kiesKleur('zonde', GEEN_VETTE_OPMAAK));
		expect(stukkenVan(zonde.na)).toEqual([['goedheid', 'zonde']]);

		const nogEens = voerUit(zonde.na, kiesKleur('zonde', GEEN_VETTE_OPMAAK));
		expect(stukkenVan(nogEens.na)).toEqual([['goedheid']]);

		const geen = voerUit(zonde.na, kiesKleur(null, GEEN_VETTE_OPMAAK));
		expect(stukkenVan(geen.na)).toEqual([['goedheid']]);
	});

	it('houdt Onderwijs en een domein uit elkaar', () => {
		const metDomein = selecteer(stand([['goedheid', 'genade']]), 'goedheid');
		const onderwijs = voerUit(metDomein, kiesKleur('onderwijs', GEEN_VETTE_OPMAAK));
		expect(stukkenVan(onderwijs.na)).toEqual([['goedheid', 'onderwijs']]);

		const terugNaarDomein = voerUit(onderwijs.na, kiesKleur('geloof', GEEN_VETTE_OPMAAK));
		expect(stukkenVan(terugNaarDomein.na)).toEqual([['goedheid', 'geloof']]);
	});

	it('laat andere opmaak staan, maar haalt vet weg onder een domein dat zelf vet is', () => {
		const begin = selecteer(stand([['Christus', 'highlight', 'vet', 'onderstreept']]), 'Christus');
		const onderwijs = voerUit(begin, kiesKleur('onderwijs', ALLE_DOMEINEN_VET));
		expect(stukkenVan(onderwijs.na)).toEqual([['Christus', 'onderwijs', 'highlight', 'onderstreept', 'vet']]);

		const domein = voerUit(begin, kiesKleur('genade', ALLE_DOMEINEN_VET));
		expect(stukkenVan(domein.na)).toEqual([['Christus', 'highlight', 'onderstreept', 'genade']]);

		const domeinZonderVetteStijl = voerUit(begin, kiesKleur('genade', GEEN_VETTE_OPMAAK));
		expect(stukkenVan(domeinZonderVetteStijl.na)).toEqual([['Christus', 'highlight', 'onderstreept', 'vet', 'genade']]);
	});

	it('meldt gemengd als de selectie meer dan één kleur heeft', () => {
		const begin = selecteer(stand([['a', 'genade'], [' b', 'zonde']]), 'a b');
		expect(werkbalkToestand(begin, GEEN_VETTE_OPMAAK).actieveKleur).toBe('gemengd');
		const { na } = voerUit(begin, kiesKleur('genade', GEEN_VETTE_OPMAAK));
		expect(stukkenVan(na)).toEqual([['a b', 'genade']]);
	});
});

describe('wissen', () => {
	it('haalt alle opmaak van de selectie weg en laat de alineastijl staan', () => {
		const begin = selecteer(stand([['Christus', 'onderwijs', 'vet', 'genade'], [' kwam']], 'jezus'), 'Christus');
		expect(werkbalkToestand(begin, GEEN_VETTE_OPMAAK).wissen).toEqual({ soort: 'uit' });
		const { na } = voerUit(begin, wisOpmaak);
		expect(stukkenVan(na)).toEqual([['Christus kwam']]);
		expect(na.doc.child(0).attrs['stijl']).toBe('jezus');
	});

	it('is uitgeschakeld als er geen opmaak is om te wissen', () => {
		const begin = selecteer(stand([['gewone tekst']]), 'gewone');
		expect(werkbalkToestand(begin, GEEN_VETTE_OPMAAK).wissen).toEqual(uitgeschakeld('Hier staat geen opmaak om te wissen.'));
		expect(voerUit(begin, wisOpmaak).gelukt).toBe(false);
	});
});

describe('een cursor zonder selectie', () => {
	it('zet opmaak als stored mark, zodat de volgende tekst hem krijgt', () => {
		const begin = cursorNa(stand([['Zij zagen ']]), 'zagen');
		const aan = voerUit(begin, schakelVet(GEEN_VETTE_OPMAAK));
		expect(aan.na.storedMarks?.map((mark) => mark.type.name)).toEqual(['vet']);
		expect(werkbalkToestand(aan.na, GEEN_VETTE_OPMAAK).vet).toEqual({ soort: 'aan' });

		const getypt = aan.na.apply(aan.na.tr.insertText('X'));
		expect(stukkenVan(getypt)).toEqual([['Zij zagen'], ['X', 'vet'], [' ']]);

		const uit = voerUit(aan.na, schakelVet(GEEN_VETTE_OPMAAK));
		expect(uit.na.storedMarks).toEqual([]);
	});

	it('kiest een kleur voor de volgende tekst en wist de stored marks', () => {
		const begin = cursorNa(stand([['Zij zagen ']]), 'zagen');
		const kleur = voerUit(begin, kiesKleur('zonde', GEEN_VETTE_OPMAAK));
		expect(kleur.na.storedMarks?.map((mark) => mark.type.name)).toEqual(['zonde']);
		expect(werkbalkToestand(kleur.na, GEEN_VETTE_OPMAAK).actieveKleur).toBe('zonde');

		const gewist = voerUit(kleur.na, wisOpmaak);
		expect(gewist.na.storedMarks).toEqual([]);
	});

	it('is uitgeschakeld voor vet in een vette alinea', () => {
		const begin = cursorNa(stand([['Ik ben']], 'god'), 'Ik');
		expect(werkbalkToestand(begin, ALLE_DOMEINEN_VET).vet).toEqual(uitgeschakeld('Al vet door de stijl.'));
	});

	it('houdt een domein aan als je er direct achter verder typt (inclusive is standaard)', () => {
		const begin = cursorNa(stand([['door '], ['genade', 'genade'], [' gered']]), 'genade');
		const getypt = begin.apply(begin.tr.insertText('s'));
		expect(stukkenVan(getypt)).toEqual([['door '], ['genades', 'genade'], [' gered']]);
	});
});
