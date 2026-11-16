import { haalVersUitKeuzes } from '../vervangen/keuzes';
import { nietOpgeslagen, RUIMTE_MAKEN } from './opslagVol';
import { bewaarVers, leesTussenstand, pastOpRepo, wisVers, zelfdeInhoud, type BewaarUitkomst, type Opslag } from './tussenstand';
import type { VersInhoud } from './types';

/**
 * Zet een vers terug op de tekst van Claude: de bewerking verdwijnt uit de tussenstand en het vers gaat uit elke vervanging die het noemde,
 * zodat de export en Zoeken en vervangen het niet meer als toegepast tonen. Een vers zonder bewerking of vervanging laat de opslag ongemoeid.
 * Dit hoort niet in `tussenstand.ts`: die module kent de vervangingen niet.
 */
export function terugNaarRepo(opslag: Opslag, boek: string, hoofdstuk: number, vers: number): BewaarUitkomst {
	const naam = `${hoofdstuk}:${vers}`;
	try {
		wisVers(opslag, boek, hoofdstuk, vers);
	} catch {
		return { gelukt: false, melding: `Vers ${naam} kon niet worden teruggezet. Ververs de pagina en probeer het opnieuw.` };
	}
	if (haalVersUitKeuzes(opslag, boek, hoofdstuk, vers)) return { gelukt: true };
	return { gelukt: false, melding: `Vers ${naam} is teruggezet. ${nietOpgeslagen('De bijgewerkte vervanging')} ${RUIMTE_MAKEN}` };
}

/**
 * Bewaart de bewerking, of zet het vers terug op de tekst van Claude (`terugNaarRepo`) als het vers daar weer gelijk aan is.
 * Een bestaande bewerking houdt haar oude basis, zodat een verouderde bewerking verouderd blijft;
 * past de bestaande bewerking niet meer op de repo (ander aantal delen), dan is de repo de nieuwe basis.
 * Een vers zonder repo-inhoud (`repo` is `null`) laat de opslag ongemoeid.
 */
export function bewaarOfWis(
	opslag: Opslag,
	boek: string,
	hoofdstuk: number,
	vers: number,
	inhoud: VersInhoud,
	repo: VersInhoud | null,
): BewaarUitkomst {
	if (repo === null) return { gelukt: true };
	const bestaand = leesTussenstand(opslag, boek, hoofdstuk).verzen[vers];
	const basis = bestaand !== undefined && pastOpRepo(repo, bestaand) ? bestaand.basis : repo;
	if (zelfdeInhoud(inhoud, repo) && zelfdeInhoud(basis, repo)) return terugNaarRepo(opslag, boek, hoofdstuk, vers);
	return bewaarVers(opslag, boek, hoofdstuk, vers, inhoud, basis);
}
