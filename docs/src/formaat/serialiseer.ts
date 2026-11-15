import { nestingniveau, openTag, sluitTag, type Alinea, type Hoofdstuk, type Opmaak } from './types';

/** De tags om van de ene opmaak naar de andere te gaan: sluit van binnen naar buiten tot de gedeelde buitenkant, open dan de rest. */
function overgang(van: readonly Opmaak[], naar: readonly Opmaak[]): string {
	let gedeeld = 0;
	while (gedeeld < van.length && gedeeld < naar.length && van[gedeeld] === naar[gedeeld]) gedeeld++;
	const sluiten = van.slice(gedeeld).reverse().map(sluitTag);
	const openen = naar.slice(gedeeld).map(openTag);
	return [...sluiten, ...openen].join('');
}

function inBuitenNaarBinnenVolgorde(opmaak: readonly Opmaak[]): Opmaak[] {
	return [...opmaak].sort((a, b) => nestingniveau(a) - nestingniveau(b));
}

function serialiseerAlinea(alinea: Alinea): string {
	switch (alinea.soort) {
		case 'leeg':
			return '';
		case 'titel':
			return `# ${alinea.tekst}`;
		case 'tekst': {
			let tekst = '';
			let open: readonly Opmaak[] = [];
			for (const stuk of alinea.stukken) {
				const nodig = stuk.soort === 'tekst' ? inBuitenNaarBinnenVolgorde(stuk.opmaak) : [];
				tekst += overgang(open, nodig);
				tekst += stuk.soort === 'tekst' ? stuk.tekst : `[${stuk.nummer}]`;
				open = nodig;
			}
			tekst += overgang(open, []);
			if (alinea.stijl === null) return tekst;
			return tekst === '' ? `@${alinea.stijl}` : `@${alinea.stijl} ${tekst}`;
		}
	}
}

/** Schrijft een hoofdstuk terug naar de tekst van het bestand, met een regeleinde na elke alinea. */
export function serialiseerHoofdstuk(hoofdstuk: Hoofdstuk): string {
	return hoofdstuk.alineas.map((alinea) => `${serialiseerAlinea(alinea)}\n`).join('');
}
