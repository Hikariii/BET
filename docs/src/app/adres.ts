/** Het adres in de browser: `#/lukas/9/22` is Lukas 9, vers 22. */
export type Adres = {
	boek: string;
	hoofdstuk: number;
	/** `null` als het adres naar het hele hoofdstuk wijst. */
	vers: number | null;
};

const ADRES = /^#\/([^/]+)\/(\d+)(?:\/(\d+))?$/;

/** Geeft `null` voor een leeg of onbegrijpelijk adres. */
export function leesAdres(hash: string): Adres | null {
	const gevonden = ADRES.exec(hash);
	if (gevonden === null) {
		return null;
	}
	const [, boek, hoofdstuk, vers] = gevonden;
	return {
		boek: decodeURIComponent(boek ?? ''),
		hoofdstuk: Number(hoofdstuk),
		vers: vers === undefined ? null : Number(vers),
	};
}

export function maakAdres({ boek, hoofdstuk, vers }: Adres): string {
	const hoofdstukAdres = `#/${encodeURIComponent(boek)}/${hoofdstuk}`;
	return vers === null ? hoofdstukAdres : `${hoofdstukAdres}/${vers}`;
}
