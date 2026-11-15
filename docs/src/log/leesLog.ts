import type { Log } from '../data/types';

/** Leest een wijzigingslog (bijbel/<boek>/wijzigingslog/<prefix>-NN.md). Wordt ingevuld; zelfde betekenis als parse_log in scripts/md_naar_docx.py. */
export function leesLog(_tekst: string): Log {
	return { verzen: [], algemeneVragen: [] };
}
