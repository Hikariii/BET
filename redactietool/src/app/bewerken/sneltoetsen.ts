type Sneltoets = 'vet' | 'onderstreept' | 'kleur' | 'wissen';

type ToetsPerPlatform = { mac: string; overig: string };

/** Op een Mac neemt Spotlight Cmd+Spatie, daarom wist daar Cmd+\ (zie `versEditorToetsen`). */
const TOETSEN: Record<Sneltoets, ToetsPerPlatform> = {
	vet: { mac: '⌘B', overig: 'Ctrl+B' },
	onderstreept: { mac: '⌘U', overig: 'Ctrl+U' },
	kleur: { mac: '⌥K', overig: 'Alt+K' },
	wissen: { mac: '⌘\\', overig: 'Ctrl+Spatie' },
};

/** Draait de tool op een Mac: dan heet Ctrl in de sneltoetsen ⌘. */
export function opMac(): boolean {
	return /Mac/.test(navigator.userAgent);
}

export function sneltoetsTekst(naam: Sneltoets, mac: boolean): string {
	return mac ? TOETSEN[naam].mac : TOETSEN[naam].overig;
}
