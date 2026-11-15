import { createContext } from 'preact';
import { useContext, useEffect, useId, useRef, useState } from 'preact/hooks';
import type { WordStijl } from '../../data/types';
import { VersTekst } from '../VersTekst';
import type { VersVoorproef } from './versVoorproef';
import './versvoorproef.css';

/** Wat de verslinks nodig hebben om een vers te tonen bij aanwijzen; zonder aanbieder tonen ze gewone links. */
export type Voorproefbron = {
	boekNaam: string;
	stijlen: readonly WordStijl[];
	zoek: (hoofdstuk: number, vers: number) => VersVoorproef | null;
};

export const VoorproefContext = createContext<Voorproefbron | null>(null);

/** Wachttijd voordat het vak verschijnt, zodat langs de links bewegen niet flikkert. */
const VERTRAGING_MS = 150;
const BREEDTE_PX = 520;
const MARGE_PX = 8;

type Plek = { links: number; boven: number | null; onder: number | null };

/** Onder de link als daar plaats is, anders erboven; nooit buiten het venster. */
function plekBij(link: HTMLElement): Plek {
	const rechthoek = link.getBoundingClientRect();
	const links = Math.max(MARGE_PX, Math.min(rechthoek.left, window.innerWidth - BREEDTE_PX - MARGE_PX));
	const ruimteOnder = window.innerHeight - rechthoek.bottom;
	return ruimteOnder > 260
		? { links, boven: rechthoek.bottom + 6, onder: null }
		: { links, boven: null, onder: window.innerHeight - rechthoek.top + 6 };
}

type Props = {
	adres: string;
	hoofdstuk: number;
	vers: number;
};

/** Een verslink die bij aanwijzen of toetsenbordfocus het vers toont (vereenvoudiging en bron), zonder weg te navigeren. */
export function VersLinkMetVoorproef({ adres, hoofdstuk, vers }: Props) {
	const bron = useContext(VoorproefContext);
	const id = useId();
	const [plek, zetPlek] = useState<Plek | null>(null);
	const wachten = useRef<number | null>(null);
	useEffect(() => () => {
		if (wachten.current !== null) window.clearTimeout(wachten.current);
	}, []);
	const label = `${hoofdstuk}:${vers}`;
	if (bron === null) return <a href={adres}>{label}</a>;

	const toon = (gebeurtenis: Event) => {
		const link = gebeurtenis.currentTarget as HTMLElement;
		if (wachten.current !== null) window.clearTimeout(wachten.current);
		wachten.current = window.setTimeout(() => zetPlek(plekBij(link)), VERTRAGING_MS);
	};
	const verberg = () => {
		if (wachten.current !== null) window.clearTimeout(wachten.current);
		zetPlek(null);
	};
	const voorproef = plek === null ? null : bron.zoek(hoofdstuk, vers);

	return (
		<>
			<a
				href={adres}
				onMouseEnter={toon}
				onMouseLeave={verberg}
				onFocus={toon}
				onBlur={verberg}
				onKeyDown={(gebeurtenis) => gebeurtenis.key === 'Escape' && verberg()}
				aria-describedby={voorproef === null ? undefined : id}
			>
				{label}
			</a>
			{plek !== null && voorproef !== null && (
				<div
					id={id}
					role="tooltip"
					class="versvoorproef"
					style={{
						left: `${plek.links}px`,
						top: plek.boven === null ? undefined : `${plek.boven}px`,
						bottom: plek.onder === null ? undefined : `${plek.onder}px`,
					}}
				>
					<p class="versvoorproef-kop">
						{bron.boekNaam} {label}
						{voorproef.bewerkt && <span class="versvoorproef-bewerkt"> · bewerkt in de tool</span>}
					</p>
					<div class="versvoorproef-tekst">
						<VersTekst delen={voorproef.vereenvoudigd.delen} stijlen={bron.stijlen} />
					</div>
					{voorproef.bron !== null && (
						<div class="versvoorproef-bron">
							<p class="versvoorproef-label">Bron</p>
							<VersTekst delen={voorproef.bron.delen} stijlen={bron.stijlen} />
						</div>
					)}
				</div>
			)}
		</>
	);
}
