import type { WordStijl } from '../data/types';
import { isDomein, type Alineastijl, type Opmaak, type Tekststuk } from '../formaat/types';
import {
	ALINEASTIJL_NAAR_WORD,
	DOMEIN_NAAR_WORD,
	HIGHLIGHT_KLEUR,
	ONDERWIJS_KLEUR,
} from '../data/stijlkoppeling';

/** CSS-eigenschappen in camelCase, zoals Preact ze verwacht. */
export type Opmaakstijl = {
	color?: string;
	backgroundColor?: string;
	fontWeight?: 'bold';
	fontStyle?: 'italic';
	textDecoration?: 'underline';
};

/** Kleur, vet en cursief van een stijl uit het Word-sjabloon. */
function opmaakstijlVan(stijl: WordStijl | null): Opmaakstijl {
	if (stijl === null) {
		return {};
	}
	return {
		...(stijl.kleur === null ? {} : { color: `#${stijl.kleur}` }),
		...(stijl.vet ? { fontWeight: 'bold' as const } : {}),
		...(stijl.cursief ? { fontStyle: 'italic' as const } : {}),
	};
}

function zoekStijl(stijlen: readonly WordStijl[], id: string): WordStijl | null {
	return stijlen.find((stijl) => stijl.id === id) ?? null;
}

export function alineaOpmaakstijl(stijl: Alineastijl | null, stijlen: readonly WordStijl[]): Opmaakstijl {
	return stijl === null ? {} : opmaakstijlVan(zoekStijl(stijlen, ALINEASTIJL_NAAR_WORD[stijl]));
}

function enkeleOpmaakstijl(opmaak: Opmaak, stijlen: readonly WordStijl[]): Opmaakstijl {
	if (isDomein(opmaak)) {
		return opmaakstijlVan(zoekStijl(stijlen, DOMEIN_NAAR_WORD[opmaak]));
	}
	switch (opmaak) {
		case 'onderwijs':
			return { color: `#${ONDERWIJS_KLEUR}` };
		case 'highlight':
			return { backgroundColor: HIGHLIGHT_KLEUR };
		case 'vet':
			return { fontWeight: 'bold' };
		case 'cursief':
			return { fontStyle: 'italic' };
		case 'onderstreept':
			return { textDecoration: 'underline' };
	}
}

/** De opmaak van buiten naar binnen samengevoegd; de binnenste wint bij dezelfde eigenschap. */
export function tekststukOpmaakstijl(stuk: Tekststuk, stijlen: readonly WordStijl[]): Opmaakstijl {
	return Object.assign({}, ...stuk.opmaak.map((opmaak) => enkeleOpmaakstijl(opmaak, stijlen))) as Opmaakstijl;
}
