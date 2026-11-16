import type { NaPlaatsen } from './VersVoorbeeld';

/** Wijst de cel Vertaalregels aan zoals de redacteur met de muis doet, zodat het vak uitklapt. */
export const wijsRegelsAan: NaPlaatsen = (tabel) => {
	tabel.querySelector('td.regels')?.dispatchEvent(new PointerEvent('pointerenter'));
};

/** Klikt de eerste verwijzing met dit opschrift, zoals de redacteur doet om de naslagkaart te openen. */
function klikVerwijzing(opschrift: (tekst: string) => boolean): NaPlaatsen {
	return (tabel) => {
		const knoppen = [...tabel.querySelectorAll<HTMLButtonElement>('button.verwijzing')];
		knoppen.find((knop) => opschrift(knop.textContent))?.click();
	};
}

export const openPrecedent = klikVerwijzing((tekst) => tekst === 'vertaalkeuze');

export const openParagraaf = klikVerwijzing((tekst) => tekst.startsWith('§'));

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
