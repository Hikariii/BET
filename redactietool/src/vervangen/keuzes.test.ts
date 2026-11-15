import { beforeEach, describe, expect, it } from 'vitest';
import { bewaarOfWis, leesTussenstand } from '../bewerken/tussenstand';
import type { Opslag } from '../bewerken/tussenstand';
import type { VersInhoud } from '../bewerken/types';
import type { HoofdstukData } from '../data/types';
import { parseerHoofdstuk } from '../formaat/parseer';
import { maakExport } from '../export/maakExport';
import { draaiKeuzeTerug, leesKeuzes, pasKeuzeToe } from './keuzes';
import type { HoofdstukVerzen, Vondst } from './types';
import { zoekVondsten } from './zoekEnVervang';

class GeheugenOpslag implements Opslag {
	readonly items = new Map<string, string>();
	getItem(sleutel: string): string | null {
		return this.items.get(sleutel) ?? null;
	}
	setItem(sleutel: string, waarde: string): void {
		this.items.set(sleutel, waarde);
	}
	removeItem(sleutel: string): void {
		this.items.delete(sleutel);
	}
}

class VolleOpslag extends GeheugenOpslag {
	override setItem(): void {
		throw new DOMException('De opslag is vol', 'QuotaExceededError');
	}
}

function inhoud(tekst: string): VersInhoud {
	return { delen: [{ stijl: null, stukken: [{ soort: 'tekst', tekst, opmaak: [] }] }] };
}

function vondst(vers: number, gevonden: string, tekst: string): Vondst {
	const van = tekst.indexOf(gevonden);
	return { hoofdstuk: 6, vers, deel: 0, van, tot: van + gevonden.length, gevonden, ervoor: '', erna: '', vervangbaar: true, goedgekeurd: false };
}

const VERS_22 = ' Hij sprak harde woorden.';
const VERS_23 = ' Daarna zweeg hij, harde man.';
const VERS_24 = ' Niets bijzonders.';
const REPO: Record<number, string> = { 22: VERS_22, 23: VERS_23, 24: VERS_24 };

/** Het hoofdstuk zoals de vertaler het ziet: de repo met de tussenstand erover. */
function hoofdstukken(opslag: Opslag): HoofdstukVerzen[] {
	const tussenstand = leesTussenstand(opslag, 'lukas', 6);
	return [
		{
			hoofdstuk: 6,
			goedgekeurd: false,
			verzen: Object.entries(REPO).map(([nummer, tekst]) => ({
				vers: Number(nummer),
				inhoud: tussenstand.verzen[Number(nummer)]?.inhoud ?? inhoud(tekst),
				repo: inhoud(tekst),
			})),
		},
	];
}

const VONDSTEN = zoekVondsten(hoofdstukken(new GeheugenOpslag()), 'harde');
const NU = new Date('2026-11-15T16:00:00.000Z');

function pasToe(opslag: Opslag, nu: Date = NU) {
	return pasKeuzeToe(opslag, 'lukas', hoofdstukken(opslag), 'harde', 'scherpe', VONDSTEN, nu);
}

function huidig(opslag: Opslag, vers: number): VersInhoud | undefined {
	return leesTussenstand(opslag, 'lukas', 6).verzen[vers]?.inhoud;
}

let opslag: GeheugenOpslag;
beforeEach(() => {
	opslag = new GeheugenOpslag();
});

describe('pasKeuzeToe', () => {
	it('zet de nieuwe tekst in de aangevinkte verzen met herkomst en keuze-id', () => {
		expect(leesTussenstand(opslag, 'lukas', 6).verzen).toEqual({});

		const { keuze, meldingen } = pasToe(opslag);

		expect(meldingen).toEqual([]);
		const tussenstand = leesTussenstand(opslag, 'lukas', 6);
		expect(Object.keys(tussenstand.verzen)).toEqual(['22', '23']);
		expect(tussenstand.verzen[22]).toMatchObject({
			inhoud: inhoud(' Hij sprak scherpe woorden.'),
			basis: inhoud(VERS_22),
			herkomst: 'structurele keuze',
			keuzeId: keuze.id,
		});
		expect(tussenstand.verzen[23]?.inhoud).toEqual(inhoud(' Daarna zweeg hij, scherpe man.'));
		expect(tussenstand.verzen[24]).toBeUndefined();
	});

	it('bewaart de keuze met per vers de inhoud voor en na', () => {
		const { keuze } = pasToe(opslag);

		expect(leesKeuzes(opslag, 'lukas')).toEqual([keuze]);
		expect(keuze).toMatchObject({ zoekterm: 'harde', nieuw: 'scherpe', toegepast: NU.toISOString() });
		expect(keuze.verzen).toEqual([
			{ hoofdstuk: 6, vers: 22, voor: inhoud(VERS_22), na: inhoud(' Hij sprak scherpe woorden.') },
			{ hoofdstuk: 6, vers: 23, voor: inhoud(VERS_23), na: inhoud(' Daarna zweeg hij, scherpe man.') },
		]);
	});

	it('houdt de oude basis van een vers dat de vertaler al bewerkt had', () => {
		const eigen = ' Hij sprak harde, lange woorden.';
		bewaarOfWis(opslag, 'lukas', 6, 22, inhoud(eigen), inhoud(VERS_22));

		pasKeuzeToe(opslag, 'lukas', hoofdstukken(opslag), 'harde', 'scherpe', [vondst(22, 'harde', eigen)], NU);

		const vers = leesTussenstand(opslag, 'lukas', 6).verzen[22];
		expect(vers?.inhoud).toEqual(inhoud(' Hij sprak scherpe, lange woorden.'));
		expect(vers?.basis).toEqual(inhoud(VERS_22));
	});

	it('slaat een vers over waarvan de bewerking bij een oudere repo-tekst hoort, ook bij gelijk aantal delen', () => {
		const eigen = ' Hij sprak harde, lange woorden.';
		bewaarOfWis(opslag, 'lukas', 6, 22, inhoud(eigen), inhoud(' Een oudere repo-tekst.'));
		expect(leesTussenstand(opslag, 'lukas', 6).verzen[22]?.basis).toEqual(inhoud(' Een oudere repo-tekst.'));

		const { keuze, meldingen } = pasKeuzeToe(opslag, 'lukas', hoofdstukken(opslag), 'harde', 'scherpe', zoekVondsten(hoofdstukken(opslag), 'harde'), NU);

		expect(meldingen).toEqual(['Vers 6:22 is overgeslagen: de bewerking hoort bij een oudere repo-tekst. Kijk het vers eerst na.']);
		expect(keuze.verzen.map((vers) => vers.vers)).toEqual([23]);
		expect(huidig(opslag, 22)).toEqual(inhoud(eigen));
	});

	it('slaat een vers over waarvan de bewaarde bewerking niet meer past, en gaat door met de rest', () => {
		const anderAantalDelen: VersInhoud = { delen: [...inhoud(' a').delen, ...inhoud(' b').delen] };
		opslag.setItem(
			'bet-tussenstand/lukas/6',
			JSON.stringify({ verzen: { 22: { inhoud: inhoud(VERS_22), basis: anderAantalDelen, bewaard: NU.toISOString() } } }),
		);

		const { keuze, meldingen } = pasToe(opslag);

		expect(meldingen).toEqual(['Vers 6:22 is overgeslagen: de bewerking hoort bij een oudere repo-tekst. Kijk het vers eerst na.']);
		expect(keuze.verzen.map((vers) => vers.vers)).toEqual([23]);
		expect(huidig(opslag, 22)).toEqual(inhoud(VERS_22));
		expect(huidig(opslag, 23)).toEqual(inhoud(' Daarna zweeg hij, scherpe man.'));
	});

	it('slaat plekken over een opmaakgrens heen over', () => {
		const metGrens = { ...vondst(22, 'harde', VERS_22), vervangbaar: false };

		const { keuze } = pasKeuzeToe(opslag, 'lukas', hoofdstukken(opslag), 'harde', 'scherpe', [metGrens], NU);

		expect(keuze.verzen).toEqual([]);
		expect(leesTussenstand(opslag, 'lukas', 6).verzen).toEqual({});
		expect(leesKeuzes(opslag, 'lukas')).toEqual([]);
	});

	it('meldt een volle opslag per vers en bewaart geen keuze', () => {
		const vol = new VolleOpslag();

		const { keuze, meldingen } = pasToe(vol);

		expect(meldingen).toEqual([
			expect.stringContaining('Vers 22 kon niet in de browser worden bewaard'),
			expect.stringContaining('Vers 23 kon niet in de browser worden bewaard'),
		]);
		expect(keuze.verzen).toEqual([]);
		expect(leesKeuzes(vol, 'lukas')).toEqual([]);
	});

	it('geeft elke keuze een eigen id, ook bij dezelfde tijd', () => {
		const eerste = pasToe(opslag).keuze;
		const tweede = pasKeuzeToe(
			opslag,
			'lukas',
			hoofdstukken(opslag),
			'scherpe',
			'felle',
			[vondst(22, 'scherpe', ' Hij sprak scherpe woorden.')],
			NU,
		).keuze;

		expect(tweede.id).not.toBe(eerste.id);
		expect(leesKeuzes(opslag, 'lukas').map((k) => k.id)).toEqual([tweede.id, eerste.id]);
	});
});

describe('draaiKeuzeTerug met twee keuzes op hetzelfde vers', () => {
	function tweeKeuzes() {
		const eerste = pasToe(opslag).keuze;
		const daarna = hoofdstukken(opslag);
		const tweede = pasKeuzeToe(opslag, 'lukas', daarna, 'woorden', 'zinnen', zoekVondsten(daarna, 'woorden'), new Date('2026-11-15T16:05:00.000Z')).keuze;
		return { eerste, tweede };
	}

	it('laat het vers en de oudere keuze staan zolang de latere keuze het vers nog bezit', () => {
		const { eerste } = tweeKeuzes();
		expect(huidig(opslag, 22)).toEqual(inhoud(' Hij sprak scherpe zinnen.'));

		const meldingen = draaiKeuzeTerug(opslag, 'lukas', eerste.id);

		expect(meldingen).toEqual(['Vers 6:22 is daarna veranderd door de keuze "woorden"; draai die eerst terug.']);
		expect(huidig(opslag, 22)).toEqual(inhoud(' Hij sprak scherpe zinnen.'));
		expect(huidig(opslag, 23)).toBeUndefined();
		expect(leesKeuzes(opslag, 'lukas').find((k) => k.id === eerste.id)?.verzen.map((v) => v.vers)).toEqual([22]);
	});

	it('draait daarna in de omgekeerde volgorde alles terug', () => {
		const { eerste, tweede } = tweeKeuzes();
		draaiKeuzeTerug(opslag, 'lukas', eerste.id);

		expect(draaiKeuzeTerug(opslag, 'lukas', tweede.id)).toEqual([]);
		expect(draaiKeuzeTerug(opslag, 'lukas', eerste.id)).toEqual([]);

		expect(leesTussenstand(opslag, 'lukas', 6).verzen).toEqual({});
		expect(leesKeuzes(opslag, 'lukas')).toEqual([]);
	});
});

describe('draaiKeuzeTerug als de tussenstand niet te schrijven is', () => {
	class TussenstandVast extends GeheugenOpslag {
		vast = false;
		override setItem(sleutel: string, waarde: string): void {
			if (this.vast && sleutel.startsWith('bet-tussenstand/')) throw new DOMException('De opslag is vol', 'QuotaExceededError');
			super.setItem(sleutel, waarde);
		}
		override removeItem(sleutel: string): void {
			if (this.vast && sleutel.startsWith('bet-tussenstand/')) throw new DOMException('Geweigerd', 'SecurityError');
			super.removeItem(sleutel);
		}
	}

	it('houdt de verzen die niet terug konden bij de keuze, zodat terugdraaien later nog kan', () => {
		const vastOpslag = new TussenstandVast();
		const { keuze } = pasToe(vastOpslag);
		vastOpslag.vast = true;

		const meldingen = draaiKeuzeTerug(vastOpslag, 'lukas', keuze.id);

		expect(meldingen).toEqual(['Vers 6:22 kon niet worden teruggezet en blijft staan.', 'Vers 6:23 kon niet worden teruggezet en blijft staan.']);
		expect(leesKeuzes(vastOpslag, 'lukas').map((k) => k.verzen.map((v) => v.vers))).toEqual([[22, 23]]);
	});
});

describe('leesKeuzes', () => {
	it('geeft de nieuwste keuze eerst', () => {
		const eerste = pasToe(opslag, new Date('2026-11-15T16:00:00.000Z')).keuze;
		const daarna = hoofdstukken(opslag);
		const tweede = pasKeuzeToe(opslag, 'lukas', daarna, 'woorden', 'zinnen', zoekVondsten(daarna, 'woorden'), new Date('2026-11-15T16:05:00.000Z')).keuze;

		expect(tweede.verzen.map((vers) => vers.vers)).toEqual([22]);
		expect(leesKeuzes(opslag, 'lukas').map((k) => k.id)).toEqual([tweede.id, eerste.id]);
	});

	it('geeft een lege lijst bij onleesbare opslag en bij een ander boek', () => {
		pasToe(opslag);
		opslag.setItem('bet-keuzes/johannes', 'rommel');

		expect(leesKeuzes(opslag, 'johannes')).toEqual([]);
		expect(leesKeuzes(opslag, 'marcus')).toEqual([]);
	});
});

describe('draaiKeuzeTerug', () => {
	it('zet de verzen terug naar de repo en haalt de keuze uit de lijst', () => {
		const { keuze } = pasToe(opslag);
		expect(leesTussenstand(opslag, 'lukas', 6).verzen[22]).toBeDefined();
		expect(leesKeuzes(opslag, 'lukas')).toHaveLength(1);

		const meldingen = draaiKeuzeTerug(opslag, 'lukas', keuze.id);

		expect(meldingen).toEqual([]);
		expect(leesTussenstand(opslag, 'lukas', 6).verzen).toEqual({});
		expect(leesKeuzes(opslag, 'lukas')).toEqual([]);
	});

	it('laat een vers staan dat de vertaler na de keuze zelf bewerkte, en meldt dat', () => {
		const { keuze } = pasToe(opslag);
		bewaarOfWis(opslag, 'lukas', 6, 22, inhoud(' Hij sprak scherpe, eigen woorden.'), inhoud(VERS_22));

		const meldingen = draaiKeuzeTerug(opslag, 'lukas', keuze.id);

		expect(meldingen).toEqual(['Vers 6:22 is na de keuze zelf bewerkt en blijft staan.']);
		expect(huidig(opslag, 22)).toEqual(inhoud(' Hij sprak scherpe, eigen woorden.'));
		expect(huidig(opslag, 23)).toBeUndefined();
		expect(leesKeuzes(opslag, 'lukas')).toEqual([]);
	});

	it('zet een eerdere eigen bewerking terug in plaats van het vers te wissen', () => {
		const eigenTekst = ' Hij sprak harde, lange woorden.';
		bewaarOfWis(opslag, 'lukas', 6, 22, inhoud(eigenTekst), inhoud(VERS_22));
		const { keuze } = pasKeuzeToe(opslag, 'lukas', hoofdstukken(opslag), 'harde', 'scherpe', [vondst(22, 'harde', eigenTekst)], NU);
		expect(huidig(opslag, 22)).toEqual(inhoud(' Hij sprak scherpe, lange woorden.'));

		draaiKeuzeTerug(opslag, 'lukas', keuze.id);

		const vers = leesTussenstand(opslag, 'lukas', 6).verzen[22];
		expect(vers?.inhoud).toEqual(inhoud(eigenTekst));
		expect(vers?.herkomst).toBe('zelf getypt');
		expect(vers?.keuzeId).toBeUndefined();
	});

	it('meldt een keuze die niet (meer) bestaat', () => {
		expect(draaiKeuzeTerug(opslag, 'lukas', 'bestaat-niet')).toEqual(['Deze keuze staat niet meer in de lijst.']);
	});
});

describe('herkomst', () => {
	it('wordt weer "zelf getypt" zonder keuze-id als de vertaler in het vers typt', () => {
		const { keuze } = pasToe(opslag);
		expect(leesTussenstand(opslag, 'lukas', 6).verzen[22]).toMatchObject({ herkomst: 'structurele keuze', keuzeId: keuze.id });

		bewaarOfWis(opslag, 'lukas', 6, 22, inhoud(' Hij sprak scherpe woorden!'), inhoud(VERS_22));

		const vers = leesTussenstand(opslag, 'lukas', 6).verzen[22];
		expect(vers?.herkomst).toBe('zelf getypt');
		expect(vers?.keuzeId).toBeUndefined();
	});

	it('komt in de export terug, naast een vers dat de vertaler zelf typte', () => {
		const repo = '# Lukas 6\n[22]Hij sprak harde woorden.[23]Daarna zweeg hij, harde man.[24]Niets bijzonders.\n';
		const hoofdstuk: HoofdstukData = {
			nummer: 6,
			bron: parseerHoofdstuk(repo),
			vereenvoudigd: parseerHoofdstuk(repo),
			log: { verzen: [], algemeneVragen: [] },
		};
		pasToe(opslag);
		bewaarOfWis(opslag, 'lukas', 6, 24, inhoud(' Niets bijzonders hier.'), inhoud(VERS_24));

		const { verzen } = maakExport({
			boek: 'lukas',
			hoofdstuk,
			tussenstand: leesTussenstand(opslag, 'lukas', 6),
			repoCommit: null,
			toelichting: '',
			nu: NU,
		});

		expect(verzen.map((vers) => [vers.vers, vers.herkomst])).toEqual([
			[22, 'structurele keuze'],
			[23, 'structurele keuze'],
			[24, 'zelf getypt'],
		]);
	});
});
