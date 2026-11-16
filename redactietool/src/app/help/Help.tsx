import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData } from '../../data/types';
import type { BoekPlek } from '../navigatie/boekplekken';
import { Helpvenster } from './Helpvenster';
import { paginaOnderdeel, type HelpOnderdeel, type HelpPlek } from './onderdelen';
import { isHelpToets } from './toets';
import './help.css';

type Props = {
	boek: BoekData;
	/** De pagina waar de lezer is; de help opent bij het onderdeel van die pagina. */
	plek: HelpPlek;
	plekken: readonly BoekPlek[];
};

/** Een modale dialoog die al open staat, bijvoorbeeld Back-up inladen: dan opent `?` de help niet erbovenop. */
function dialoogOpen(): boolean {
	return document.querySelector('dialog[open]') !== null;
}

/**
 * De knop Help in de boekbalk en het helpvenster. De toets `?` opent hem ook, behalve in een invoerveld of de editor.
 * Na sluiten staat de focus weer op de knop; als de lezer een onderdeel liet aanwijzen, meldt een statusregel voor schermlezers welk.
 */
export function Help({ boek, plek, plekken }: Props) {
	const [begin, zetBegin] = useState<HelpOnderdeel | null>(null);
	const [melding, zetMelding] = useState('');
	const knop = useRef<HTMLButtonElement>(null);
	const open = begin !== null;

	useEffect(() => {
		const bijToets = (gebeurtenis: KeyboardEvent) => {
			const doel = gebeurtenis.target instanceof HTMLElement ? gebeurtenis.target : null;
			if (open || dialoogOpen() || !isHelpToets({ key: gebeurtenis.key, ctrlKey: gebeurtenis.ctrlKey, metaKey: gebeurtenis.metaKey, altKey: gebeurtenis.altKey, doel })) return;
			gebeurtenis.preventDefault();
			zetBegin(paginaOnderdeel(plek));
		};
		window.addEventListener('keydown', bijToets);
		return () => window.removeEventListener('keydown', bijToets);
	}, [open, plek]);

	const sluit = (aangewezen: string | null) => {
		zetBegin(null);
		zetMelding(aangewezen === null ? '' : `Aangewezen: ${aangewezen}.`);
		knop.current?.focus();
	};

	return (
		<>
			<button
				ref={knop}
				type="button"
				class="helpknop"
				aria-haspopup="dialog"
				aria-keyshortcuts="?"
				title="Uitleg bij deze pagina (toets ?)"
				onClick={() => zetBegin(paginaOnderdeel(plek))}
			>
				Help
			</button>
			<span class="alleen-lezers" role="status">
				{melding}
			</span>
			{begin !== null && <Helpvenster boek={boek} plek={plek} plekken={plekken} begin={begin} onSluit={sluit} />}
		</>
	);
}
