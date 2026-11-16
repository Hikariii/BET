/** Zoveel regels per vers staan standaard zichtbaar in de kolom Regels. */
export const ZICHTBARE_REGELS = 3;

/** Hoeveel regels er minstens verborgen moeten worden om "nog N regels" te rechtvaardigen. */
const MINIMAAL_VERBORGEN = 2;

export type GekapteRegels = {
	/** Het aantal zichtbare regels per logblok, in dezelfde volgorde als de invoer. */
	zichtbaarPerBlok: readonly number[];
	verborgen: number;
};

/**
 * Kapt de regels van een vers af na de eerste `ZICHTBARE_REGELS` regels, geteld over alle logblokken heen.
 * Blijft er maar één regel over, dan blijft die zichtbaar: "nog 1 regel" is geen winst.
 */
export function kapRegels(aantalPerBlok: readonly number[], uitgeklapt: boolean): GekapteRegels {
	const totaal = aantalPerBlok.reduce((som, aantal) => som + aantal, 0);
	const kapt = !uitgeklapt && totaal - ZICHTBARE_REGELS >= MINIMAAL_VERBORGEN;
	let over = kapt ? ZICHTBARE_REGELS : totaal;
	const zichtbaarPerBlok = aantalPerBlok.map((aantal) => {
		const zichtbaar = Math.min(aantal, over);
		over -= zichtbaar;
		return zichtbaar;
	});
	return { zichtbaarPerBlok, verborgen: kapt ? totaal - ZICHTBARE_REGELS : 0 };
}
