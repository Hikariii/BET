import type { Mark, MarkType, Node } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { DOMEINEN, isDomein, type Alineastijl, type Domein } from '../formaat/types';
import { schema } from './schema';
import { alineastijlVan } from './versDocument';
import { isVetDoorStijl, type VetteOpmaak } from './vetteOpmaak';

/** Eén keuze van Kleur ▾: een begripsdomein of Onderwijs. */
export type Kleur = Domein | 'onderwijs';

export const KLEUREN: readonly Kleur[] = [...DOMEINEN, 'onderwijs'];

/** De opmaak die de werkbalk kan zetten: vet, onderstreept, markeren en de kleuren. Cursief ontbreekt. */
export const OPMAAK_VAN_WERKBALK: ReadonlySet<string> = new Set(['vet', 'onderstreept', 'highlight', ...KLEUREN]);

/** De kleur die de hele selectie heeft; `gemengd` bij meer dan één kleur in de selectie, `null` zonder kleur. */
export type ActieveKleur = Kleur | 'gemengd' | null;

export type KnopToestand = { soort: 'aan' } | { soort: 'uit' } | { soort: 'uitgeschakeld'; reden: string };

export type WerkbalkToestand = {
	vet: KnopToestand;
	onderstreept: KnopToestand;
	markeren: KnopToestand;
	/** `aan` als de selectie een kleur heeft. */
	kleur: KnopToestand;
	wissen: KnopToestand;
	actieveKleur: ActieveKleur;
};

const ALLEEN_SPATIES = 'De selectie bevat alleen spaties.';
const AL_VET: KnopToestand = { soort: 'uitgeschakeld', reden: 'Al vet door de stijl.' };
const NIETS_OM_TE_WISSEN: KnopToestand = { soort: 'uitgeschakeld', reden: 'Hier staat geen opmaak om te wissen.' };

type Bereik = { van: number; tot: number };

/** Een stuk van de selectie met dezelfde opmaak; bij een cursor het punt waar de tekst komt, zonder bereik. */
type Stuk = {
	bereik: Bereik | null;
	marks: readonly Mark[];
	alineastijl: Alineastijl | null;
};

/** Een stuk tekst uit één alinea voordat de randwitruimte van de selectie eraf is. */
type Tekstdeel = Stuk & { bereik: Bereik; tekst: string };

function knipRandwitruimte(delen: readonly Tekstdeel[]): Tekstdeel[] {
	const eerste = delen.findIndex((deel) => deel.tekst.trim() !== '');
	const laatste = delen.findLastIndex((deel) => deel.tekst.trim() !== '');
	if (eerste === -1) return [];
	return delen.slice(eerste, laatste + 1).map((deel, plek, over) => {
		const links = plek === 0 ? deel.tekst.length - deel.tekst.trimStart().length : 0;
		const rechts = plek === over.length - 1 ? deel.tekst.length - deel.tekst.trimEnd().length : 0;
		return { ...deel, bereik: { van: deel.bereik.van + links, tot: deel.bereik.tot - rechts } };
	});
}

/**
 * De tekststukken in de selectie, per alinea bijgeknipt tot zonder witruimte aan de rand.
 * Een selectie van alleen witruimte geeft een lege lijst.
 */
function stukkenInSelectie(doc: Node, van: number, tot: number): Stuk[] {
	const stukken: Stuk[] = [];
	doc.nodesBetween(van, tot, (alinea, alineaPositie) => {
		if (!alinea.isTextblock) return true;
		const alineastijl = alineastijlVan(alinea.attrs['stijl']);
		const delen: Tekstdeel[] = [];
		alinea.forEach((kind, afstand) => {
			const begin = alineaPositie + 1 + afstand;
			const bereik = { van: Math.max(van, begin), tot: Math.min(tot, begin + kind.nodeSize) };
			if (!kind.isText || bereik.van >= bereik.tot) return;
			delen.push({ bereik, marks: kind.marks, alineastijl, tekst: (kind.text ?? '').slice(bereik.van - begin, bereik.tot - begin) });
		});
		stukken.push(...knipRandwitruimte(delen).map(({ bereik, marks }) => ({ bereik, marks, alineastijl })));
		return false;
	});
	return stukken;
}

/** Waar de opmaak op komt: de bijgeknipte stukken van de selectie, of bij een cursor de marks die de volgende tekst krijgt. */
function stukkenVan(state: EditorState): Stuk[] {
	const { empty, from, to, $from } = state.selection;
	if (!empty) return stukkenInSelectie(state.doc, from, to);
	const alineastijl = $from.parent.type.name === 'alinea' ? alineastijlVan($from.parent.attrs['stijl']) : null;
	return [{ bereik: null, marks: state.storedMarks ?? $from.marks(), alineastijl }];
}

function heeftMark(stuk: Stuk, naam: string): boolean {
	return stuk.marks.some((mark) => mark.type.name === naam);
}

function stukIsVetDoorStijl(stuk: Stuk, vette: VetteOpmaak): boolean {
	return isVetDoorStijl(vette, stuk.marks.map((mark) => mark.type.name), stuk.alineastijl);
}

function kleurenVan(stuk: Stuk): Kleur[] {
	return KLEUREN.filter((kleur) => heeftMark(stuk, kleur));
}

function actieveKleurVan(stukken: readonly Stuk[]): ActieveKleur {
	const kleuren = stukken.map(kleurenVan);
	const eerste = kleuren[0]?.[0] ?? null;
	if (kleuren.every((kleur) => kleur.length === 0)) return null;
	return kleuren.every((kleur) => kleur.length === 1 && kleur[0] === eerste) ? eerste : 'gemengd';
}

function heeftOpmaak(stukken: readonly Stuk[]): boolean {
	return stukken.some((stuk) => stuk.marks.length > 0);
}

function schakelaarToestand(stukken: readonly Stuk[], naam: string): KnopToestand {
	return stukken.every((stuk) => heeftMark(stuk, naam)) ? { soort: 'aan' } : { soort: 'uit' };
}

function vetToestand(stukken: readonly Stuk[], vette: VetteOpmaak): KnopToestand {
	const nietVet = stukken.some((stuk) => !heeftMark(stuk, 'vet') && !stukIsVetDoorStijl(stuk, vette));
	if (nietVet) return { soort: 'uit' };
	return stukken.some((stuk) => heeftMark(stuk, 'vet')) ? { soort: 'aan' } : AL_VET;
}

/** De stand van de knoppen bij deze selectie of cursor. */
export function werkbalkToestand(state: EditorState, vette: VetteOpmaak): WerkbalkToestand {
	const stukken = stukkenVan(state);
	if (stukken.length === 0) {
		const uitgeschakeld: KnopToestand = { soort: 'uitgeschakeld', reden: ALLEEN_SPATIES };
		return { vet: uitgeschakeld, onderstreept: uitgeschakeld, markeren: uitgeschakeld, kleur: uitgeschakeld, wissen: uitgeschakeld, actieveKleur: null };
	}
	const actieveKleur = actieveKleurVan(stukken);
	return {
		vet: vetToestand(stukken, vette),
		onderstreept: schakelaarToestand(stukken, 'onderstreept'),
		markeren: schakelaarToestand(stukken, 'highlight'),
		kleur: { soort: actieveKleur === null ? 'uit' : 'aan' },
		wissen: heeftOpmaak(stukken) ? { soort: 'uit' } : NIETS_OM_TE_WISSEN,
		actieveKleur,
	};
}

/** Wat er met de opmaak van één stuk gebeurt. */
type Handeling = {
	haalWeg: readonly MarkType[];
	voegToe: readonly MarkType[];
};

function markType(naam: string): MarkType {
	const type = schema.marks[naam];
	if (type === undefined) throw new Error(`onbekende mark '${naam}'`);
	return type;
}

/**
 * Past de handeling toe op elk stuk van de selectie, of op de stored marks bij een cursor.
 * Geeft `false` als er niets is om op toe te passen.
 */
function voerHandelingUit(state: EditorState, dispatch: Parameters<Command>[1], handelingVoor: (stuk: Stuk) => Handeling): boolean {
	const stukken = stukkenVan(state);
	if (stukken.length === 0) return false;
	if (dispatch === undefined) return true;
	const transactie = state.tr;
	for (const stuk of stukken) {
		const handeling = handelingVoor(stuk);
		if (stuk.bereik === null) {
			const zonder = handeling.haalWeg.reduce((marks, type) => type.removeFromSet(marks), stuk.marks);
			transactie.setStoredMarks(handeling.voegToe.reduce((marks, type) => type.create().addToSet(marks), zonder));
			continue;
		}
		for (const type of handeling.haalWeg) transactie.removeMark(stuk.bereik.van, stuk.bereik.tot, type);
		for (const type of handeling.voegToe) transactie.addMark(stuk.bereik.van, stuk.bereik.tot, type.create());
	}
	dispatch(transactie);
	return true;
}

/**
 * Vet aan of uit.
 * Aanzetten zet `vet` alleen op tekst die niet al vet is door haar domein of alineastijl (FORMAAT.md).
 * Uitzetten haalt `vet` weg.
 * Geeft `false` als alles al vet is door de stijl.
 */
export function schakelVet(vette: VetteOpmaak): Command {
	return (state, dispatch) => {
		const vet = markType('vet');
		const toestand = vetToestand(stukkenVan(state), vette);
		if (toestand.soort === 'uitgeschakeld') return false;
		return voerHandelingUit(state, dispatch, (stuk) =>
			toestand.soort === 'aan'
				? { haalWeg: [vet], voegToe: [] }
				: { haalWeg: [], voegToe: heeftMark(stuk, 'vet') || stukIsVetDoorStijl(stuk, vette) ? [] : [vet] },
		);
	};
}

/** Onderstreept of Markeren aan als niet de hele selectie het heeft, anders uit. */
export function schakelOpmaak(opmaak: 'onderstreept' | 'highlight'): Command {
	return (state, dispatch) => {
		const type = markType(opmaak);
		const aan = schakelaarToestand(stukkenVan(state), opmaak).soort === 'aan';
		return voerHandelingUit(state, dispatch, () => (aan ? { haalWeg: [type], voegToe: [] } : { haalWeg: [], voegToe: [type] }));
	};
}

/**
 * Kiest een kleur: een domein of Onderwijs, nooit twee tegelijk.
 * Dezelfde kleur nog eens kiezen, of `null` (geen kleur), haalt de kleur weg.
 * Een domein dat zelf vet is, haalt `vet` eronder weg.
 */
export function kiesKleur(kleur: Kleur | null, vette: VetteOpmaak): Command {
	return (state, dispatch) => {
		const alleKleuren = KLEUREN.map(markType);
		const weg = kleur === null || actieveKleurVan(stukkenVan(state)) === kleur;
		const gekozen = kleur === null ? null : markType(kleur);
		const vetOnderDomein = kleur !== null && isDomein(kleur) && vette.domeinen.has(kleur) ? [markType('vet')] : [];
		return voerHandelingUit(state, dispatch, () => ({
			haalWeg: weg ? alleKleuren : [...alleKleuren.filter((type) => type !== gekozen), ...vetOnderDomein],
			voegToe: weg || gekozen === null ? [] : [gekozen],
		}));
	};
}

/** Haalt alle opmaak van de selectie weg; de alineastijl blijft. Bij een cursor worden de stored marks leeg. */
export const wisOpmaak: Command = (state, dispatch) => {
	if (!heeftOpmaak(stukkenVan(state))) return false;
	return voerHandelingUit(state, dispatch, (stuk) => ({ haalWeg: stuk.marks.map((mark) => mark.type), voegToe: [] }));
};

/** Wat een knop van de werkbalk of een regel van het kleurmenu doet. */
export type WerkbalkActie = { soort: 'vet' | 'onderstreept' | 'markeren' | 'wissen' } | { soort: 'kleur'; kleur: Kleur | null };

export function commandVoorActie(actie: WerkbalkActie, vette: VetteOpmaak): Command {
	switch (actie.soort) {
		case 'vet':
			return schakelVet(vette);
		case 'onderstreept':
			return schakelOpmaak('onderstreept');
		case 'markeren':
			return schakelOpmaak('highlight');
		case 'wissen':
			return wisOpmaak;
		case 'kleur':
			return kiesKleur(actie.kleur, vette);
	}
}
