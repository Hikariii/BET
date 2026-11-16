/** Het element waar een toetsaanslag op viel, voor zover de help erom geeft. */
export type ToetsDoel = { tagName: string; isContentEditable: boolean } | null;

type Toets = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; doel: ToetsDoel };

const INVOERVELDEN = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Een invoerveld of de editor: daar is `?` een teken dat de lezer typt. */
function isInvoer(doel: ToetsDoel): boolean {
	return doel !== null && (INVOERVELDEN.has(doel.tagName) || doel.isContentEditable);
}

/** Of deze toetsaanslag de help opent: een losse `?`, niet in een invoerveld of de editor. */
export function isHelpToets({ key, ctrlKey, metaKey, altKey, doel }: Toets): boolean {
	return key === '?' && !ctrlKey && !metaKey && !altKey && !isInvoer(doel);
}
