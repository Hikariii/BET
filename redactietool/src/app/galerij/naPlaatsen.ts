import type { NaPlaatsen } from './VersVoorbeeld';

/** Klapt "nog N regels" uit zoals een klik van de redacteur dat doet. */
export const klapRegelsUit: NaPlaatsen = (tabel) => {
	tabel.querySelector<HTMLButtonElement>('button.meerregels')?.click();
};

/** Opent het blok met de vertaalvraag. */
export const openVraag: NaPlaatsen = (tabel) => {
	for (const vraag of tabel.querySelectorAll('details.vraag')) vraag.setAttribute('open', '');
};

/**
 * Wijzigt de tekst in de open editor, zodat de editor bewaart en de opslag de fout geeft.
 * ProseMirror leest de wijziging uit de pagina, net als bij typen.
 */
export const wijzigTekstInEditor: NaPlaatsen = (tabel) => {
	requestAnimationFrame(() => {
		const tekst = tabel.querySelector('.ProseMirror span')?.firstChild;
		if (tekst instanceof Text) tekst.data += ' ';
	});
};
