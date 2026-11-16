import type { ComponentChildren } from 'preact';
import type { BoekPlek, Plek } from '../navigatie/boekplekken';
import './boekplekken.css';

type Props = {
	boekNaam: string;
	plekken: readonly BoekPlek[];
	/** De plek die open staat; `null` op de pagina Bewaard of een onbekend adres. */
	huidig: Plek | null;
	/** `tabbladen`: de volledige namen. `werkbalk`: een pictogram met een kort woord, de volledige naam als tooltip en voor schermlezers. */
	vorm: 'tabbladen' | 'werkbalk';
};

/** Alleen bij de vragen telt een getal mee in de balk; de andere aantallen staan op het scherm zelf. */
function toonAantal(plek: BoekPlek): number | null {
	return plek.plek === 'vragen' && plek.aantal !== null ? plek.aantal.getal : null;
}

const LIJNEN: Record<Plek, string> = {
	hoofdstukken: 'M3 5.5c2-1 4.5-1 7 .5 2.5-1.5 5-1.5 7-.5v10c-2-1-4.5-1-7 .5-2.5-1.5-5-1.5-7-.5z M10 6v10',
	besloten: 'M8 6h9 M8 10h9 M8 14h9 M3 6l1 1 2-2 M3 10l1 1 2-2 M3 14l1 1 2-2',
	gevonden: 'M3 7h12 M12 4l3 3-3 3 M17 13H5 M8 10l-3 3 3 3',
	vragen: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M8 8c0-1.2.9-2 2-2s2 .8 2 2c0 1.5-2 1.7-2 3.2 M10 14v.5',
	vervangen: 'M9 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12.8 12.8l4.2 4.2',
};

function PlekIcoon({ plek }: { plek: Plek }) {
	return (
		<svg class="boekplek-icoon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
			<path d={LIJNEN[plek]} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	);
}

function Inhoud({ plek, vorm }: { plek: BoekPlek; vorm: Props['vorm'] }): ComponentChildren {
	const aantal = toonAantal(plek);
	const aantalTekst =
		aantal === null ? null : (
			<span class="boekplek-aantal">
				{aantal}
				<span class="alleen-lezers"> open</span>
			</span>
		);
	if (vorm === 'tabbladen') {
		return (
			<>
				{plek.naam}
				{aantalTekst}
			</>
		);
	}
	return (
		<>
			<PlekIcoon plek={plek.plek} />
			<span aria-hidden="true">{plek.kort}</span>
			<span class="alleen-lezers">{plek.naam}</span>
			{aantalTekst}
		</>
	);
}

/** De plekken in een boek als links naast elkaar in de boekbalk; de open plek heeft `aria-current="page"`. */
export function BoekTabbladen({ boekNaam, plekken, huidig, vorm }: Props) {
	return (
		<nav class={`boekplekken boekplekken-${vorm}`} aria-label={`Plekken in ${boekNaam}`}>
			<ul>
				{plekken.map((plek) => (
					<li>
						<a
							class="boekplek"
							href={plek.adres}
							aria-current={plek.plek === huidig ? 'page' : undefined}
							title={vorm === 'werkbalk' ? [plek.naam, plek.aantal?.tekst].filter((deel) => deel !== undefined).join(', ') : undefined}
						>
							<Inhoud plek={plek} vorm={vorm} />
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
