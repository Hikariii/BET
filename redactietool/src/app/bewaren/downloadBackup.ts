import { maakBackup } from '../../bewaren/backup';
import type { BoekData } from '../../data/types';
import { browseropslag, ruweBrowseropslag } from '../bewerken/useTussenstand';
import { downloadAlsJson } from '../downloadBestand';
import { backupBestandsnaamMetTijd } from './backupTekst';
import { bewaarLaatsteBackup } from './laatsteBackup';

/** Laat de browser de back-up van het boek downloaden, onthoudt het moment en geeft de bestandsnaam terug. De naam heeft datum en tijd; bij het inladen telt alleen de inhoud. */
export function downloadBackup(boek: BoekData): string {
	const nu = new Date();
	const bestandsnaam = backupBestandsnaamMetTijd(boek.id, nu);
	downloadAlsJson(bestandsnaam, maakBackup(ruweBrowseropslag(), boek, __REPO_COMMIT__, nu));
	bewaarLaatsteBackup(browseropslag(), boek.id, nu);
	return bestandsnaam;
}
