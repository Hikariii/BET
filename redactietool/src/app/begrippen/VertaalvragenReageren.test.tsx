// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { repoHoofdstuk } from '../../bewaren/testhulp';
import type { BoekData, HoofdstukData, Referentie } from '../../data/types';
import { bewaarReactie, leesReacties, type Reactie } from '../../reacties/reacties';
import { Vertaalvragen } from './Vertaalvragen';

const BOEK: BoekData = { id: 'lukas', naam: 'Lukas', prefix: 'lukas', hoofdstukken: [], stijlen: [] };
const REFERENTIE: Referentie = { precedenten: [], openVragen: [] };

/** Hoofdstuk 4 met één opmerking van Claude met status open, zodat die zonder uitklappen van een groep in de lijst staat (O4.1). */
const HOOFDSTUK: HoofdstukData = {
	...repoHoofdstuk(4, { 12: ' Een vers.' }),
	log: { verzen: [], algemeneVragen: ['**Vrije weergave in 4:12**: Claude twijfelde of dit te vrij is. [open]'] },
};

const OPMERKING = 'O4.1';
const KWESTIE = 'Vrije weergave in';

function toon() {
	render(<Vertaalvragen boek={BOEK} referentie={REFERENTIE} hoofdstukken={[HOOFDSTUK]} />);
}

function reageerKnop(): HTMLElement {
	return screen.getByRole('button', { name: `Reageren op ${OPMERKING}: ${KWESTIE}` });
}

function reactieVak(): HTMLElement {
	const vak = document.querySelector<HTMLElement>('[data-help="reactie-vak"]');
	if (vak === null) throw new Error('het vak Reageren is niet getekend');
	return vak;
}

function vulReactie(tekst: string): void {
	fireEvent.input(screen.getByLabelText('Je reactie voor Claude'), { target: { value: tekst } });
}

function bewaard(): Reactie[] {
	return leesReacties(window.localStorage, 'lukas');
}

const BESTAAND: Reactie = { nr: OPMERKING, hoofdstuk: 4, kwestie: KWESTIE, tekst: 'Laat het zo.', wordtVraag: false, gegeven: '2026-11-16T10:00:00.000Z' };

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('het vak Reageren bij een opmerking van Claude', () => {
	it('is ingeklapt: alleen de knop Reageren, geen veld en geen label in de rij', () => {
		toon();

		expect(reageerKnop()).toBeTruthy();
		expect(screen.queryByLabelText('Je reactie voor Claude')).toBeNull();
		expect(screen.queryByText('gereageerd')).toBeNull();
	});

	it('bewaart een reactie met Opslaan, klapt weer in en zet het label gereageerd in de rij', () => {
		toon();
		fireEvent.click(reageerKnop());
		expect(screen.getByText('Claude zet de vraag in de lijst met open vragen als je de export teruggeeft.')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Weghalen' })).toBeNull();

		vulReactie('  Dit mag dichter bij de bron.  ');
		fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

		expect(bewaard()).toMatchObject([{ nr: OPMERKING, hoofdstuk: 4, kwestie: KWESTIE, tekst: 'Dit mag dichter bij de bron.', wordtVraag: false }]);
		expect(screen.queryByLabelText('Je reactie voor Claude')).toBeNull();
		expect(screen.getByText('gereageerd')).toBeTruthy();
		expect(screen.queryByText('wordt vraag')).toBeNull();
		expect(within(reactieVak()).getByText('Dit mag dichter bij de bron.')).toBeTruthy();
		expect(screen.getByText('Reactie opgeslagen.')).toBeTruthy();
	});

	it('bewaart met alleen het vinkje, zonder tekst, en toont dan ook wordt vraag in de rij', () => {
		toon();
		fireEvent.click(reageerKnop());

		fireEvent.click(screen.getByLabelText('Maak hier een vertaalvraag van'));
		fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

		expect(bewaard()).toMatchObject([{ nr: OPMERKING, tekst: '', wordtVraag: true }]);
		expect(screen.getByText('gereageerd')).toBeTruthy();
		expect(screen.getByText('wordt vraag')).toBeTruthy();
	});

	it('bewaart niets en zegt wat er mist als er geen tekst en geen vinkje is', () => {
		toon();
		fireEvent.click(reageerKnop());

		fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

		expect(bewaard()).toEqual([]);
		expect(screen.getByRole('alert').textContent).toBe('Schrijf een reactie of zet het vinkje aan.');
		expect(screen.getByLabelText('Je reactie voor Claude')).toBeTruthy();
	});

	it('toont een bestaande reactie in het veld, past hem aan en haalt hem weg met Weghalen', () => {
		bewaarReactie(window.localStorage, 'lukas', BESTAAND);
		toon();
		expect(screen.getByText('gereageerd')).toBeTruthy();

		fireEvent.click(reageerKnop());
		expect((screen.getByLabelText('Je reactie voor Claude') as HTMLTextAreaElement).value).toBe('Laat het zo.');
		vulReactie('Toch aanpassen.');
		fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
		expect(bewaard()).toMatchObject([{ nr: OPMERKING, tekst: 'Toch aanpassen.' }]);

		fireEvent.click(reageerKnop());
		fireEvent.click(screen.getByRole('button', { name: 'Weghalen' }));

		expect(bewaard()).toEqual([]);
		expect(screen.queryByText('gereageerd')).toBeNull();
		expect(screen.getByText('Reactie weggehaald.')).toBeTruthy();
	});

	it('klapt in met Annuleren zonder iets te bewaren', () => {
		toon();
		fireEvent.click(reageerKnop());
		vulReactie('Niet bewaren.');

		fireEvent.click(screen.getByRole('button', { name: 'Annuleren' }));

		expect(bewaard()).toEqual([]);
		expect(screen.queryByLabelText('Je reactie voor Claude')).toBeNull();
	});
});
