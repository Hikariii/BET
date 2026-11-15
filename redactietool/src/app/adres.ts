/** De tabbladen van het scherm Begrippen. */
export const TABBLADEN = ['besloten', 'gevonden', 'vragen'] as const;
export type Tabblad = (typeof TABBLADEN)[number];

/**
 * Het adres in de browser.
 * `#/lukas/9/22` is Lukas 9, vers 22; `#/lukas/begrippen/gevonden` is het tabblad Gevonden. Een slash achteraan mag.
 */
export type Adres =
	| {
			soort: 'hoofdstuk';
			boek: string;
			hoofdstuk: number;
			/** `null` als het adres naar het hele hoofdstuk wijst. */
			vers: number | null;
	  }
	| { soort: 'begrippen'; boek: string; tabblad: Tabblad };

const HOOFDSTUK = /^#\/([^/]+)\/(\d+)(?:\/(\d+))?\/?$/;
const BEGRIPPEN = /^#\/([^/]+)\/begrippen(?:\/([a-z]+))?\/?$/;

/** Geeft `null` voor een leeg of onbegrijpelijk adres. */
export function leesAdres(hash: string): Adres | null {
	const hoofdstuk = HOOFDSTUK.exec(hash);
	if (hoofdstuk !== null) {
		const [, boek, nummer, vers] = hoofdstuk;
		const boekNaam = decodeerBoek(boek ?? '');
		if (boekNaam === null) return null;
		return { soort: 'hoofdstuk', boek: boekNaam, hoofdstuk: Number(nummer), vers: vers === undefined ? null : Number(vers) };
	}
	const begrippen = BEGRIPPEN.exec(hash);
	if (begrippen !== null) {
		const [, boek, tabblad] = begrippen;
		const boekNaam = decodeerBoek(boek ?? '');
		if (boekNaam === null) return null;
		if (tabblad === undefined) return { soort: 'begrippen', boek: boekNaam, tabblad: 'besloten' };
		return isTabblad(tabblad) ? { soort: 'begrippen', boek: boekNaam, tabblad } : null;
	}
	return null;
}

export function maakAdres(adres: Adres): string {
	const boek = `#/${encodeURIComponent(adres.boek)}`;
	if (adres.soort === 'begrippen') {
		return `${boek}/begrippen/${adres.tabblad}`;
	}
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

function decodeerBoek(boek: string): string | null {
	try {
		return decodeURIComponent(boek);
	} catch (fout) {
		if (fout instanceof URIError) return null;
		throw fout;
	}
}
