import type { BoekData, HoofdstukData, Referentie } from '../../data/types';

/** Wat elk tabblad van het scherm Begrippen krijgt: het hele boek, geladen. */
export type TabbladProps = {
	boek: BoekData;
	referentie: Referentie;
	hoofdstukken: readonly HoofdstukData[];
};
