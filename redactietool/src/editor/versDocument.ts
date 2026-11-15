import type { Node } from 'prosemirror-model';
import { ALINEASTIJLEN, OPMAAK_VOLGORDE, type Alineastijl, type Opmaak, type Tekststuk } from '../formaat/types';
import type { VersAlineadeel, VersInhoud } from '../bewerken/types';
import { schema } from './schema';

/** Zet de inhoud van één vers om in een document met één alinea per deel. */
export function versInhoudNaarDocument(inhoud: VersInhoud): Node {
	const alineas = inhoud.delen.map((deel) =>
		schema.nodes['alinea']!.create(
			{ stijl: deel.stijl },
			deel.stukken.map((stuk) =>
				schema.text(
					stuk.tekst,
					stuk.opmaak.map((opmaak) => schema.marks[opmaak]!.create()),
				),
			),
		),
	);
	const document = schema.nodes['doc']!.create(null, alineas);
	document.check();
	return document;
}

function opmaakVan(naam: string): Opmaak {
	const opmaak = OPMAAK_VOLGORDE.find((kandidaat) => kandidaat === naam);
	if (opmaak === undefined) throw new Error(`onbekende mark '${naam}'`);
	return opmaak;
}

function stijlVan(waarde: unknown): Alineastijl | null {
	if (waarde === null) return null;
	const stijl = ALINEASTIJLEN.find((naam) => naam === waarde);
	if (stijl === undefined) throw new Error(`onbekende alineastijl '${String(waarde)}'`);
	return stijl;
}

function deelVan(alinea: Node): VersAlineadeel {
	const stukken: Tekststuk[] = [];
	alinea.forEach((kind) => {
		if (!kind.isText) throw new Error(`een vers bevat geen '${kind.type.name}'`);
		stukken.push({ soort: 'tekst', tekst: kind.text ?? '', opmaak: kind.marks.map((mark) => opmaakVan(mark.type.name)) });
	});
	return { stijl: stijlVan(alinea.attrs['stijl']), stukken };
}

/** Zet het document van de vers-editor terug in de inhoud van een vers, met evenveel delen. */
export function documentNaarVersInhoud(document: Node): VersInhoud {
	document.check();
	const delen: VersAlineadeel[] = [];
	document.forEach((alinea) => {
		if (alinea.type.name !== 'alinea') throw new Error(`een vers bevat geen '${alinea.type.name}'`);
		delen.push(deelVan(alinea));
	});
	return { delen };
}
