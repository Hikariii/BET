import type { HoofdstukInfo } from '../../data/types';
import { versAdres } from '../adres';
import { kortHoofdstukLabel } from './hoofdstukLabel';
import './navigatie.css';

type Props = {
	boek: string;
	hoofdstuk: HoofdstukInfo;
	aantalOpenVragen: number;
	huidig: boolean;
	/** Het statuswoord naast het nummer; `null` als het hier niets toevoegt. */
	statusWoord: string | null;
	/** Het ene hoofdstuk in de strip dat met Tab te bereiken is; de rest bereik je met de pijltjestoetsen. */
	tabstop: boolean;
};

/** Een hoofdstuk in het kort: nummer, vinkje als het goedgekeurd is en het aantal open vragen (`1 ✓ 3?`). Schermlezers krijgen de volledige naam. */
export function KortHoofdstuk({ boek, hoofdstuk, aantalOpenVragen, huidig, statusWoord, tabstop }: Props) {
	return (
		<a
			class="hoofdstuk-kort"
			href={versAdres(boek, hoofdstuk.nummer)}
			tabIndex={tabstop ? 0 : -1}
			aria-current={huidig ? 'page' : undefined}
			aria-label={kortHoofdstukLabel(hoofdstuk, aantalOpenVragen)}
			title={kortHoofdstukLabel(hoofdstuk, aantalOpenVragen)}
		>
			<span class="hoofdstuk-kort-nummer" aria-hidden="true">
				{hoofdstuk.nummer}
			</span>
			<span class="hoofdstuk-kort-vinkje" aria-hidden="true">
				{hoofdstuk.status === 'goedgekeurd' ? '✓' : ''}
			</span>
			{statusWoord !== null && (
				<span class="hoofdstuk-kort-status" aria-hidden="true">
					{statusWoord}
				</span>
			)}
			<span class="hoofdstuk-kort-vragen" aria-hidden="true">
				{aantalOpenVragen > 0 ? `${aantalOpenVragen}?` : ''}
			</span>
		</a>
	);
}
