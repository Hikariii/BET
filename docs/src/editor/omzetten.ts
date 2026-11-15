import type { Mark, Node } from 'prosemirror-model';
import {
	ALINEASTIJLEN,
	OPMAAK_VOLGORDE,
	type Alinea,
	type Alineastijl,
	type Hoofdstuk,
	type Inlinestuk,
	type Opmaak,
} from '../formaat/types';
import { schema } from './schema';

const MAXIMAAL_LEGE_REGELS_ACHTER_ELKAAR = 2;

function alineaNode(stijl: Alineastijl | null, stukken: readonly Inlinestuk[]): Node {
	const inhoud = stukken.map((stuk) =>
		stuk.soort === 'tekst'
			? schema.text(
					stuk.tekst,
					stuk.opmaak.map((opmaak) => schema.marks[opmaak]!.create()),
				)
			: schema.nodes['versnummer']!.create({ nummer: stuk.nummer }),
	);
	return schema.nodes['alinea']!.create({ stijl }, inhoud);
}

function alineaNaarNode(alinea: Alinea): Node {
	switch (alinea.soort) {
		case 'titel':
			return schema.nodes['titel']!.create(null, schema.text(alinea.tekst));
		case 'leeg':
			return alineaNode(null, []);
		case 'tekst':
			return alineaNode(alinea.stijl, alinea.stukken);
	}
}

/** Zet een hoofdstuk om in een ProseMirror-document. Een document dat het schema niet toelaat (bv. twee domeinen over dezelfde tekst) geeft een fout. */
export function naarProseMirror(hoofdstuk: Hoofdstuk): Node {
	const document = schema.nodes['doc']!.create(null, hoofdstuk.alineas.map(alineaNaarNode));
	document.check();
	return document;
}

function opmaakVan(mark: Mark): Opmaak {
	const opmaak = OPMAAK_VOLGORDE.find((naam) => naam === mark.type.name);
	if (opmaak === undefined) throw new Error(`onbekende mark '${mark.type.name}'`);
	return opmaak;
}

function stijlVan(waarde: unknown): Alineastijl | null {
	if (waarde === null) return null;
	const stijl = ALINEASTIJLEN.find((naam) => naam === waarde);
	if (stijl === undefined) throw new Error(`onbekende alineastijl '${String(waarde)}'`);
	return stijl;
}

function stukkenVan(alinea: Node): Inlinestuk[] {
	const stukken: Inlinestuk[] = [];
	alinea.forEach((kind) => {
		if (kind.isText) {
			stukken.push({ soort: 'tekst', tekst: kind.text ?? '', opmaak: kind.marks.map(opmaakVan) });
		} else {
			// FORMAAT.md zet een versnummer altijd buiten tags, dus opmaak op een versnummer valt hier weg.
			stukken.push({ soort: 'vers', nummer: Number(kind.attrs['nummer']) });
		}
	});
	return stukken;
}

/**
 * Zet een ProseMirror-document terug in een hoofdstuk.
 * Een alinea zonder inhoud en zonder stijl wordt een lege regel; meer dan twee lege regels achter elkaar worden er twee, zoals FORMAAT.md voorschrijft.
 */
export function vanProseMirror(document: Node): Hoofdstuk {
	document.check();
	const alineas: Alinea[] = [];
	let legeRegelsAchterElkaar = 0;
	document.forEach((kind) => {
		if (kind.type.name === 'titel') {
			if (kind.content.size === 0) throw new Error('de titel is leeg');
			alineas.push({ soort: 'titel', tekst: kind.textContent });
			legeRegelsAchterElkaar = 0;
			return;
		}
		const stijl = stijlVan(kind.attrs['stijl']);
		if (kind.childCount === 0 && stijl === null) {
			legeRegelsAchterElkaar++;
			if (legeRegelsAchterElkaar <= MAXIMAAL_LEGE_REGELS_ACHTER_ELKAAR) alineas.push({ soort: 'leeg' });
			return;
		}
		legeRegelsAchterElkaar = 0;
		alineas.push({ soort: 'tekst', stijl, stukken: stukkenVan(kind) });
	});
	return { alineas };
}
