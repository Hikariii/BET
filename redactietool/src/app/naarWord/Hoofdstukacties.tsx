import type { BoekData, HoofdstukData } from '../../data/types';
import type { Hoofdstuk } from '../../formaat/types';

type Props = {
	boek: BoekData;
	/** Het hoofdstuk uit de repo. */
	repo: HoofdstukData;
	/** Het hoofdstuk zoals in de tool, met de tussenstand toegepast; dit gaat naar Word. */
	weergave: Hoofdstuk;
};

/** Knoppen bovenaan het hoofdstuk: Kopiëren naar Word (of de melding in Safari) en Export voor Claude. Wordt ingevuld. */
export function Hoofdstukacties(_props: Props) {
	return null;
}
