export type Celtoestand = {
	/** De cel staat vast in de kolom met alle regels; de rij groeit mee. */
	vast: boolean;
	/** De klassen van het zweefvak in de cel. */
	klassen: string;
	/** Alleen een zwevend vak waar iets uit wegvalt neemt toetsenbordfocus, zodat het met het toetsenbord uit te klappen is. */
	focusbaar: boolean;
};

/**
 * Bepaalt hoe de cel Vertaalregels erbij staat: zolang de naslagkaart onder het vers open is staat hij vast en volledig,
 * anders zweeft hij en klapt hij open bij aanwijzen of toetsenbordfocus, maar alleen als de regels niet in de cel passen.
 */
export function celToestand(naslagOpen: boolean, overloopt: boolean, open: boolean): Celtoestand {
	const vast = naslagOpen;
	const zwevendMetOverloop = !vast && overloopt;
	const klassen = ['zweefvak', vast && 'vast', zwevendMetOverloop && 'overloopt', zwevendMetOverloop && open && 'open'];
	return {
		vast,
		klassen: klassen.filter((naam) => naam !== false).join(' '),
		focusbaar: zwevendMetOverloop,
	};
}
