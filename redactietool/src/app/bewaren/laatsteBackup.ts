import type { Opslag } from '../../bewerken/tussenstand';

/** De sleutel waaronder de browser onthoudt wanneer de laatste back-up van een boek gedownload is. */
export function laatsteBackupSleutel(boek: string): string {
	return `bet-laatste-backup/${boek}`;
}

/** De ISO-tijd van de laatste back-up van het boek; `null` als er nog geen is of de bewaarde waarde geen tijd is. */
export function leesLaatsteBackup(opslag: Opslag, boek: string): string | null {
	try {
		const tijd = opslag.getItem(laatsteBackupSleutel(boek));
		return tijd !== null && !Number.isNaN(Date.parse(tijd)) ? tijd : null;
	} catch {
		return null;
	}
}

/** Onthoudt dat de back-up van het boek op `moment` gedownload is; een weigerende opslag (privémodus, vol) laat de back-up zelf ongemoeid. */
export function bewaarLaatsteBackup(opslag: Opslag, boek: string, moment: Date): void {
	try {
		opslag.setItem(laatsteBackupSleutel(boek), moment.toISOString());
	} catch {
		return;
	}
}
