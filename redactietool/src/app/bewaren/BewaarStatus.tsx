import type { BoekData } from '../../data/types';
import { maakAdres } from '../adres';
import { BEWAARD_NAAM } from '../navigatie/boekplekken';
import { bewaarRegel, bewaarTelling } from './bewaarTekst';
import { useBackupStand } from './useBackupStand';
import { useBewaardOverzicht } from './useBewaardOverzicht';
import './bewaren.css';

type Props = {
	boek: BoekData;
	/** Of het overzicht open staat; dan is de link de huidige pagina. */
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

/** Laat zien dat en wat de browser bewaart, als link naar de pagina Opgeslagen; Back-up downloaden en inladen staan op die pagina. */
export function BewaarStatus({ boek, overzichtOpen }: Props) {
	const overzicht = useBewaardOverzicht(boek);
	const backup = useBackupStand(boek.id, overzicht);
	const regel = [bewaarRegel(overzicht), backup.regel, backup.herinnering].filter((deel) => deel !== null).join('. ');
	return (
		<a class="bewaarstatus bewaarstatus-pagina" href={maakAdres({ soort: 'bewaard', boek: boek.id })} aria-current={overzichtOpen ? 'page' : undefined} title={regel}>
			<OpslagIcoon />
			<span class="bewaarstatus-tekst">{BEWAARD_NAAM}: {bewaarTelling(overzicht)}</span>
			{backup.herinnering !== null && <span class="bewaarstatus-herinnering">Maak een back-up</span>}
			<span class="alleen-lezers">. {regel}</span>
		</a>
	);
}
