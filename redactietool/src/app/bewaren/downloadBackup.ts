import { backupBestandsnaam, maakBackup } from '../../bewaren/backup';
import type { BoekData } from '../../data/types';
import { ruweBrowseropslag } from '../bewerken/useTussenstand';
import { downloadAlsJson } from '../downloadBestand';

/** Laat de browser de back-up van het boek downloaden en geeft de bestandsnaam terug. */
export function downloadBackup(boek: BoekData): string {
	const bestandsnaam = backupBestandsnaam(boek.id);
	downloadAlsJson(bestandsnaam, maakBackup(ruweBrowseropslag(), boek, __REPO_COMMIT__, new Date()));
	return bestandsnaam;
}
