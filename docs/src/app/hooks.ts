import { useEffect, useState } from 'preact/hooks';
import { leesAdres, type Adres } from './adres';

export type Laadtoestand<Waarde> =
	| { soort: 'laden' }
	| { soort: 'fout'; melding: string }
	| { soort: 'klaar'; waarde: Waarde };

/** Laadt opnieuw als `afhankelijk` verandert; een antwoord op een oudere vraag wordt genegeerd. */
export function useLaden<Waarde>(laad: () => Promise<Waarde>, afhankelijk: readonly unknown[]): Laadtoestand<Waarde> {
	const [toestand, zetToestand] = useState<Laadtoestand<Waarde>>({ soort: 'laden' });
	useEffect(() => {
		let verouderd = false;
		zetToestand({ soort: 'laden' });
		laad().then(
			(waarde) => {
				if (!verouderd) {
					zetToestand({ soort: 'klaar', waarde });
				}
			},
			(fout: unknown) => {
				if (!verouderd) {
					zetToestand({ soort: 'fout', melding: fout instanceof Error ? fout.message : String(fout) });
				}
			},
		);
		return () => {
			verouderd = true;
		};
	}, afhankelijk);
	return toestand;
}

/** Het adres uit de browser, bijgewerkt bij elke wijziging; `null` als het leeg of onbegrijpelijk is. */
export function useAdres(): Adres | null {
	const [adres, zetAdres] = useState(() => leesAdres(window.location.hash));
	useEffect(() => {
		const bijWijziging = () => zetAdres(leesAdres(window.location.hash));
		window.addEventListener('hashchange', bijWijziging);
		return () => window.removeEventListener('hashchange', bijWijziging);
	}, []);
	return adres;
}
