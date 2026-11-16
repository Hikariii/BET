import type { BoekData, Referentie } from '../../data/types';
import { laadHoofdstukkenEenmalig } from '../bewaren/useBewaardOverzicht';
import { useLaden } from '../hooks';
import { boekPlekken, type BoekPlek } from './boekplekken';

/** Het hoofdstuk dat per boek het laatst open stond. Het scherm Keuzes en vragen is een andere pagina dan een hoofdstuk, dus de stand moet de wissel van pagina overleven. */
const laatsteHoofdstukPerBoek = new Map<string, number>();

/**
 * De plekken in het boek met hun aantallen. De hoofdstukken laden één keer voor de hele sessie (dezelfde als bij de bewaarstatus),
 * want het aantal open vragen komt mede uit de logs.
 */
export function useBoekPlekken(boek: BoekData, referentie: Referentie, huidigHoofdstuk: number | null): BoekPlek[] {
	const hoofdstukken = useLaden(() => laadHoofdstukkenEenmalig(boek), [boek.id]);
	if (huidigHoofdstuk !== null) laatsteHoofdstukPerBoek.set(boek.id, huidigHoofdstuk);
	return boekPlekken(boek.id, referentie, hoofdstukken.soort === 'klaar' ? hoofdstukken.waarde : null, laatsteHoofdstukPerBoek.get(boek.id) ?? 1);
}
