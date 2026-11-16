import type { Opslag } from '../bewerken/tussenstand';

const luisteraars = new Set<() => void>();
let teller = 0;

/** Laat weten dat de opslag veranderd is; schermen die er een samenvatting van tonen, lezen opnieuw. */
export function meldOpslagGewijzigd(): void {
	teller++;
	for (const luisteraar of [...luisteraars]) luisteraar();
}

/** Loopt op bij elke melding; een scherm leest opnieuw zodra de teller anders is dan toen het las. */
export function opslagTeller(): number {
	return teller;
}

/** Geeft de functie terug die de luisteraar weer afmeldt. */
export function luisterNaOpslagwijziging(luisteraar: () => void): () => void {
	luisteraars.add(luisteraar);
	return () => {
		luisteraars.delete(luisteraar);
	};
}

/** Een opslag die na elke geslaagde schrijf- of wisactie `bijWijziging` aanroept. Een mislukte schrijfactie meldt niets. */
export function meldendeOpslag(opslag: Opslag, bijWijziging: () => void): Opslag {
	return {
		getItem: (sleutel) => opslag.getItem(sleutel),
		setItem: (sleutel, waarde) => {
			opslag.setItem(sleutel, waarde);
			bijWijziging();
		},
		removeItem: (sleutel) => {
			opslag.removeItem(sleutel);
			bijWijziging();
		},
	};
}
