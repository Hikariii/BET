import type { BoekData, Referentie, Status } from '../data/types';
import { maakAdres, versAdres } from './adres';
import { aantalOpenVragen } from './vertaalvragen';
import './Zijbalk.css';

type Props = {
	boek: BoekData;
	referentie: Referentie;
	/** Het hoofdstuk dat open staat. */
	huidigHoofdstuk: number | null;
	/** Of het scherm Begrippen open staat. */
	begrippenOpen: boolean;
};

export function Zijbalk({ boek, referentie, huidigHoofdstuk, begrippenOpen }: Props) {
	const gewoneStatus = gewoneStatusVan(boek.hoofdstukken.map((hoofdstuk) => hoofdstuk.status));
	const heeftAfwijkingen = boek.hoofdstukken.some((hoofdstuk) => hoofdstuk.status !== gewoneStatus);
	return (
		<nav class="zijbalk" aria-label={`Hoofdstukken van ${boek.naam}`}>
			<h2>{boek.naam}</h2>
			<a class="naar-begrippen" href={maakAdres({ soort: 'begrippen', boek: boek.id, tabblad: 'besloten' })} aria-current={begrippenOpen ? 'page' : undefined}>
				Begrippen en vragen
			</a>
			{gewoneStatus !== null && (
				<p class="status-legenda">
					{heeftAfwijkingen ? `Overige hoofdstukken: ${gewoneStatus}` : `Alle hoofdstukken: ${gewoneStatus}`}
				</p>
			)}
			<ul>
				{boek.hoofdstukken.map((hoofdstuk) => {
					const openVragen = aantalOpenVragen(referentie.openVragen, hoofdstuk.nummer);
					return (
						<li>
							<a
								href={versAdres(boek.id, hoofdstuk.nummer)}
								aria-current={hoofdstuk.nummer === huidigHoofdstuk ? 'page' : undefined}
							>
								<span class="hoofdstuknummer">{hoofdstuk.nummer}</span>
								{hoofdstuk.status === gewoneStatus ? (
									<span class="alleen-schermlezer">Status {hoofdstuk.status}</span>
								) : (
									<span class={`status status-${statusKlasse(hoofdstuk.status)}`}>{hoofdstuk.status}</span>
								)}
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

/**
 * De status die de meeste hoofdstukken hebben en die daarom niet per hoofdstuk herhaald wordt.
 * Bij een gelijke stand tussen de meest voorkomende statussen is er geen gewone status (`null`):
 * dan toont de zijbalk alles per hoofdstuk. Een boek zonder hoofdstukken heeft er ook geen.
 */
export function gewoneStatusVan(statussen: Status[]): Status | null {
	const aantallen = new Map<Status, number>();
	for (const status of statussen) {
		aantallen.set(status, (aantallen.get(status) ?? 0) + 1);
	}
	const meeste = Math.max(0, ...aantallen.values());
	const koplopers = [...aantallen.keys()].filter((status) => aantallen.get(status) === meeste);
	const [enige, tweede] = koplopers;
	return enige !== undefined && tweede === undefined ? enige : null;
}
