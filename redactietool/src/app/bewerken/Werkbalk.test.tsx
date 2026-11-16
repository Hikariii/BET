// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, describe, expect, it } from 'vitest';
import type { WordStijl } from '../../data/types';
import { DOMEINEN } from '../../formaat/types';
import type { WerkbalkActie, WerkbalkToestand } from '../../editor/werkbalk';
import { Werkbalk } from './Werkbalk';

const STIJLEN: WordStijl[] = [{ id: 'genade', naam: 'genade (Word)', soort: 'teken', kleur: '04AC24', vet: true, cursief: true }];

const UIT: WerkbalkToestand = {
	vet: { soort: 'uit' },
	onderstreept: { soort: 'uit' },
	markeren: { soort: 'uit' },
	kleur: { soort: 'uit' },
	wissen: { soort: 'uit' },
	actieveKleur: null,
};

type Opties = { toestand?: WerkbalkToestand; mac?: boolean; kleurmenuStart?: boolean };

/** Houdt het open of dicht staan van het kleurmenu bij, zoals VersEditor, en noteert wat de werkbalk meldt. */
function toonWerkbalk({ toestand = UIT, mac = false, kleurmenuStart = false }: Opties = {}) {
	const acties: WerkbalkActie[] = [];
	const terugNaarEditor: true[] = [];
	function Houder() {
		const [open, zetOpen] = useState(kleurmenuStart);
		return (
			<Werkbalk
				toestand={toestand}
				stijlen={STIJLEN}
				mac={mac}
				kleurmenuOpen={open}
				onKleurmenu={zetOpen}
				onActie={(actie) => {
					acties.push(actie);
					zetOpen(false);
				}}
				onTerugNaarEditor={() => terugNaarEditor.push(true)}
			/>
		);
	}
	render(<Houder />);
	return { acties, terugNaarEditor };
}

const knop = (naam: string | RegExp) => screen.getByRole('button', { name: naam });

afterEach(cleanup);

describe('Werkbalk', () => {
	it('toont de knoppen met hun stand: aan is ingedrukt, uitgeschakeld heeft de reden als tooltip', () => {
		toonWerkbalk({
			toestand: { ...UIT, vet: { soort: 'aan' }, onderstreept: { soort: 'uitgeschakeld', reden: 'Al vet door de stijl.' } },
		});

		expect(screen.getByRole('toolbar', { name: 'Opmaak' })).not.toBeNull();
		expect(knop('Vet').getAttribute('aria-pressed')).toBe('true');
		expect(knop('Markeren').getAttribute('aria-pressed')).toBe('false');
		const uitgeschakeld = knop('Onderstreept') as HTMLButtonElement;
		expect(uitgeschakeld.disabled).toBe(true);
		expect(uitgeschakeld.title).toBe('Al vet door de stijl.');
	});

	it('noemt de sneltoets in de tooltip, met ⌘ op een Mac', () => {
		toonWerkbalk();
		expect(knop('Vet').title).toBe('Vet (Ctrl+B)');
		expect(knop(/Kleur/).title).toBe('Kleur kiezen (Alt+K)');
		cleanup();

		toonWerkbalk({ mac: true });
		expect(knop('Vet').title).toBe('Vet (⌘B)');
		expect(knop(/Kleur/).title).toBe('Kleur kiezen (⌥K)');
	});

	it('meldt een klik op een knop als actie', () => {
		const { acties } = toonWerkbalk();
		fireEvent.click(knop('Vet'));
		fireEvent.click(knop('Markeren'));
		fireEvent.click(knop('Wissen'));
		expect(acties).toEqual([{ soort: 'vet' }, { soort: 'markeren' }, { soort: 'wissen' }]);
	});

	it('houdt de selectie in de editor: een muisklik op een knop neemt de focus niet', () => {
		toonWerkbalk();
		expect(fireEvent.mouseDown(knop('Vet'))).toBe(false);
	});

	it('is één tabstop en loopt met de pijltjes, Home en End langs de knoppen', () => {
		toonWerkbalk();
		const knoppen = screen.getAllByRole('button');
		expect(knoppen.map((element) => element.tabIndex)).toEqual([0, -1, -1, -1, -1]);

		knoppen[0]?.focus();
		fireEvent.keyDown(knoppen[0]!, { key: 'ArrowRight' });
		expect(document.activeElement).toBe(knoppen[1]);
		expect(screen.getAllByRole('button').map((element) => element.tabIndex)).toEqual([-1, 0, -1, -1, -1]);

		fireEvent.keyDown(knoppen[1]!, { key: 'End' });
		expect(document.activeElement).toBe(knoppen[4]);
		fireEvent.keyDown(knoppen[4]!, { key: 'ArrowRight' });
		expect(document.activeElement).toBe(knoppen[4]);
		fireEvent.keyDown(knoppen[4]!, { key: 'Home' });
		expect(document.activeElement).toBe(knoppen[0]);
	});

	it('slaat een uitgeschakelde knop over en geeft de tabstop aan een knop die werkt', () => {
		toonWerkbalk({ toestand: { ...UIT, vet: { soort: 'uitgeschakeld', reden: 'Al vet door de stijl.' } } });
		const knoppen = screen.getAllByRole('button');
		expect(knoppen.map((element) => element.tabIndex)).toEqual([-1, 0, -1, -1, -1]);

		knoppen[1]?.focus();
		fireEvent.keyDown(knoppen[1]!, { key: 'Home' });
		expect(document.activeElement).toBe(knoppen[1]);
	});

	it('Escape op de balk geeft de focus terug aan de editor', () => {
		const { terugNaarEditor } = toonWerkbalk();
		knop('Vet').focus();
		fireEvent.keyDown(knop('Vet'), { key: 'Escape' });
		expect(terugNaarEditor).toHaveLength(1);
	});
});

describe('het kleurmenu', () => {
	const regels = () => screen.getAllByRole('menuitemradio');

	it('opent met een klik en toont de acht domeinen, Onderwijs en Geen kleur, met de namen uit het sjabloon', () => {
		toonWerkbalk();
		expect(screen.queryByRole('menu')).toBeNull();
		expect(knop(/Kleur/).getAttribute('aria-expanded')).toBe('false');

		fireEvent.click(knop(/Kleur/));

		expect(knop(/Kleur/).getAttribute('aria-expanded')).toBe('true');
		const namen = regels().map((regel) => regel.textContent);
		expect(namen).toHaveLength(DOMEINEN.length + 2);
		expect(namen).toContain('genade (Word)');
		expect(namen).toContain('rechtvaardig');
		expect(namen.slice(-2)).toEqual(['Onderwijs (rode letters)', 'Geen kleur']);
	});

	it('zet de focus op de actieve kleur en laat die aangevinkt zien', () => {
		toonWerkbalk({ toestand: { ...UIT, kleur: { soort: 'aan' }, actieveKleur: 'geloof' }, kleurmenuStart: true });
		const actief = regels().find((regel) => regel.getAttribute('aria-checked') === 'true');
		expect(actief?.textContent).toBe('geloof');
		expect(document.activeElement).toBe(actief);
	});

	it('zet de focus op de eerste regel als er geen kleur actief is, en Geen kleur is dan aangevinkt', () => {
		toonWerkbalk({ kleurmenuStart: true });
		expect(document.activeElement).toBe(regels()[0]);
		expect(regels().filter((regel) => regel.getAttribute('aria-checked') === 'true').map((regel) => regel.textContent)).toEqual(['Geen kleur']);
	});

	it('loopt met pijl omlaag en omhoog, Home en End langs de regels', () => {
		toonWerkbalk({ kleurmenuStart: true });
		const alle = regels();
		fireEvent.keyDown(alle[0]!, { key: 'ArrowDown' });
		expect(document.activeElement).toBe(alle[1]);
		fireEvent.keyDown(alle[1]!, { key: 'End' });
		expect(document.activeElement).toBe(alle.at(-1));
		fireEvent.keyDown(alle.at(-1)!, { key: 'ArrowUp' });
		expect(document.activeElement).toBe(alle.at(-2));
		fireEvent.keyDown(alle.at(-2)!, { key: 'Home' });
		expect(document.activeElement).toBe(alle[0]);
	});

	it('meldt de gekozen kleur en sluit, ook voor Geen kleur', () => {
		const { acties } = toonWerkbalk({ kleurmenuStart: true });
		fireEvent.click(screen.getByRole('menuitemradio', { name: 'zonde' }));
		expect(screen.queryByRole('menu')).toBeNull();

		fireEvent.click(knop(/Kleur/));
		fireEvent.click(screen.getByRole('menuitemradio', { name: 'Geen kleur' }));

		expect(acties).toEqual([
			{ soort: 'kleur', kleur: 'zonde' },
			{ soort: 'kleur', kleur: null },
		]);
	});

	it('sluit met Escape en geeft de focus terug aan de editor', () => {
		const { terugNaarEditor } = toonWerkbalk({ kleurmenuStart: true });
		fireEvent.keyDown(regels()[0]!, { key: 'Escape' });
		expect(screen.queryByRole('menu')).toBeNull();
		expect(terugNaarEditor).toHaveLength(1);
	});

	it('sluit met een klik buiten de werkbalk, niet met een klik erin', () => {
		toonWerkbalk({ kleurmenuStart: true });
		fireEvent.pointerDown(knop('Vet'));
		expect(screen.queryByRole('menu')).not.toBeNull();

		fireEvent.pointerDown(document.body);
		expect(screen.queryByRole('menu')).toBeNull();
	});

	it('sluit als de focus met Tab naar buiten gaat', () => {
		toonWerkbalk({ kleurmenuStart: true });
		const buiten = document.body.appendChild(document.createElement('button'));
		fireEvent.focusOut(regels().at(-1)!, { relatedTarget: buiten });
		expect(screen.queryByRole('menu')).toBeNull();
		buiten.remove();
	});

	it('opent met pijl omlaag op de knop Kleur', () => {
		toonWerkbalk();
		fireEvent.keyDown(knop(/Kleur/), { key: 'ArrowDown' });
		expect(screen.queryByRole('menu')).not.toBeNull();
	});
});
