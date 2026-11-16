export type Celtoestand = {
	/** De cel staat vast in de kolom met alle regels; de rij groeit mee. */
	vast: boolean;
	/** De klassen van het zweefvak in de cel. */
	klassen: string;
	/** Alleen een zwevend vak waar iets uit wegvalt neemt toetsenbordfocus, zodat het met het toetsenbord uit te klappen is. */
	focusbaar: boolean;
	/** De punaise staat in een uitgeklapt vak en bij een open naslagkaart (om vast te zetten), en in een vastgezet vak (om los te maken). */
	punaise: boolean;
};

type Invoer = {
	/** De naslagkaart onder het vers staat open. */
	naslagOpen: boolean;
	/** De redacteur heeft het vak met de punaise vastgezet. */
	vastgezet: boolean;
	/** De regels passen niet in de hoogte van het vers. */
	overloopt: boolean;
	/** Het vak is aangewezen of heeft toetsenbordfocus. */
	open: boolean;
};

/**
 * Bepaalt hoe de cel Vertaalregels erbij staat: zolang de naslagkaart open is of het vak vastgezet is, staat hij vast en volledig,
 * anders zweeft hij en klapt hij open bij aanwijzen of toetsenbordfocus, maar alleen als de regels niet in de cel passen.
 */
export function celToestand({ naslagOpen, vastgezet, overloopt, open }: Invoer): Celtoestand {
	const vast = naslagOpen || vastgezet;
	const zwevendMetOverloop = !vast && overloopt;
	const uitgeklapt = zwevendMetOverloop && open;
	const klassen = ['zweefvak', vast && 'vast', zwevendMetOverloop && 'overloopt', uitgeklapt && 'open'];
	return {
		vast,
		klassen: klassen.filter((naam) => naam !== false).join(' '),
		focusbaar: zwevendMetOverloop,
		punaise: vastgezet || naslagOpen || uitgeklapt,
	};
}
