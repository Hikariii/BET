import { Schema, type MarkSpec } from 'prosemirror-model';
import { DOMEINEN, OPMAAK_VOLGORDE, type Opmaak } from '../formaat/types';

function isDomein(opmaak: Opmaak): boolean {
	return (DOMEINEN as readonly string[]).includes(opmaak);
}

/**
 * ProseMirror geeft elke mark een rang op volgorde van deze lijst en sorteert de marks van een stuk tekst daarop.
 * Daardoor komt de nestingvolgorde van FORMAAT.md (OPMAAK_VOLGORDE) bij elke bewerking vanzelf goed uit.
 * Een domein vervangt een ander domein over dezelfde tekst: FORMAAT.md kent maar één tekenstijl per stuk.
 */
const marks: Record<string, MarkSpec> = {};
for (const opmaak of OPMAAK_VOLGORDE) {
	marks[opmaak] = isDomein(opmaak) ? { excludes: DOMEINEN.join(' ') } : {};
}

export const schema = new Schema({
	nodes: {
		doc: { content: '(titel | alinea)*' },
		titel: { content: 'text*', marks: '' },
		/**
		 * Een alinea zonder inhoud en zonder stijl is een lege regel van het bestand.
		 * Eén en twee lege regels achter elkaar blijven zo verschillend: het zijn één of twee lege alinea's.
		 */
		alinea: { content: 'inline*', attrs: { stijl: { default: null, validate: 'string|null' } } },
		text: { group: 'inline' },
		/** Een versnummer is één onverdeelbaar teken. De spaties eromheen zijn gewone tekst in de alinea. */
		versnummer: {
			group: 'inline',
			inline: true,
			atom: true,
			selectable: false,
			attrs: { nummer: { validate: 'number' } },
			leafText: (node) => `[${String(node.attrs['nummer'])}]`,
		},
	},
	marks,
});
