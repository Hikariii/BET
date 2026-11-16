import { backupBestandsnaam, maakBackup } from '../../bewaren/backup';
import type { BoekData } from '../../data/types';
import { browseropslag, ruweBrowseropslag } from '../bewerken/useTussenstand';
import { downloadAlsJson } from '../downloadBestand';
import { bewaarLaatsteBackup } from './laatsteBackup';

/** Laat de browser de back-up van het boek downloaden, onthoudt het moment en geeft de bestandsnaam terug. */
export function downloadBackup(boek: BoekData): string {
	const bestandsnaam = backupBestandsnaam(boek.id);
	const nu = new Date();
	downloadAlsJson(bestandsnaam, maakBackup(ruweBrowseropslag(), boek, __REPO_COMMIT__, nu));
	bewaarLaatsteBackup(browseropslag(), boek.id, nu);
	return bestandsnaam;
}
