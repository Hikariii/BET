/**
 * Ontwerpproef: laadt met `?ontwerp=a` (tot f) een variant van de opmaak bovenop `app.css`,
 * Rechtsonder staat een keuzestrook om te wisselen.
 * Verdwijnt zodra een richting gekozen is en de basis in `app.css` staat.
 */
const VARIANTEN = import.meta.glob('./variant-*.css');
/** Layouts die met de gekozen letters en toolkleur getoond worden (uit de letterproef). */
const MET_GEKOZEN_LETTERS = ['d', 'e', 'f'];
const NAMEN = ['huidig', ...Object.keys(VARIANTEN).map((pad) => pad.replace('./variant-', '').replace('.css', '')).sort()];

export async function laadOntwerpVariant(): Promise<void> {
	const parameters = new URLSearchParams(location.search);
	const gekozen = parameters.get('ontwerp') ?? 'huidig';
	const laad = VARIANTEN[`./variant-${gekozen}.css`];
	if (laad !== undefined) await laad();
	if (MET_GEKOZEN_LETTERS.includes(gekozen)) await import('./keuze-letters-kleur.css');
	const blok = Number(parameters.get('blok') ?? '6');
	const tekst = parameters.get('tekst');
	if (tekst === 'perrij') toonLettersPerBlok('boek', TEKSTLETTERS, blok);
	else if (tekst !== null) zetLetter('boek', tekst);
	const tool = parameters.get('tool');
	if (tool === 'perrij') toonLettersPerBlok('tool', TOOLLETTERS, blok);
	else if (tool !== null) zetLetter('tool', tool);
	const toolkleur = parameters.get('toolkleur');
	if (toolkleur !== null && /^[0-9a-f]{6}$/i.test(toolkleur)) zetToolkleur(`#${toolkleur}`);
	if (parameters.get('open') === 'naslag') openNaslag();
	toonKeuzestrook(gekozen);
}

/** De tekstletters die nog in de proef zitten; de tekstletter wordt los van de toolletter gekozen. */
const TEKSTLETTERS = ['Atkinson Hyperlegible Next', 'Public Sans', 'Noto Sans'] as const;

/** De toolletters uit de combinaties die over zijn (1, 2, 3, 5, 7, 9). */
const TOOLLETTERS = ['IBM Plex Sans Condensed', 'Inter', 'IBM Plex Mono', 'DM Mono', 'Source Code Pro', 'Red Hat Mono'] as const;

type Soort = 'boek' | 'tool';

const GEWICHTEN: Record<Soort, string> = { boek: 'ital,wght@0,400;0,600;0,700;1,400;1,700', tool: 'wght@400;500' };
const TERUGVAL: Record<Soort, string> = { boek: 'sans-serif', tool: 'system-ui, monospace' };
const LABEL: Record<Soort, string> = { boek: 'Tekstletter', tool: 'Toolletter' };

function laadGoogleFonts(soort: Soort, namen: readonly string[]): void {
	const koppeling = document.createElement('link');
	koppeling.rel = 'stylesheet';
	koppeling.href = `https://fonts.googleapis.com/css2?${namen.map((naam) => `family=${naam.replaceAll(' ', '+')}:${GEWICHTEN[soort]}`).join('&')}&display=swap`;
	document.head.append(koppeling);
}

function familie(soort: Soort, naam: string): string {
	return `'${naam}', ${TERUGVAL[soort]}`;
}

function zetLetter(soort: Soort, naam: string): void {
	laadGoogleFonts(soort, [naam]);
	document.documentElement.style.setProperty(`--${soort}`, familie(soort, naam));
}

/** Of een versrij tekst met een kleur uit het Word-sjabloon heeft (Jezuswoorden, domeinen); die kleur staat inline. */
function heeftKleur(rij: HTMLTableRowElement): boolean {
	return rij.querySelector('td:not(.regels) [style*="color"]') !== null;
}

/**
 * Verdeelt de verzen in blokken van minstens `blok` verzen met minstens één gekleurd vers,
 * geeft elk blok een andere letter (rondlopend) voor tekst of tool, en zet de naam boven het eerste vers van het blok.
 * Buiten de verzen (zijbalk, naslag) geldt de eerste letter van de lijst.
 */
function toonLettersPerBlok(soort: Soort, namen: readonly string[], blok: number): void {
	laadGoogleFonts(soort, namen);
	document.documentElement.style.setProperty(`--${soort}`, familie(soort, namen[0] ?? ''));
	const labelplek = soort === 'boek' ? 'td:not(.regels)' : 'td.regels';
	const stijl = document.createElement('style');
	stijl.textContent = `table.verzen ${labelplek}[data-letter-${soort}]::before{content:'${LABEL[soort]}: ' attr(data-letter-${soort});display:block;margin-bottom:0.35rem;font:500 11px/1.2 var(--tool);color:#a61816}`;
	// De layout zet de toolletter op de hele tabel; per rij moeten versnummer en knoppen hem opnieuw uit de variabele halen.
	if (soort === 'tool') stijl.textContent += 'table.verzen tr.vers > th, table.verzen tr.vers :is(.versacties, .versacties button, .verseditor-acties, .verseditor-acties button){font-family:var(--tool)}';
	document.head.append(stijl);
	const pasToe = () => {
		let blokNummer = 0;
		let inBlok = 0;
		let kleurInBlok = false;
		for (const rij of document.querySelectorAll<HTMLTableRowElement>('table.verzen tr.vers')) {
			if (inBlok >= Math.max(1, blok) && kleurInBlok) {
				blokNummer += 1;
				inBlok = 0;
				kleurInBlok = false;
			}
			const naam = namen[blokNummer % namen.length] ?? '';
			const waarde = familie(soort, naam);
			if (rij.style.getPropertyValue(`--${soort}`) !== waarde) rij.style.setProperty(`--${soort}`, waarde);
			const plek = rij.querySelector(labelplek);
			const label = inBlok === 0 ? naam : null;
			if (plek !== null && plek.getAttribute(`data-letter-${soort}`) !== label) {
				if (label === null) plek.removeAttribute(`data-letter-${soort}`);
				else plek.setAttribute(`data-letter-${soort}`, label);
			}
			inBlok += 1;
			kleurInBlok ||= heeftKleur(rij);
		}
	};
	new MutationObserver(pasToe).observe(document.body, { childList: true, subtree: true });
}

/** De plekken met Bijbeltekst (zoals in variant a); die blijven Word-zwart, de rest van de tool krijgt de toolkleur. */
const BIJBELTEKST = [
	'.verzen td:not(.regels)',
	'.verseditor .ProseMirror',
	'.vervangen .context',
	'.besloten-tabel tbody th',
	'.besloten-tabel tbody td:nth-child(2)',
	'.gevonden tbody th',
	'.gevonden .vertaling',
	'.zijpaneel .tabelrand:not(.markdown *) table td:nth-child(1)',
	'.zijpaneel .tabelrand:not(.markdown *) table td:nth-child(2)',
	'.zijpaneel .markdown table td:nth-child(2)',
	'.zijpaneel .markdown table td:nth-child(3)',
].join(', ');

function zetToolkleur(kleur: string): void {
	document.documentElement.style.setProperty('--tekst', kleur);
	const stijl = document.createElement('style');
	stijl.textContent = `:root, body, .zijbalk, .zijpaneel, h1, h2, h3, .indeling table.verzen td.regels, .indeling table.verzen tr.regels-onder td, .indeling table.verzen thead th { color: ${kleur}; } :is(${BIJBELTEKST}) { color: #000; }`;
	document.head.append(stijl);
}

/** Opent de naslag van de eerste verwijzing in het hoofdstuk, zodat de pagina met het zijpaneel open begint. */
function openNaslag(): void {
	const waarnemer = new MutationObserver(() => {
		const knop = document.querySelector<HTMLButtonElement>('button.verwijzing');
		if (knop === null) return;
		waarnemer.disconnect();
		knop.click();
		window.scrollTo(0, 0);
	});
	waarnemer.observe(document.body, { childList: true, subtree: true });
}

function knop(tekst: string, parameter: string, waarde: string | null, actief: boolean): HTMLAnchorElement {
	const koppeling = document.createElement('a');
	const adres = new URL(location.href);
	if (waarde === null) adres.searchParams.delete(parameter);
	else adres.searchParams.set(parameter, waarde);
	koppeling.href = adres.toString();
	koppeling.textContent = tekst;
	koppeling.style.cssText = `padding:0.125rem 0.375rem;color:#000;text-decoration:none;${actief ? 'background:#000;color:#fff' : ''}`;
	if (actief) koppeling.setAttribute('aria-current', 'true');
	return koppeling;
}

function toonKeuzestrook(gekozen: string): void {
	const strook = document.createElement('nav');
	strook.setAttribute('aria-label', 'Ontwerpvariant');
	strook.style.cssText =
		'position:fixed;right:0.5rem;bottom:0.5rem;z-index:1000;display:flex;gap:0.25rem;padding:0.25rem;background:#fff;border:1px solid #000;font:12px/1.2 system-ui,sans-serif';
	for (const naam of NAMEN) strook.append(knop(naam, 'ontwerp', naam === 'huidig' ? null : naam, naam === gekozen));
	document.body.append(strook);
}
