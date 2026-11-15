import { strFromU8, unzipSync } from 'fflate';

const STIJLEN_IN_DOCX = 'word/styles.xml';

/** Een .docx is een zip; de stijlen staan in `word/styles.xml`. */
export function leesStylesXml(docxBytes: Uint8Array, bestandsnaam: string): string {
	const uitgepakt = unzipSync(docxBytes, { filter: (bestand) => bestand.name === STIJLEN_IN_DOCX });
	const stylesXml = uitgepakt[STIJLEN_IN_DOCX];
	if (stylesXml === undefined) {
		throw new Error(`${bestandsnaam}: ${STIJLEN_IN_DOCX} ontbreekt, is dit een Word-bestand?`);
	}
	return strFromU8(stylesXml);
}
