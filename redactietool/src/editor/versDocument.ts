import type { Node } from 'prosemirror-model';
import { ALINEASTIJLEN, isDomein, OPMAAK_VOLGORDE, type Alineastijl, type Opmaak, type Tekststuk } from '../formaat/types';
import type { VersAlineadeel, VersInhoud } from '../bewerken/types';
import { schema } from './schema';
import type { VetteOpmaak } from './vetteOpmaak';

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

export function alineastijlVan(waarde: unknown): Alineastijl | null {
	if (waarde === null) return null;
	const stijl = ALINEASTIJLEN.find((naam) => naam === waarde);
	if (stijl === undefined) throw new Error(`onbekende alineastijl '${String(waarde)}'`);
	return stijl;
}

/** Eén teken met de opmaak die het in de editor heeft. */
type Teken = { teken: string; opmaak: Opmaak[] };

function tekensVan(stukken: readonly Tekststuk[]): Teken[] {
	return stukken.flatMap((stuk) => [...stuk.tekst].map((teken) => ({ teken, opmaak: [...stuk.opmaak] })));
}

function stukkenVan(tekens: readonly Teken[]): Tekststuk[] {
	const stukken: Tekststuk[] = [];
	for (const { teken, opmaak } of tekens) {
		const vorige = stukken.at(-1);
		if (vorige !== undefined && vorige.opmaak.length === opmaak.length && vorige.opmaak.every((naam, plek) => naam === opmaak[plek])) {
			stukken[stukken.length - 1] = { ...vorige, tekst: vorige.tekst + teken };
		} else {
			stukken.push({ soort: 'tekst', tekst: teken, opmaak });
		}
	}
	return stukken;
}

function zonderOpmaak(teken: Teken, opmaak: Opmaak): void {
	teken.opmaak = teken.opmaak.filter((naam) => naam !== opmaak);
}

const isWitruimte = (teken: Teken) => /^\s$/.test(teken.teken);

/** Per doorlopende reeks tekens met `opmaak` gaat witruimte aan het begin en eind van de reeks buiten de opmaak (FORMAAT.md: witruimte aan de rand staat buiten de tag). */
function witruimteAanRandBuitenOpmaak(tekens: readonly Teken[], opmaak: Opmaak): void {
	let begin = 0;
	while (begin < tekens.length) {
		if (!tekens[begin]!.opmaak.includes(opmaak)) {
			begin++;
			continue;
		}
		let eind = begin;
		while (eind < tekens.length && tekens[eind]!.opmaak.includes(opmaak)) eind++;
		const reeks = tekens.slice(begin, eind);
		let links = 0;
		while (links < reeks.length && isWitruimte(reeks[links]!)) zonderOpmaak(reeks[links++]!, opmaak);
		let rechts = reeks.length - 1;
		while (rechts >= links && isWitruimte(reeks[rechts]!)) zonderOpmaak(reeks[rechts--]!, opmaak);
		begin = eind;
	}
}

/** Een domein en een alineastijl die zelf vet zijn, geven geen `{vet}`: FORMAAT.md en `docx_naar_md.py` laten het weg. */
function vetDoorStijlWeg(tekens: readonly Teken[], stijl: Alineastijl | null, vette: VetteOpmaak): void {
	const vetteAlinea = stijl !== null && vette.alineastijlen.has(stijl);
	for (const teken of tekens) {
		const vetDomein = teken.opmaak.some((naam) => isDomein(naam) && vette.domeinen.has(naam));
		if (vetteAlinea || vetDomein) zonderOpmaak(teken, 'vet');
	}
}

function deelVan(alinea: Node, vette: VetteOpmaak): VersAlineadeel {
	const stukken: Tekststuk[] = [];
	alinea.forEach((kind) => {
		if (!kind.isText) throw new Error(`een vers bevat geen '${kind.type.name}'`);
		stukken.push({ soort: 'tekst', tekst: kind.text ?? '', opmaak: kind.marks.map((mark) => opmaakVan(mark.type.name)) });
	});
	const stijl = alineastijlVan(alinea.attrs['stijl']);
	const tekens = tekensVan(stukken);
	vetDoorStijlWeg(tekens, stijl, vette);
	for (const opmaak of OPMAAK_VOLGORDE) witruimteAanRandBuitenOpmaak(tekens, opmaak);
	return { stijl, stukken: stukkenVan(tekens) };
}

/**
 * Zet het document van de vers-editor terug in de inhoud van een vers, met evenveel delen.
 * De opmaak wordt genormaliseerd zoals FORMAAT.md hem schrijft: witruimte aan de rand van een reeks buiten de opmaak, en geen `vet` onder opmaak die al vet is (`vette`).
 */
export function documentNaarVersInhoud(document: Node, vette: VetteOpmaak): VersInhoud {
	document.check();
	const delen: VersAlineadeel[] = [];
	document.forEach((alinea) => {
		if (alinea.type.name !== 'alinea') throw new Error(`een vers bevat geen '${alinea.type.name}'`);
		delen.push(deelVan(alinea, vette));
	});
	return { delen };
}
