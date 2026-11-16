import type { HoofdstukInfo } from '../../data/types';
import { versAdres } from '../adres';
import { kortHoofdstukLabel } from './hoofdstukLabel';
import './navigatie.css';

type Props = {
	boek: string;
	hoofdstuk: HoofdstukInfo;
	aantalOpenVragen: number;
	huidig: boolean;
	/** Het ene hoofdstuk in het raster dat met Tab te bereiken is; de rest bereik je met de pijltjestoetsen. */
	tabstop: boolean;
	/** Wordt aangeroepen als de lezer dit hoofdstuk kiest. */
	bijKies: () => void;
};

/**
 * Een hoofdstuk in het kort: nummer, vinkje als het goedgekeurd is en het aantal open vragen (`1 ✓ 3?`). Schermlezers krijgen de volledige naam.
 * Het hoofdstuk dat open staat is geen link: het is licht gemarkeerd, reageert niet op de muis en Enter doet er niets.
 * Het blijft wel een stop voor de focus, zodat het raster daar begint en de pijltjestoetsen vanaf daar lopen.
 */
export function HoofdstukCel({ boek, hoofdstuk, aantalOpenVragen, huidig, tabstop, bijKies }: Props) {
	const naam = kortHoofdstukLabel(hoofdstuk, aantalOpenVragen);
	const inhoud = (
		<>
			<span class="hoofdstuk-cel-nummer" aria-hidden="true">
				{hoofdstuk.nummer}
			</span>
			<span class="hoofdstuk-cel-vinkje" aria-hidden="true">
				{hoofdstuk.status === 'goedgekeurd' ? '✓' : ''}
			</span>
			<span class="hoofdstuk-cel-vragen" aria-hidden="true">
				{aantalOpenVragen > 0 ? `${aantalOpenVragen}?` : ''}
			</span>
		</>
	);
	if (huidig) {
		return (
			<span class="hoofdstuk-cel" tabIndex={tabstop ? 0 : -1} aria-current="page" aria-label={naam} role="link" aria-disabled="true" title={naam}>
				{inhoud}
			</span>
		);
	}
	return (
		<a class="hoofdstuk-cel" href={versAdres(boek, hoofdstuk.nummer)} tabIndex={tabstop ? 0 : -1} aria-label={naam} title={naam} onClick={bijKies}>
			{inhoud}
		</a>
	);
}
