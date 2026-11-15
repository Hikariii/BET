import type { Node } from 'prosemirror-model';
import { EditorState, type Transaction } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import { parseerHoofdstuk } from '../formaat/parseer';
import { serialiseerHoofdstuk } from '../formaat/serialiseer';
import type { Opmaak } from '../formaat/types';
import { naarProseMirror, vanProseMirror } from './omzetten';
import { schema } from './schema';
import { versnummersZonderOpmaak } from './versnummersZonderOpmaak';

function alsTekst(doc: Node): string {
	return serialiseerHoofdstuk(vanProseMirror(doc));
}

function positieVan(doc: Node, tekst: string): number {
	let gevonden = -1;
	doc.descendants((node, positie) => {
		const plek = gevonden === -1 && node.isText ? (node.text ?? '').indexOf(tekst) : -1;
		if (plek !== -1) gevonden = positie + plek;
	});
	expect(gevonden, `'${tekst}' staat in het document`).toBeGreaterThanOrEqual(0);
	return gevonden;
}

/** Leest het bronbestand in de editor, controleert dat het ongewijzigd terugkomt en geeft het document na de bewerking. */
function bewerk(bron: string, wijzig: (transactie: Transaction) => Transaction): Node {
	const state = EditorState.create({ doc: naarProseMirror(parseerHoofdstuk(bron)), plugins: [versnummersZonderOpmaak] });
	expect(alsTekst(state.doc)).toBe(bron);
	return state.apply(wijzig(state.tr)).doc;
}

function markeer(transactie: Transaction, tekst: string, opmaak: readonly Opmaak[]): Transaction {
	const van = positieVan(transactie.doc, tekst);
	for (const naam of opmaak) transactie.addMark(van, van + tekst.length, schema.marks[naam]!.create());
	return transactie;
}

describe('een bewerking in de editor', () => {
	it('een woord vervangen binnen gemarkeerde tekst behoudt de markering', () => {
		const bron = '# Lukas 1\n[1] Zij zagen {onderwijs}een =={genade}grote{/genade}== zegen{/onderwijs} van God.\n';
		const uit = alsTekst(
			bewerk(bron, (transactie) => {
				const van = positieVan(transactie.doc, 'grote');
				return transactie.insertText('enorme', van, van + 'grote'.length);
			}),
		);
		expect(uit).toBe('# Lukas 1\n[1] Zij zagen {onderwijs}een =={genade}enorme{/genade}== zegen{/onderwijs} van God.\n');
		expect(() => parseerHoofdstuk(uit)).not.toThrow();
	});

	it('opmaak staat in de volgorde van FORMAAT.md, ook als hij in omgekeerde volgorde is aangebracht', () => {
		const omgekeerd = ['genade', 'cursief', 'vet', 'onderstreept', 'highlight', 'onderwijs'] as const;
		const uit = bewerk('# Lukas 1\n[1] Christus kwam.\n', (transactie) => markeer(transactie, 'Christus', omgekeerd));
		expect(vanProseMirror(uit).alineas[1]).toMatchObject({
			stukken: [
				{ soort: 'vers' },
				{ soort: 'tekst', tekst: ' ' },
				{ soort: 'tekst', tekst: 'Christus', opmaak: [...omgekeerd].reverse() },
				{ soort: 'tekst', tekst: ' kwam.' },
			],
		});
		expect(alsTekst(uit)).toBe(
			'# Lukas 1\n[1] {onderwijs}=={onderstreept}{vet}{cursief}{genade}Christus{/genade}{/cursief}{/vet}{/onderstreept}=={/onderwijs} kwam.\n',
		);
	});

	it('een tweede domein vervangt het eerste over dezelfde tekst', () => {
		const uit = bewerk('# Lukas 1\n[1] Door {genade}goedheid{/genade} gered.\n', (transactie) =>
			markeer(transactie, 'goedheid', ['zonde']),
		);
		expect(alsTekst(uit)).toBe('# Lukas 1\n[1] Door {zonde}goedheid{/zonde} gered.\n');
	});

	it('een markering over een versnummer heen laat het versnummer buiten de tags', () => {
		const uit = bewerk('# Lukas 1\n[1] aap [2] noot\n', (transactie) => {
			const van = positieVan(transactie.doc, 'aap');
			const tot = positieVan(transactie.doc, 'noot') + 'noot'.length;
			return transactie.addMark(van, tot, schema.marks['vet']!.create());
		});
		const versnummers: Node[] = [];
		uit.descendants((node) => {
			if (node.type.name === 'versnummer') versnummers.push(node);
		});
		expect(versnummers.map((versnummer) => versnummer.marks.length)).toEqual([0, 0]);
		expect(alsTekst(uit)).toBe('# Lukas 1\n[1] {vet}aap {/vet}[2]{vet} noot{/vet}\n');
		expect(() => parseerHoofdstuk(alsTekst(uit))).not.toThrow();
	});
});
