/** Wat de bewaar-logica van een boek nodig heeft: het id en de hoofdstuknummers, om de opslag te kunnen doorlopen. `BoekData` past erop. */
export type BoekMetHoofdstukken = {
	id: string;
	hoofdstukken: readonly { nummer: number }[];
};
