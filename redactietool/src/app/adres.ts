/** De tabbladen van het scherm Begrippen. */
export const TABBLADEN = ['besloten', 'gevonden', 'vragen', 'vervangen'] as const;
export type Tabblad = (typeof TABBLADEN)[number];

/**
 * Het adres in de browser.
 * `#/lukas/9/22` is Lukas 9, vers 22; `#/lukas/begrippen/gevonden` is het tabblad Gevonden; `#/lukas/begrippen/vragen/<sleutel>` is één vraag op het tabblad Vertaalvragen; `#/lukas/opgeslagen` is het overzicht van wat de browser bewaart; `#/galerij` is de galerij met de componenten. Een slash achteraan mag.
 */
export type Adres = BoekAdres | { soort: 'galerij' };

/** Een adres binnen een boek. */
export type BoekAdres =
	| {
			soort: 'hoofdstuk';
			boek: string;
			hoofdstuk: number;
			/** `null` als het adres naar het hele hoofdstuk wijst. */
			vers: number | null;
	  }
	| {
			soort: 'begrippen';
			boek: string;
			tabblad: Tabblad;
			/** De sleutel van één vraag (zie `vraagSleutels`); alleen op het tabblad Vertaalvragen. Ontbreekt als het adres naar het hele tabblad wijst. */
			vraag?: string;
	  }
	| { soort: 'bewaard'; boek: string };

const HOOFDSTUK = /^#\/([^/]+)\/(\d+)(?:\/(\d+))?\/?$/;
const BEGRIPPEN = /^#\/([^/]+)\/begrippen(?:\/([a-z]+)(?:\/([^/]+))?)?\/?$/;
/** De pagina heette eerst Bewaard; oude links en bladwijzers naar `bewaard` werken nog. */
const BEWAARD = /^#\/([^/]+)\/(?:opgeslagen|bewaard)\/?$/;
const GALERIJ = /^#\/galerij\/?$/;

/** Geeft `null` voor een leeg of onbegrijpelijk adres. */
export function leesAdres(hash: string): Adres | null {
	if (GALERIJ.test(hash)) return { soort: 'galerij' };
	const hoofdstuk = HOOFDSTUK.exec(hash);
	if (hoofdstuk !== null) {
		const [, boek, nummer, vers] = hoofdstuk;
		const boekNaam = decodeerDeel(boek ?? '');
		if (boekNaam === null) return null;
		return { soort: 'hoofdstuk', boek: boekNaam, hoofdstuk: Number(nummer), vers: vers === undefined ? null : Number(vers) };
	}
	const begrippen = BEGRIPPEN.exec(hash);
	if (begrippen !== null) {
		const [, boek, tabblad, vraag] = begrippen;
		const boekNaam = decodeerDeel(boek ?? '');
		if (boekNaam === null) return null;
		if (tabblad === undefined) return { soort: 'begrippen', boek: boekNaam, tabblad: 'besloten' };
		if (!isTabblad(tabblad)) return null;
		if (vraag === undefined) return { soort: 'begrippen', boek: boekNaam, tabblad };
		const vraagSleutel = decodeerDeel(vraag);
		return tabblad === 'vragen' && vraagSleutel !== null ? { soort: 'begrippen', boek: boekNaam, tabblad, vraag: vraagSleutel } : null;
	}
	const bewaard = BEWAARD.exec(hash);
	if (bewaard !== null) {
		const boekNaam = decodeerDeel(bewaard[1] ?? '');
		return boekNaam === null ? null : { soort: 'bewaard', boek: boekNaam };
	}
	return null;
}

export function maakAdres(adres: Adres): string {
	if (adres.soort === 'galerij') return '#/galerij';
	const boek = `#/${encodeURIComponent(adres.boek)}`;
	if (adres.soort === 'begrippen') {
		const tabblad = `${boek}/begrippen/${adres.tabblad}`;
		return adres.vraag === undefined ? tabblad : `${tabblad}/${encodeURIComponent(adres.vraag)}`;
	}
	if (adres.soort === 'bewaard') return `${boek}/opgeslagen`;
	const hoofdstukAdres = `${boek}/${adres.hoofdstuk}`;
	return adres.vers === null ? hoofdstukAdres : `${hoofdstukAdres}/${adres.vers}`;
}

/** Kort voor het adres van een hoofdstuk of vers. */
export function versAdres(boek: string, hoofdstuk: number, vers: number | null = null): string {
	return maakAdres({ soort: 'hoofdstuk', boek, hoofdstuk, vers });
}

function isTabblad(tekst: string): tekst is Tabblad {
	return (TABBLADEN as readonly string[]).includes(tekst);
}

/** Leest een deel van het adres met procentcodering; `null` bij een ongeldige codering. */
function decodeerDeel(boek: string): string | null {
	try {
		return decodeURIComponent(boek);
	} catch (fout) {
		if (fout instanceof URIError) return null;
		throw fout;
	}
}
