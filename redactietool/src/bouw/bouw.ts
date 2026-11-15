import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type {
	BoekData,
	BoekLijst,
	HoofdstukData,
	HoofdstukInfo,
	Log,
	Referentie,
	RichtlijnSectie,
} from '../data/types';
import { FormaatFout, type Hoofdstuk } from '../formaat/types';
import { parseerHoofdstuk } from '../formaat/parseer';
import { leesLog } from '../log/leesLog';
import { leesOpenVragen } from '../referentie/openVragen';
import { leesPrecedenten } from '../referentie/precedenten';
import { leesRichtlijn } from '../referentie/richtlijn';
import { leesStatus } from '../referentie/status';
import { leesStijlen } from '../sjabloon/leesStijlen';
import { leesStylesXml } from './leesStylesXml';

export type BouwOpties = {
	/** De hoofdmap van de repo, met `bijbel/` en `richtlijn/`. */
	hoofdmap: string;
	/** Wordt eerst leeggemaakt. */
	uitvoermap: string;
};

/** De velden uit `bijbel/<boek>/boek.json` die het bouwscript nodig heeft. */
type BoekBestand = {
	naam: string;
	bestandsprefix: string;
	/** Pad van het Word-sjabloon, relatief aan de boekmap. */
	sjabloon: string;
	verzen_per_hoofdstuk: number[];
};

const RICHTLIJN_PAD = 'richtlijn/redactierichtlijn.md';

/** Een hoofdstuk zonder rij in STATUS.md is nog niet begonnen, net als een rij met `-`. */
const STATUS_ZONDER_RIJ = {
	status: 'nog niet begonnen',
	versie: '',
	herkomst: '',
	opmerking: '',
} as const satisfies Omit<HoofdstukInfo, 'nummer'>;

export function bouwData({ hoofdmap, uitvoermap }: BouwOpties): void {
	rmSync(uitvoermap, { recursive: true, force: true });
	mkdirSync(uitvoermap, { recursive: true });

	const boeken: BoekLijst = [];
	for (const id of leesBoekIds(path.join(hoofdmap, 'bijbel'))) {
		const boekmap = path.join(hoofdmap, 'bijbel', id);
		const boek = leesBoekBestand(boekmap);
		boeken.push({ id, naam: boek.naam });
		schrijfBoek(id, boekmap, boek, path.join(uitvoermap, id));
	}
	schrijfJson(path.join(uitvoermap, 'boeken.json'), boeken);

	const richtlijn: RichtlijnSectie[] = leesRichtlijn(readFileSync(path.join(hoofdmap, RICHTLIJN_PAD), 'utf-8'));
	schrijfJson(path.join(uitvoermap, 'richtlijn.json'), richtlijn);
}

function leesBoekIds(bijbelmap: string): string[] {
	return readdirSync(bijbelmap, { withFileTypes: true })
		.filter((item) => item.isDirectory() && existsSync(path.join(bijbelmap, item.name, 'boek.json')))
		.map((item) => item.name)
		.sort();
}

function leesBoekBestand(boekmap: string): BoekBestand {
	const pad = path.join(boekmap, 'boek.json');
	const inhoud: unknown = JSON.parse(readFileSync(pad, 'utf-8'));
	if (!isBoekBestand(inhoud)) {
		throw new Error(`${pad}: verwacht naam, bestandsprefix, sjabloon en verzen_per_hoofdstuk`);
	}
	return inhoud;
}

function isBoekBestand(waarde: unknown): waarde is BoekBestand {
	if (typeof waarde !== 'object' || waarde === null) {
		return false;
	}
	const kandidaat = waarde as Record<string, unknown>;
	return (
		typeof kandidaat['naam'] === 'string' &&
		typeof kandidaat['bestandsprefix'] === 'string' &&
		typeof kandidaat['sjabloon'] === 'string' &&
		Array.isArray(kandidaat['verzen_per_hoofdstuk']) &&
		kandidaat['verzen_per_hoofdstuk'].every((aantal) => typeof aantal === 'number')
	);
}

function schrijfBoek(id: string, boekmap: string, boek: BoekBestand, uitvoermap: string): void {
	mkdirSync(uitvoermap, { recursive: true });

	const sjabloonPad = path.join(boekmap, boek.sjabloon);
	const stijlen = leesStijlen(leesStylesXml(readFileSync(sjabloonPad), sjabloonPad));
	const statusRijen = leesStatus(readFileSync(path.join(boekmap, 'STATUS.md'), 'utf-8'));

	const hoofdstukken: HoofdstukInfo[] = boek.verzen_per_hoofdstuk.map((_aantalVerzen, index) => {
		const nummer = index + 1;
		return statusRijen.find((rij) => rij.nummer === nummer) ?? { nummer, ...STATUS_ZONDER_RIJ };
	});
	const boekData: BoekData = { id, naam: boek.naam, prefix: boek.bestandsprefix, hoofdstukken, stijlen };
	schrijfJson(path.join(uitvoermap, 'boek.json'), boekData);

	for (const { nummer } of hoofdstukken) {
		const bestand = path.join(uitvoermap, `hoofdstuk-${nummerMetNul(nummer)}.json`);
		schrijfJson(bestand, leesHoofdstukData(boekmap, boek.bestandsprefix, nummer));
	}

	const referentie: Referentie = {
		precedenten: leesPrecedenten(leesOptioneleTekst(path.join(boekmap, 'referentie', 'precedenten.md'))),
		openVragen: leesOpenVragen(leesOptioneleTekst(path.join(boekmap, 'referentie', 'open-vragen.md'))),
	};
	schrijfJson(path.join(uitvoermap, 'referentie.json'), referentie);
}

/** Bron is verplicht; een hoofdstuk dat nog niet vereenvoudigd is heeft nog geen vereenvoudiging en log. */
function leesHoofdstukData(boekmap: string, prefix: string, nummer: number): HoofdstukData {
	const bestandsnaam = `${prefix}-${nummerMetNul(nummer)}.md`;
	const vereenvoudigdPad = path.join(boekmap, 'vereenvoudigd', bestandsnaam);
	const logPad = path.join(boekmap, 'wijzigingslog', bestandsnaam);

	const vereenvoudigd: Hoofdstuk = existsSync(vereenvoudigdPad) ? parseerBestand(vereenvoudigdPad) : { alineas: [] };
	const log: Log = existsSync(logPad) ? leesLog(readFileSync(logPad, 'utf-8')) : { verzen: [], algemeneVragen: [] };

	return { nummer, bron: parseerBestand(path.join(boekmap, 'bron', bestandsnaam)), vereenvoudigd, log };
}

function parseerBestand(pad: string): Hoofdstuk {
	try {
		return parseerHoofdstuk(readFileSync(pad, 'utf-8'));
	} catch (fout) {
		if (fout instanceof FormaatFout) {
			throw new Error(`${pad}: ${fout.message}`, { cause: fout });
		}
		throw fout;
	}
}

function leesOptioneleTekst(pad: string): string {
	return existsSync(pad) ? readFileSync(pad, 'utf-8') : '';
}

function nummerMetNul(nummer: number): string {
	return String(nummer).padStart(2, '0');
}

function schrijfJson(pad: string, waarde: unknown): void {
	writeFileSync(pad, JSON.stringify(waarde));
}
