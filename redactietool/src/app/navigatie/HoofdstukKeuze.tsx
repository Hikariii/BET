import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData, HoofdstukInfo, Referentie } from '../../data/types';
import { versAdres } from '../adres';
import { statusKlasse } from '../Zijbalk';
import { aantalOpenVragen } from '../vertaalvragen';
import { HoofdstukCel } from './HoofdstukCel';
import { rasterStop } from './toetsenbord';

/** Het aantal hoofdstukken per rij in het raster; de css leest hetzelfde getal uit `--kolommen`. */
const KOLOMMEN = 8;

type Props = {
	boek: BoekData;
	referentie: Referentie;
	/** Het hoofdstuk dat open staat. */
	info: HoofdstukInfo;
};

/**
 * De titel van het hoofdstuk met zijn status, als knop die een raster met alle hoofdstukken van het boek opent, en de knoppen Vorige en Volgende.
 * In het raster is het open hoofdstuk het ene tabstop: met de pijltjes, Home en End loop je langs de rest, Enter opent.
 * Het raster sluit met Escape (de focus gaat terug naar de titel), een klik buiten, Tab naar buiten, nog een klik op de titel of een gekozen hoofdstuk.
 */
export function HoofdstukKeuze({ boek, referentie, info }: Props) {
	const [open, zetOpen] = useState(false);
	const huidigeIndex = boek.hoofdstukken.findIndex((hoofdstuk) => hoofdstuk.nummer === info.nummer);
	const [tabstop, zetTabstop] = useState(huidigeIndex);
	const keuze = useRef<HTMLDivElement>(null);
	const knop = useRef<HTMLButtonElement>(null);
	const raster = useRef<HTMLUListElement>(null);
	const vorige = boek.hoofdstukken[huidigeIndex - 1] ?? null;
	const volgende = boek.hoofdstukken[huidigeIndex + 1] ?? null;

	const hoofdstukStops = () => [...(raster.current?.querySelectorAll<HTMLElement>('.hoofdstuk-cel') ?? [])];

	const openRaster = () => {
		zetTabstop(huidigeIndex);
		zetOpen(true);
	};

	const sluit = () => {
		zetOpen(false);
		knop.current?.focus();
	};

	useEffect(() => {
		if (open) hoofdstukStops()[huidigeIndex]?.focus();
	}, [open]);

	useEffect(() => zetOpen(false), [info.nummer]);

	useEffect(() => {
		if (!open) return;
		const bijKlik = (gebeurtenis: PointerEvent) => {
			if (gebeurtenis.target instanceof Node && !keuze.current?.contains(gebeurtenis.target)) zetOpen(false);
		};
		document.addEventListener('pointerdown', bijKlik);
		return () => document.removeEventListener('pointerdown', bijKlik);
	}, [open]);

	const bijToetsOpKnop = (gebeurtenis: KeyboardEvent) => {
		if (gebeurtenis.key !== 'ArrowDown') return;
		gebeurtenis.preventDefault();
		if (!open) openRaster();
	};

	const bijToetsInRaster = (gebeurtenis: KeyboardEvent) => {
		const links = hoofdstukStops();
		const volgendeStop = rasterStop(tabstop, links.length, KOLOMMEN, gebeurtenis.key);
		if (volgendeStop === null) return;
		gebeurtenis.preventDefault();
		links[volgendeStop]?.focus();
	};

	const bijEscape = (gebeurtenis: KeyboardEvent) => {
		if (!open || gebeurtenis.key !== 'Escape') return;
		gebeurtenis.preventDefault();
		sluit();
	};

	// Ook een klik zet de tabstop, zodat Shift+Tab terugkomt waar je was.
	const bijFocusInRaster = (gebeurtenis: FocusEvent) => {
		const index = hoofdstukStops().findIndex((link) => link === gebeurtenis.target);
		if (index >= 0) zetTabstop(index);
	};

	const bijFocusWeg = (gebeurtenis: FocusEvent) => {
		if (gebeurtenis.relatedTarget instanceof Node && !keuze.current?.contains(gebeurtenis.relatedTarget)) zetOpen(false);
	};

	return (
		<>
			<div class="hoofdstukkeuze" ref={keuze} onKeyDown={bijEscape} onFocusOut={bijFocusWeg}>
				<h1 class="bovenbalk-hoofdstuktitel">
					<button
						type="button"
						class="hoofdstukkeuze-knop"
						ref={knop}
						data-help="hoofdstukkeuze"
						aria-expanded={open}
						aria-controls="hoofdstukkeuze-raster"
						onClick={() => (open ? zetOpen(false) : openRaster())}
						onKeyDown={bijToetsOpKnop}
					>
						<span class="hoofdstukkeuze-naam">
							{boek.naam} {info.nummer}
						</span>
						<svg class="hoofdstukkeuze-pijl" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
							<path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
				</h1>
				<span data-help="hoofdstuk-status" class={`status status-${statusKlasse(info.status)}`} title={info.versie === '' ? info.status : `${info.status} ${info.versie}`}>
					{info.status}
				</span>
				{info.versie !== '' && <span class="versie">{info.versie}</span>}
				{open && (
					<nav class="hoofdstukkeuze-venster" aria-label={`Hoofdstukken van ${boek.naam}`}>
						<ul id="hoofdstukkeuze-raster" ref={raster} style={`--kolommen: ${KOLOMMEN}`} onKeyDown={bijToetsInRaster} onFocusIn={bijFocusInRaster}>
							{boek.hoofdstukken.map((hoofdstuk, index) => (
								<li>
									<HoofdstukCel
										boek={boek.id}
										hoofdstuk={hoofdstuk}
										aantalOpenVragen={aantalOpenVragen(referentie.openVragen, hoofdstuk.nummer)}
										huidig={hoofdstuk.nummer === info.nummer}
										tabstop={index === tabstop}
										bijKies={sluit}
									/>
								</li>
							))}
						</ul>
					</nav>
				)}
			</div>
			<span class="hoofdstuk-bladeren" data-help="hoofdstuk-bladeren">
				<BladerKnop boek={boek} hoofdstuk={vorige} richting="vorige" />
				<BladerKnop boek={boek} hoofdstuk={volgende} richting="volgende" />
			</span>
		</>
	);
}

type BladerKnopProps = {
	boek: BoekData;
	/** Het hoofdstuk waar de knop heen gaat; `null` aan het begin of eind van het boek, dan is de knop onzichtbaar maar houdt hij zijn plek. */
	hoofdstuk: HoofdstukInfo | null;
	richting: 'vorige' | 'volgende';
};

/** De tekst op de knop, bv. "‹ Hoofdstuk 3" of "Hoofdstuk 5 ›". */
function bladerTekst(richting: BladerKnopProps['richting'], nummer: string): string {
	return richting === 'vorige' ? `‹ Hoofdstuk ${nummer}` : `Hoofdstuk ${nummer} ›`;
}

/**
 * De knop is zo breed als de tekst met het langste hoofdstuknummer van het boek (onzichtbaar in `data-maat`, door de css onder de echte tekst gelegd),
 * zodat de titel en de knoppen niet verspringen tussen "Hoofdstuk 9" en "Hoofdstuk 10".
 */
export function BladerKnop({ boek, hoofdstuk, richting }: BladerKnopProps) {
	const breedsteNummer = String(Math.max(...boek.hoofdstukken.map((kandidaat) => kandidaat.nummer))).replace(/\d/g, '0');
	return (
		<button
			type="button"
			class={`hoofdstuk-blader${hoofdstuk === null ? ' hoofdstuk-blader-leeg' : ''}`}
			disabled={hoofdstuk === null}
			data-maat={bladerTekst(richting, breedsteNummer)}
			title={hoofdstuk === null ? undefined : `${boek.naam} ${hoofdstuk.nummer}`}
			onClick={() => hoofdstuk !== null && (window.location.hash = versAdres(boek.id, hoofdstuk.nummer))}
		>
			<span>{bladerTekst(richting, String(hoofdstuk?.nummer ?? ''))}</span>
		</button>
	);
}
