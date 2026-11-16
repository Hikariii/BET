import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { WordStijl } from '../../data/types';
import { isDomein } from '../../formaat/types';
import { KLEUREN, type Kleur, type KnopToestand, type WerkbalkActie, type WerkbalkToestand } from '../../editor/werkbalk';
import { rasterStop } from '../navigatie/toetsenbord';
import { DIRECTE_OPMAAK, domeinNaam } from '../opmaakNamen';
import { tekststukOpmaakstijl } from '../stijl';
import { sneltoetsTekst } from './sneltoetsen';
import './werkbalk.css';

type Props = {
	toestand: WerkbalkToestand;
	stijlen: readonly WordStijl[];
	/** Of sneltoetsen met ⌘ en ⌥ in plaats van Ctrl en Alt in de tooltips staan. */
	mac: boolean;
	kleurmenuOpen: boolean;
	onKleurmenu: (open: boolean) => void;
	/** Een knop of een regel van het kleurmenu is gekozen. */
	onActie: (actie: WerkbalkActie) => void;
	/** Escape: de focus gaat terug naar de editor, die open blijft. */
	onTerugNaarEditor: () => void;
};

const KNOPPEN = ['vet', 'onderstreept', 'markeren', 'kleur', 'wissen'] as const;
type KnopNaam = (typeof KNOPPEN)[number];

function isUitgeschakeld(toestand: KnopToestand): toestand is Extract<KnopToestand, { soort: 'uitgeschakeld' }> {
	return toestand.soort === 'uitgeschakeld';
}

/** De kleur van een keuze zoals de tekst hem krijgt, uit het sjabloon van het boek. */
function kleurvlak(kleur: Kleur, stijlen: readonly WordStijl[]): string | undefined {
	return tekststukOpmaakstijl({ soort: 'tekst', tekst: '', opmaak: [kleur] }, stijlen).color;
}

function kleurNaam(kleur: Kleur, stijlen: readonly WordStijl[]): string {
	return isDomein(kleur) ? domeinNaam(kleur, stijlen) : DIRECTE_OPMAAK[kleur];
}

function menuregels(menu: HTMLElement | null): HTMLElement[] {
	return [...(menu?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
}

/**
 * De opmaakknoppen boven de editor: B, U, Markeren, Kleur ▾ en Opmaak wissen.
 * De balk is één tabstop; met de pijltjes, Home en End loop je langs de knoppen.
 * De knoppen nemen de focus niet bij een muisklik, zodat de selectie in de editor blijft.
 * Het kleurmenu sluit met Escape (de focus gaat terug naar de editor), een klik buiten, Tab naar buiten of een gekozen kleur.
 */
export function Werkbalk({ toestand, stijlen, mac, kleurmenuOpen, onKleurmenu, onActie, onTerugNaarEditor }: Props) {
	const balk = useRef<HTMLDivElement>(null);
	const menu = useRef<HTMLDivElement>(null);
	const [tabstop, zetTabstop] = useState<KnopNaam>('vet');
	const bruikbaar = KNOPPEN.filter((naam) => !isUitgeschakeld(toestand[naam]));
	const huidigeTabstop = bruikbaar.includes(tabstop) ? tabstop : bruikbaar[0];

	useLayoutEffect(() => {
		if (!kleurmenuOpen) return;
		const regels = menuregels(menu.current);
		const actief = toestand.actieveKleur === null || toestand.actieveKleur === 'gemengd' ? 0 : KLEUREN.indexOf(toestand.actieveKleur);
		regels[actief]?.focus();
	}, [kleurmenuOpen]);

	useEffect(() => {
		if (!kleurmenuOpen) return;
		const bijKlik = (gebeurtenis: PointerEvent) => {
			if (gebeurtenis.target instanceof Node && !balk.current?.contains(gebeurtenis.target)) onKleurmenu(false);
		};
		document.addEventListener('pointerdown', bijKlik);
		return () => document.removeEventListener('pointerdown', bijKlik);
	}, [kleurmenuOpen]);

	const knopElementen = () => [...(balk.current?.querySelectorAll<HTMLButtonElement>('.werkbalk-knop:not(:disabled)') ?? [])];

	const bijToets = (gebeurtenis: KeyboardEvent) => {
		if (gebeurtenis.key === 'Escape') {
			gebeurtenis.preventDefault();
			gebeurtenis.stopPropagation();
			onKleurmenu(false);
			onTerugNaarEditor();
			return;
		}
		const inMenu = gebeurtenis.target instanceof Node && menu.current?.contains(gebeurtenis.target) === true;
		const regels = inMenu ? menuregels(menu.current) : knopElementen();
		const toetsen = inMenu ? ['ArrowDown', 'ArrowUp', 'Home', 'End'] : ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
		if (!toetsen.includes(gebeurtenis.key)) return;
		const huidig = regels.findIndex((regel) => regel === gebeurtenis.target);
		if (huidig === -1) return;
		gebeurtenis.preventDefault();
		regels[rasterStop(huidig, regels.length, inMenu ? 1 : regels.length, gebeurtenis.key) ?? huidig]?.focus();
	};

	const bijToetsOpKleur = (gebeurtenis: KeyboardEvent) => {
		if (gebeurtenis.key !== 'ArrowDown') return;
		gebeurtenis.preventDefault();
		onKleurmenu(true);
	};

	const bijFocusIn = (gebeurtenis: FocusEvent) => {
		const doel = gebeurtenis.target;
		if (!(doel instanceof HTMLElement)) return;
		const naam = KNOPPEN.find((kandidaat) => kandidaat === doel.dataset['knop']);
		if (naam !== undefined) zetTabstop(naam);
	};

	const bijFocusWeg = (gebeurtenis: FocusEvent) => {
		if (gebeurtenis.relatedTarget instanceof Node && !balk.current?.contains(gebeurtenis.relatedTarget)) onKleurmenu(false);
	};

	const titel = (naam: KnopNaam, omschrijving: string): string => {
		const knop = toestand[naam];
		if (isUitgeschakeld(knop)) return knop.reden;
		const sneltoets = naam === 'markeren' ? null : sneltoetsTekst(naam, mac);
		return sneltoets === null ? omschrijving : `${omschrijving} (${sneltoets})`;
	};

	/** `leesnaam` is de naam voor schermlezers als de knop alleen een letter toont; staat er tekst op, dan is `null` genoeg. */
	const gewoneKnop = (naam: Exclude<KnopNaam, 'kleur'>, omschrijving: string, leesnaam: string | null, inhoud: ComponentChildren) => {
		const knop = toestand[naam];
		return (
			<button
				type="button"
				class="werkbalk-knop"
				data-knop={naam}
				aria-label={leesnaam ?? undefined}
				aria-pressed={knop.soort === 'aan'}
				disabled={isUitgeschakeld(knop)}
				tabIndex={naam === huidigeTabstop ? 0 : -1}
				title={titel(naam, omschrijving)}
				onClick={() => onActie({ soort: naam })}
			>
				{inhoud}
			</button>
		);
	};

	const kleurKnop = toestand.kleur;
	const actieveKleur = toestand.actieveKleur;
	const actieveNaam = actieveKleur === null ? null : actieveKleur === 'gemengd' ? 'meer dan één kleur' : kleurNaam(actieveKleur, stijlen);

	return (
		<div
			ref={balk}
			class="werkbalk"
			role="toolbar"
			aria-label="Opmaak"
			data-help="opmaakwerkbalk"
			onMouseDown={(gebeurtenis) => gebeurtenis.preventDefault()}
			onKeyDown={bijToets}
			onFocusIn={bijFocusIn}
			onFocusOut={bijFocusWeg}
		>
			{gewoneKnop('vet', 'Vet', 'Vet', <strong>B</strong>)}
			{gewoneKnop('onderstreept', 'Onderstreept', 'Onderstreept', <span style={{ textDecoration: 'underline' }}>U</span>)}
			{gewoneKnop(
				'markeren',
				'Markeren',
				null,
				<span class="werkbalk-markering" style={tekststukOpmaakstijl({ soort: 'tekst', tekst: '', opmaak: ['highlight'] }, stijlen)}>
					Markeren
				</span>,
			)}
			<span class="werkbalk-kleur">
				<button
					type="button"
					class="werkbalk-knop"
					data-knop="kleur"
					aria-haspopup="menu"
					aria-expanded={kleurmenuOpen}
					disabled={isUitgeschakeld(kleurKnop)}
					tabIndex={huidigeTabstop === 'kleur' ? 0 : -1}
					title={`${titel('kleur', 'Kleur kiezen')}${actieveNaam === null || isUitgeschakeld(kleurKnop) ? '' : `. Nu: ${actieveNaam}`}`}
					onClick={() => onKleurmenu(!kleurmenuOpen)}
					onKeyDown={bijToetsOpKleur}
				>
					{actieveKleur !== null && actieveKleur !== 'gemengd' && (
						<span class="werkbalk-kleurvlak" style={{ backgroundColor: kleurvlak(actieveKleur, stijlen) }} aria-hidden="true" />
					)}
					Kleur ▾
				</button>
				{kleurmenuOpen && (
					<div class="werkbalk-menu" role="menu" aria-label="Kleur" ref={menu}>
						{KLEUREN.map((kleur) => (
							<button
								type="button"
								role="menuitemradio"
								class="werkbalk-menuregel"
								aria-checked={actieveKleur === kleur}
								tabIndex={-1}
								onClick={() => onActie({ soort: 'kleur', kleur })}
							>
								<span class="werkbalk-kleurvlak" style={{ backgroundColor: kleurvlak(kleur, stijlen) }} aria-hidden="true" />
								{kleurNaam(kleur, stijlen)}
							</button>
						))}
						<button
							type="button"
							role="menuitemradio"
							class="werkbalk-menuregel"
							aria-checked={actieveKleur === null}
							tabIndex={-1}
							onClick={() => onActie({ soort: 'kleur', kleur: null })}
						>
							<span class="werkbalk-kleurvlak werkbalk-kleurvlak-geen" aria-hidden="true" />
							Geen kleur
						</button>
					</div>
				)}
			</span>
			{gewoneKnop('wissen', 'Opmaak wissen', null, 'Opmaak wissen')}
		</div>
	);
}
