/** Laat de browser de waarde als JSON-bestand downloaden. */
export function downloadAlsJson(bestandsnaam: string, uitvoer: unknown): void {
	const bestand = new Blob([`${JSON.stringify(uitvoer, null, 2)}\n`], { type: 'application/json' });
	const adres = URL.createObjectURL(bestand);
	const koppeling = document.createElement('a');
	koppeling.href = adres;
	koppeling.download = bestandsnaam;
	document.body.append(koppeling);
	koppeling.click();
	koppeling.remove();
	URL.revokeObjectURL(adres);
}
