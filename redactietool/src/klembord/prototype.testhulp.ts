import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { WordStijl } from '../data/types';
import { parseerHoofdstuk } from '../formaat/parseer';
import type { Hoofdstuk } from '../formaat/types';
import { leesStijlen } from '../sjabloon/leesStijlen';
import { leesStylesXmlVanSjabloon } from '../sjabloon/sjabloon.testhulp';

const MAP = path.join(import.meta.dirname, 'prototype');

/** De hoofdstukken waarmee het prototype zijn uitvoer maakte; de invoer staat als kopie naast de uitvoer. */
export const PROTOTYPE_HOOFDSTUKKEN = [2, 3, 5, 17];

export function leesPrototypeInvoer(): Hoofdstuk[] {
	return PROTOTYPE_HOOFDSTUKKEN.map((nummer) =>
		parseerHoofdstuk(readFileSync(path.join(MAP, `lukas-${String(nummer).padStart(2, '0')}.md`), 'utf-8')),
	);
}

/** Variant A van het prototype (`maak_testpagina.py`, Python), zoals die op het klembord kwam. */
export function leesPrototypeVariantA(): string {
	return readFileSync(path.join(MAP, 'variant-a.html'), 'utf-8');
}

export function leesPrototypePlatteTekst(): string {
	return readFileSync(path.join(MAP, 'platte-tekst.txt'), 'utf-8');
}

export function stijlenUitSjabloon(): WordStijl[] {
	return leesStijlen(leesStylesXmlVanSjabloon());
}
