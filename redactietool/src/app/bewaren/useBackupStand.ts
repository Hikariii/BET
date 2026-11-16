import { useMemo } from 'preact/hooks';
import type { BewaardOverzicht } from '../../bewaren/overzicht';
import { ruweBrowseropslag } from '../bewerken/useTussenstand';
import { backupHerinnering, laatsteBackupRegel } from './backupTekst';
import { leesLaatsteBackup } from './laatsteBackup';
import { useOpslagTeller } from './useOpslagTeller';

export type BackupStand = {
	/** "Laatste back-up: nooit" of "Laatste back-up: gisteren". */
	regel: string;
	/** De zachte herinnering, of `null` als een back-up nog niet hoeft. */
	herinnering: string | null;
};

/** Wanneer de laatste back-up van het boek was en of het tijd is voor een nieuwe; leest opnieuw na elke wijziging in de opslag. */
export function useBackupStand(boekId: string, overzicht: BewaardOverzicht): BackupStand {
	const opslagTeller = useOpslagTeller();
	return useMemo(() => {
		const laatsteBackup = leesLaatsteBackup(ruweBrowseropslag(), boekId);
		const nu = new Date();
		return { regel: laatsteBackupRegel(laatsteBackup, nu), herinnering: backupHerinnering(overzicht, laatsteBackup, nu) };
	}, [boekId, overzicht, opslagTeller]);
}
