import { Plugin } from 'prosemirror-state';

/**
 * Een versnummer staat in FORMAAT.md altijd buiten tags.
 * Het schema kan dat niet afdwingen: ProseMirror zet een mark ook op een atoom als de bovenliggende alinea die mark toestaat.
 * Deze plugin haalt na elke wijziging de opmaak van versnummers weg, zodat een opmaakreeks over een vers heen om het versnummer heen loopt.
 */
export const versnummersZonderOpmaak = new Plugin({
	appendTransaction(transacties, _oud, nieuw) {
		if (!transacties.some((transactie) => transactie.docChanged)) return null;
		const herstel = nieuw.tr;
		nieuw.doc.descendants((node, positie) => {
			if (node.type.name === 'versnummer' && node.marks.length > 0) herstel.removeMark(positie, positie + node.nodeSize);
		});
		return herstel.docChanged ? herstel : null;
	},
});
