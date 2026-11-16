import { describe, expect, it } from 'vitest';
import { leesPythonUitvoer } from '../formaat/bijbelbestanden.testhulp';
import { leesStijlen } from '../sjabloon/leesStijlen';
import { leesStylesXmlVanSjabloon } from '../sjabloon/sjabloon.testhulp';
import { ALINEASTIJL_NAAR_WORD, DOMEIN_NAAR_WORD, TITEL_WORD } from './stijlkoppeling';

const python = leesPythonUitvoer();
const stijlen = new Map(leesStijlen(leesStylesXmlVanSjabloon()).map((stijl) => [stijl.id, stijl]));

describe('stijlkoppeling tegen scripts/md_naar_docx.py', () => {
	it('koppelt elke alineastijl aan dezelfde Word-stijl als de Word-export', () => {
		expect(ALINEASTIJL_NAAR_WORD).toEqual(python.stijlkoppeling.alineastijlen);
	});

	it('koppelt elk domein aan dezelfde Word-stijl als de Word-export', () => {
		expect(DOMEIN_NAAR_WORD).toEqual(python.stijlkoppeling.domeinen);
	});

	it('zet de hoofdstuktitel op dezelfde Word-stijl als de Word-export', () => {
		expect(TITEL_WORD).toBe(python.stijlkoppeling.titel);
	});
});

describe('stijlkoppeling tegen het Word-sjabloon van Lukas', () => {
	it.each(Object.entries(ALINEASTIJL_NAAR_WORD))('alineastijl %s bestaat als alinea-stijl %s', (_tag, id) => {
		expect(stijlen.get(id)?.soort).toBe('alinea');
	});

	it.each([...Object.entries(DOMEIN_NAAR_WORD), ['titel', TITEL_WORD]])('tekenstijl %s bestaat als teken-stijl %s', (_tag, id) => {
		expect(stijlen.get(id as string)?.soort).toBe('teken');
	});
});
