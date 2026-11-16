import { EditorState, TextSelection, type Command } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import { leesBijbelbestanden } from '../formaat/bijbelbestanden.testhulp';
import { serialiseerHoofdstuk } from '../formaat/serialiseer';
import { DOMEINEN } from '../formaat/types';
import { documentNaarVersInhoud, versInhoudNaarDocument } from './versDocument';
import type { VetteOpmaak } from './vetteOpmaak';
import { kiesKleur, schakelOpmaak, schakelVet } from './werkbalk';

/** In het Lukas-sjabloon zijn alle domeinen en Stem van God vet. */
const LUKAS_VET: VetteOpmaak = { domeinen: new Set(DOMEINEN), alineastijlen: new Set(['god']) };

const BEGIN_43 = '@jezus “Ik moet ook aan andere steden ';

/** De regel van Lukas 4:43 zoals hij in de repo staat: onderstreept over vet en een domein heen, met de spatie ertussen onderstreept. */
function regelUitRepo(): string {
	const bestand = leesBijbelbestanden().find(({ naam }) => naam === 'vereenvoudigd/lukas-04.md');
	const regel = bestand?.tekst.split('\n').find((kandidaat) => kandidaat.startsWith(BEGIN_43));
	expect(regel, 'Lukas 4:43 staat in vereenvoudigd/lukas-04.md').toBeDefined();
	return regel ?? '';
}

function legeJezusAlinea(): EditorState {
	return EditorState.create({ doc: versInhoudNaarDocument({ delen: [{ stijl: 'jezus', stukken: [] }] }) });
}

function voer(state: EditorState, command: Command): EditorState {
	let volgende = state;
	expect(command(state, (transactie) => (volgende = state.apply(transactie)))).toBe(true);
	return volgende;
}

function typ(state: EditorState, tekst: string): EditorState {
	return state.apply(state.tr.insertText(tekst));
}

function selecteer(state: EditorState, tekst: string): EditorState {
	const plek = state.doc.textContent.indexOf(tekst);
	expect(plek, `'${tekst}' staat in het vers`).toBeGreaterThanOrEqual(0);
	return state.apply(state.tr.setSelection(TextSelection.create(state.doc, plek + 1, plek + 1 + tekst.length)));
}

function alsRegel(state: EditorState): string {
	const [deel] = documentNaarVersInhoud(state.doc, LUKAS_VET).delen;
	expect(deel).toBeDefined();
	return serialiseerHoofdstuk({ alineas: [{ soort: 'tekst', stijl: deel?.stijl ?? null, stukken: deel?.stukken ?? [] }] }).slice(0, -1);
}

describe('opmaak die door elkaar loopt, opgebouwd met de werkbalk (Lukas 4:43)', () => {
	it('geeft dezelfde regel als de repo als je eerst typt en daarna selecteert', () => {
		let state = typ(legeJezusAlinea(), '“Ik moet ook aan andere steden het Goede Nieuws van het Koninkrijk van God verkondigen, want daarvoor ben Ik gestuurd.”');
		expect(alsRegel(state)).not.toBe(regelUitRepo());

		state = voer(selecteer(state, 'het Goede Nieuws van het Koninkrijk van God'), schakelOpmaak('onderstreept'));
		state = voer(selecteer(state, 'het Goede Nieuws van'), schakelVet(LUKAS_VET));
		state = voer(selecteer(state, 'het Koninkrijk van God'), kiesKleur('eeuwigleven', LUKAS_VET));

		expect(alsRegel(state)).toBe(regelUitRepo());
	});

	it('geeft dezelfde regel als de repo als je de opmaak aanzet terwijl je typt', () => {
		let state = typ(legeJezusAlinea(), '“Ik moet ook aan andere steden ');
		state = voer(state, schakelOpmaak('onderstreept'));
		state = voer(state, schakelVet(LUKAS_VET));
		state = typ(state, 'het Goede Nieuws van');
		state = voer(state, schakelVet(LUKAS_VET));
		state = typ(state, ' ');
		state = voer(state, kiesKleur('eeuwigleven', LUKAS_VET));
		state = typ(state, 'het Koninkrijk van God');
		state = voer(state, kiesKleur(null, LUKAS_VET));
		state = voer(state, schakelOpmaak('onderstreept'));
		state = typ(state, ' verkondigen, want daarvoor ben Ik gestuurd.”');

		expect(alsRegel(state)).toBe(regelUitRepo());
	});
});
