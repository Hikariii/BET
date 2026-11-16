import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { hoofdstukJsonNaam, nummerMetNul } from '../data/bestandsnamen';
import type {
	BoekData,
	BoekLijst,
	HoofdstukData,
	HoofdstukInfo,
	Log,
	OpenVraag,
	Referentie,
	RichtlijnSectie,
} from '../data/types';
import type { Hoofdstuk } from '../formaat/types';
import { parseerHoofdstuk } from '../formaat/parseer';
import { leesLog } from '../log/leesLog';
import { leesOpenVragen } from '../referentie/openVragen';
import { leesPrecedenten } from '../referentie/precedenten';
import { leesRichtlijn } from '../referentie/richtlijn';
import { leesStatus } from '../referentie/status';
import { leesStijlen } from '../sjabloon/leesStijlen';
import { ontbrekendeStijlen } from './controleerStijlen';
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

	const richtlijn: RichtlijnSectie[] = leesBestand(path.join(hoofdmap, RICHTLIJN_PAD), leesRichtlijn);
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
		kandidaat['verzen_per_hoofdstuk'].every((aantal) => Number.isInteger(aantal))
	);
}

function schrijfBoek(id: string, boekmap: string, boek: BoekBestand, uitvoermap: string): void {
	mkdirSync(uitvoermap, { recursive: true });

	const sjabloonPad = path.join(boekmap, boek.sjabloon);
	const stijlen = leesStijlen(leesStylesXml(readFileSync(sjabloonPad), sjabloonPad));
	const ontbrekend = ontbrekendeStijlen(stijlen);
	if (ontbrekend.length > 0) {
		throw new Error(`${sjabloonPad}: het sjabloon mist stijlen die de tool gebruikt: ${ontbrekend.join('; ')}`);
	}
	const statusRijen = leesBestand(path.join(boekmap, 'STATUS.md'), leesStatus);

	const hoofdstukken: HoofdstukInfo[] = boek.verzen_per_hoofdstuk.map((_aantalVerzen, index) => {
		const nummer = index + 1;
		return statusRijen.find((rij) => rij.nummer === nummer) ?? { nummer, ...STATUS_ZONDER_RIJ };
	});
	const boekData: BoekData = { id, naam: boek.naam, prefix: boek.bestandsprefix, hoofdstukken, stijlen };
	schrijfJson(path.join(uitvoermap, 'boek.json'), boekData);

	for (const { nummer } of hoofdstukken) {
		schrijfJson(path.join(uitvoermap, hoofdstukJsonNaam(nummer)), leesHoofdstukData(boekmap, boek.bestandsprefix, nummer));
	}

	const openVragenPad = path.join(boekmap, 'referentie', 'open-vragen.md');
	const openVragen = leesOptioneleLijst(openVragenPad, leesOpenVragen);
	controleerVerzen(openVragen, boek.verzen_per_hoofdstuk, openVragenPad);
	const referentie: Referentie = {
		precedenten: leesOptioneleLijst(path.join(boekmap, 'referentie', 'precedenten.md'), leesPrecedenten),
		openVragen,
	};
	schrijfJson(path.join(uitvoermap, 'referentie.json'), referentie);
}

/** Bron is verplicht; een hoofdstuk dat nog niet vereenvoudigd is heeft nog geen vereenvoudiging en log. */
function leesHoofdstukData(boekmap: string, prefix: string, nummer: number): HoofdstukData {
	const bestandsnaam = `${prefix}-${nummerMetNul(nummer)}.md`;
	const vereenvoudigdPad = path.join(boekmap, 'vereenvoudigd', bestandsnaam);
	const logPad = path.join(boekmap, 'wijzigingslog', bestandsnaam);

	const vereenvoudigd: Hoofdstuk = existsSync(vereenvoudigdPad) ? parseerBestand(vereenvoudigdPad) : { alineas: [] };
	const log: Log = existsSync(logPad) ? leesBestand(logPad, leesLog) : { verzen: [], algemeneVragen: [] };

	return { nummer, bron: parseerBestand(path.join(boekmap, 'bron', bestandsnaam)), vereenvoudigd, log };
}

function parseerBestand(pad: string): Hoofdstuk {
	return leesBestand(pad, parseerHoofdstuk);
}

/** Een fout van de parser krijgt het pad van het bestand erbij; de parsers kennen alleen een regelnummer. */
function leesBestand<Uitkomst>(pad: string, parseer: (tekst: string) => Uitkomst): Uitkomst {
	const tekst = readFileSync(pad, 'utf-8');
	try {
		return parseer(tekst);
	} catch (fout) {
		if (fout instanceof Error) {
			throw new Error(`${pad}: ${fout.message}`, { cause: fout });
		}
		throw fout;
	}
}

/** Een referentiebestand dat niet bestaat is een lege lijst. */
function leesOptioneleLijst<Rij>(pad: string, parseer: (tekst: string) => Rij[]): Rij[] {
	return existsSync(pad) ? leesBestand(pad, parseer) : [];
}

/** Een open vraag mag alleen verwijzen naar een vers dat in `verzen_per_hoofdstuk` staat. */
function controleerVerzen(openVragen: OpenVraag[], verzenPerHoofdstuk: number[], pad: string): void {
	for (const vraag of openVragen) {
		for (const { hoofdstuk, vers } of vraag.verzen) {
			const aantalVerzen = verzenPerHoofdstuk[hoofdstuk - 1];
			const reden =
				aantalVerzen === undefined
					? `hoofdstuk ${hoofdstuk} bestaat niet (het boek heeft ${verzenPerHoofdstuk.length} hoofdstukken)`
					: vers > aantalVerzen
						? `hoofdstuk ${hoofdstuk} heeft ${aantalVerzen} verzen`
						: null;
			if (reden !== null) {
				throw new Error(`${pad}: vraag '${vraag.plaats}: ${vraag.kwestie}': vers ${hoofdstuk}:${vers} bestaat niet, ${reden}`);
			}
		}
	}
}

function schrijfJson(pad: string, waarde: unknown): void {
	writeFileSync(pad, JSON.stringify(waarde));
}
