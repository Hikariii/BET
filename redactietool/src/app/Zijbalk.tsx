import type { BoekData, Referentie } from '../data/types';
import { maakAdres } from './adres';
import { aantalOpenVragen } from './vertaalvragen';

type Props = {
	boek: BoekData;
	referentie: Referentie;
	/** Het hoofdstuk dat open staat. */
	huidigHoofdstuk: number | null;
};

export function Zijbalk({ boek, referentie, huidigHoofdstuk }: Props) {
	return (
		<nav class="zijbalk" aria-label={`Hoofdstukken van ${boek.naam}`}>
			<h2>{boek.naam}</h2>
			<ul>
				{boek.hoofdstukken.map((hoofdstuk) => {
					const openVragen = aantalOpenVragen(referentie.openVragen, hoofdstuk.nummer);
					return (
						<li>
							<a
								href={maakAdres({ boek: boek.id, hoofdstuk: hoofdstuk.nummer, vers: null })}
								aria-current={hoofdstuk.nummer === huidigHoofdstuk ? 'page' : undefined}
							>
								<span class="hoofdstuknummer">{hoofdstuk.nummer}</span>
								<span class={`status status-${statusKlasse(hoofdstuk.status)}`}>{hoofdstuk.status}</span>
								{openVragen > 0 && (
									<span class="open-vragen" title="Open vertaalvragen in dit hoofdstuk">
										{openVragen} {openVragen === 1 ? 'vraag' : 'vragen'}
									</span>
								)}
							</a>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

export function statusKlasse(status: string): string {
	return status.replaceAll(' ', '-');
}
