import type { WordStijl } from '../../data/types';
import type { VersInhoud } from '../../bewerken/types';

type Props = {
	inhoud: VersInhoud;
	stijlen: readonly WordStijl[];
	/** Na elke wijziging; de inhoud houdt evenveel delen. */
	onWijzig: (inhoud: VersInhoud) => void;
	onSluit: () => void;
};

/** ProseMirror-editor voor één vers, met een alinea per deel. Wordt ingevuld. */
export function VersEditor(_props: Props) {
	return <p class="melding">De editor wordt nog gebouwd.</p>;
}
