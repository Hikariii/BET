import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { BoekData } from '../../data/types';
import type { OntwerpConfig } from '../ontwerpProef';
import { maakAdres } from '../adres';
import { BackupInladen } from './BackupInladen';
import { bewaarRegel, bewaarTelling } from './bewaarTekst';
import { downloadBackup } from './downloadBackup';
import { useBewaardOverzicht } from './useBewaardOverzicht';
import './bewaren.css';

type Props = {
	boek: BoekData;
	/** `tekst`: de regel in de balk; `icoon`: een icoon met het venster; `pagina`: een link naar het overzicht; `kort`: dezelfde link als pictogram, "Bewaard" en het aantal verzen. */
	vorm: OntwerpConfig['status'];
	/** Of het overzicht open staat; dan is de link van vorm `pagina` de huidige pagina. */
	overzichtOpen: boolean;
};

function OpslagIcoon() {
	return (
		<svg class="bewaarstatus-icoon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
			<path d="M3 3h11l3 3v11H3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
			<path d="M6 3v5h7V3M6 17v-5h8v5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
		</svg>
	);
}

/**
 * Laat zien dat en wat de browser bewaart, met Back-up downloaden, Back-up inladen en het Overzicht.
 * De vormen `pagina` en `kort` zijn alleen een link; de acties staan dan op de overzichtspagina.
 */
export function BewaarStatus({ boek, vorm, overzichtOpen }: Props) {
	const overzicht = useBewaardOverzicht(boek);
	const regel = bewaarRegel(overzicht);
	const overzichtAdres = maakAdres({ soort: 'bewaard', boek: boek.id });

	if (vorm === 'kort') {
		return (
			<a class="bewaarstatus bewaarstatus-kort" href={overzichtAdres} aria-current={overzichtOpen ? 'page' : undefined} title={regel}>
				<OpslagIcoon />
				<span aria-hidden="true">Bewaard</span>
				<span class="bewaarstatus-aantal" aria-hidden="true">
					{overzicht.totaal.verzen}
				</span>
				<span class="alleen-lezers">Bewaard in deze browser. {regel}</span>
			</a>
		);
	}
	if (vorm === 'pagina') {
		return (
			<a class="bewaarstatus bewaarstatus-pagina" href={overzichtAdres} aria-current={overzichtOpen ? 'page' : undefined} title={regel}>
				<OpslagIcoon />
				<span class="bewaarstatus-tekst">Bewaard: {bewaarTelling(overzicht)}</span>
				<span class="alleen-lezers">. {regel}</span>
			</a>
		);
	}
	return <BewaarStatusMetVenster boek={boek} vorm={vorm} regel={regel} aantalVerzen={overzicht.totaal.verzen} overzichtAdres={overzichtAdres} />;
}

type VensterProps = {
	boek: BoekData;
	vorm: 'tekst' | 'icoon';
	regel: string;
	aantalVerzen: number;
	overzichtAdres: string;
};

function BewaarStatusMetVenster({ boek, vorm, regel, aantalVerzen, overzichtAdres }: VensterProps) {
	const [open, zetOpen] = useState(false);
	const [melding, zetMelding] = useState('');
	const wortel = useRef<HTMLDivElement>(null);
	const knop = useRef<HTMLButtonElement>(null);
	const invoer = useRef<HTMLInputElement>(null);
	const vensterId = useId();

	useEffect(() => {
		if (!open) return;
		const bijKlikBuiten = (gebeurtenis: MouseEvent) => {
			if (!wortel.current?.contains(gebeurtenis.target as Node)) zetOpen(false);
		};
		document.addEventListener('mousedown', bijKlikBuiten);
		return () => document.removeEventListener('mousedown', bijKlikBuiten);
	}, [open]);

	const sluitMetEscape = (gebeurtenis: KeyboardEvent) => {
		if (gebeurtenis.key !== 'Escape' || !open) return;
		gebeurtenis.stopPropagation();
		zetOpen(false);
		knop.current?.focus();
	};
	const sluitBijFocusWeg = (gebeurtenis: FocusEvent) => {
		const naar = gebeurtenis.relatedTarget;
		if (open && naar instanceof Node && !wortel.current?.contains(naar)) zetOpen(false);
	};

	const wissel = () => {
		zetMelding('');
		zetOpen(!open);
	};
	const download = () => zetMelding(`Back-up gedownload als ${downloadBackup(boek)}.`);
	const kiesBestand = () => {
		zetOpen(false);
		invoer.current?.click();
	};

	return (
		<div class={`bewaarstatus bewaarstatus-${vorm}`} ref={wortel} onKeyDown={sluitMetEscape} onFocusOut={sluitBijFocusWeg}>
			<button
				type="button"
				ref={knop}
				class="bewaarstatus-knop"
				aria-expanded={open}
				aria-controls={vensterId}
				aria-label={vorm === 'icoon' ? regel : undefined}
				title={regel}
				onClick={wissel}
			>
				{vorm === 'icoon' ? (
					<>
						<OpslagIcoon />
						<span class="bewaarstatus-aantal" aria-hidden="true">
							{aantalVerzen}
						</span>
					</>
				) : (
					<span class="bewaarstatus-tekst">{regel}</span>
				)}
			</button>
			<div id={vensterId} class="bewaarstatus-venster" role="group" aria-label="Bewaard in deze browser" hidden={!open}>
				<p class="bewaarstatus-uitleg">{regel}</p>
				<p class="bewaarstatus-acties">
					<button type="button" onClick={download}>
						Back-up downloaden
					</button>
					<button type="button" onClick={kiesBestand}>
						Back-up inladen
					</button>
					<a href={overzichtAdres} onClick={() => zetOpen(false)}>
						Overzicht
					</a>
				</p>
				<p class="bewaarstatus-melding" role="status">
					{melding}
				</p>
			</div>
			<BackupInladen boek={boek} focusNaSluiten={knop} invoer={invoer} />
		</div>
	);
}
