import { knipVers } from '../bewerken/versknip';
import { leesBijbelbestanden } from '../formaat/bijbelbestanden.testhulp';
import { parseerHoofdstuk } from '../formaat/parseer';
import type { HoofdstukVerzen } from './types';

/** De vereenvoudigde hoofdstukken van Lukas uit `bijbel/lukas/vereenvoudigd/`, per vers geknipt, zonder tussenstand en niet goedgekeurd. */
export function leesVereenvoudigdeHoofdstukken(): HoofdstukVerzen[] {
	return leesBijbelbestanden()
		.filter((bestand) => bestand.naam.startsWith('vereenvoudigd/'))
		.map((bestand): HoofdstukVerzen => {
			const geparseerd = parseerHoofdstuk(bestand.tekst);
			const nummers = geparseerd.alineas.flatMap((alinea) =>
				alinea.soort === 'tekst' ? alinea.stukken.flatMap((stuk) => (stuk.soort === 'vers' ? [stuk.nummer] : [])) : [],
			);
			const verzen = [...new Set(nummers)].flatMap((nummer) => {
				const inhoud = knipVers(geparseerd, nummer);
				return inhoud === null ? [] : [{ vers: nummer, inhoud, repo: inhoud }];
			});
			return { hoofdstuk: Number(/(\d+)\.md$/u.exec(bestand.naam)?.[1]), goedgekeurd: false, verzen };
		});
}
