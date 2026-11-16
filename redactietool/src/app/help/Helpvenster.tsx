import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData } from '../../data/types';
import { Markdownweergave } from '../Markdownweergave';
import { BEWAARD_NAAM, PLEKNAAM, type BoekPlek } from '../navigatie/boekplekken';
import { helpnamen, helptekst, splitsBlokken, titelVan, type Helpblok } from './helptekst';
import { Legenda } from './Legenda';
import { HELP_PLEKKEN, paginaOnderdeel, type HelpOnderdeel, type HelpPlek } from './onderdelen';
import { Voorbeeld, type VoorbeeldContext } from './Voorbeeld';
import { laatOplichten, vindHelpElement } from './wijsAan';
import './help.css';

type Props = {
	boek: BoekData;
	/** De pagina waar de help vanaf geopend is; die staat bovenaan als "Deze pagina". */
	plek: HelpPlek;
	plekken: readonly BoekPlek[];
	/** Het onderdeel waarmee het venster opent. */
	begin: HelpOnderdeel;
	/** Sluit het venster; `aangewezen` is de naam van het onderdeel dat de lezer liet oplichten. */
	onSluit: (aangewezen: string | null) => void;
};

function plekNaam(plek: HelpPlek): string {
	return plek === 'bewaard' ? BEWAARD_NAAM : PLEKNAAM[plek];
}

type WijsRijProps = { blok: Extract<Helpblok, { soort: 'wijs' }>; context: VoorbeeldContext; onWijs: (sleutel: string, naam: string) => boolean };

/** Een onderdeel van de pagina: het voorbeeld, de naam, waar het staat en de knop "Wijs aan". */
function WijsRij({ blok, context, onWijs }: WijsRijProps) {
	const [nietGevonden, zetNietGevonden] = useState(false);
	return (
		<div class="help-wijsrij">
			<Voorbeeld sleutel={blok.sleutel} naam={blok.naam} context={context} />
			<div class="help-wijstekst">
				<strong>{blok.naam}</strong>
				<span>{blok.waar}</span>
				{nietGevonden && <span role="status">Dit staat niet op de pagina waar je nu bent.</span>}
			</div>
			<button type="button" aria-label={`Wijs aan: ${blok.naam}`} onClick={() => zetNietGevonden(!onWijs(blok.sleutel, blok.naam))}>
				Wijs aan
			</button>
		</div>
	);
}

/**
 * Het helpvenster: een modale `<dialog>` met links de onderdelen en rechts de tekst.
 * Escape en een klik naast het venster sluiten het; de aanroeper zet de focus terug.
 */
export function Helpvenster({ boek, plek, plekken, begin, onSluit }: Props) {
	const [onderdeel, zetOnderdeel] = useState<HelpOnderdeel>(begin);
	const venster = useRef<HTMLDialogElement>(null);
	const inhoud = useRef<HTMLDivElement>(null);
	const aangewezen = useRef<string | null>(null);

	useEffect(() => {
		const dialoog = venster.current;
		if (dialoog === null) return;
		dialoog.showModal();
		inhoud.current?.focus();
	}, []);

	const kies = (volgende: HelpOnderdeel) => {
		zetOnderdeel(volgende);
		if (inhoud.current !== null) {
			inhoud.current.scrollTop = 0;
			inhoud.current.focus();
		}
	};

	const wijs = (sleutel: string, naam: string): boolean => {
		const element = vindHelpElement(sleutel);
		if (element === null) return false;
		aangewezen.current = naam;
		venster.current?.close();
		laatOplichten(element);
		return true;
	};

	const namen = helpnamen(boek);
	const context: VoorbeeldContext = { boek, plekken };
	const blokken = splitsBlokken(helptekst(onderdeel), namen);

	const knop = (id: HelpOnderdeel, tekst: string) => (
		<li>
			<button type="button" class="help-onderdeel" aria-current={id === onderdeel ? 'true' : undefined} onClick={() => kies(id)}>
				{tekst}
			</button>
		</li>
	);
	const anderePlekken = HELP_PLEKKEN.filter((kandidaat) => kandidaat !== plek);

	return (
		<dialog
			ref={venster}
			class="helpvenster"
			aria-labelledby="help-titel"
			onClose={() => onSluit(aangewezen.current)}
			onClick={(gebeurtenis) => {
				if (gebeurtenis.target === gebeurtenis.currentTarget) venster.current?.close();
			}}
		>
			<div class="helpvenster-kop">
				<h2 id="help-titel">Help</h2>
				<button type="button" onClick={() => venster.current?.close()}>
					Sluiten
				</button>
			</div>
			<div class="helpvenster-lijf">
				<nav class="helpnav" aria-label="Onderdelen van de help">
					<ul>
						{knop('snel-aan-de-slag', titelVan('snel-aan-de-slag', namen))}
						{knop('hoofdmenu', titelVan('hoofdmenu', namen))}
						{knop(paginaOnderdeel(plek), `Deze pagina: ${plekNaam(plek)}`)}
					</ul>
					<p class="helpnav-kop">Andere pagina's</p>
					<ul>{anderePlekken.map((andere) => knop(paginaOnderdeel(andere), plekNaam(andere)))}</ul>
					<ul class="helpnav-onder">
						{knop('bewaren-en-laden', titelVan('bewaren-en-laden', namen))}
						{knop('terugvoeren', titelVan('terugvoeren', namen))}
						{knop('kleuren', titelVan('kleuren', namen))}
					</ul>
				</nav>
				<div class="helpinhoud" ref={inhoud} tabIndex={-1}>
					{blokken.map((blok) => {
						switch (blok.soort) {
							case 'markdown':
								return <Markdownweergave markdown={blok.markdown} />;
							case 'legenda':
								return <Legenda boek={boek} />;
							case 'wijs':
								return <WijsRij blok={blok} context={context} onWijs={wijs} />;
						}
					})}
				</div>
			</div>
		</dialog>
	);
}
