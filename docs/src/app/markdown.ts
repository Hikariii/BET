// Een kleine weergave van het deel van Markdown dat de richtlijn en de logs gebruiken:
// koppen, alinea's, lijsten, citaten, tabellen, en vet, cursief en code binnen een regel.

export type Inline = { soort: 'tekst' | 'vet' | 'cursief' | 'code'; tekst: string };

export type Blok =
	| { soort: 'kop'; niveau: number; inhoud: Inline[] }
	| { soort: 'alinea'; inhoud: Inline[] }
	| { soort: 'lijst'; geordend: boolean; items: Inline[][] }
	| { soort: 'citaat'; inhoud: Inline[] }
	| { soort: 'tabel'; kop: Inline[][]; rijen: Inline[][][] };

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
const KOP = /^(#{1,6})\s+(.*)$/;
const PUNT = /^\s*[-*]\s+(.*)$/;
const NUMMER = /^\s*\d+[.)]\s+(.*)$/;
const CITAAT = /^>\s?(.*)$/;
const TABELREGEL = /^\s*\|.*\|\s*$/;
const TABELSCHEIDING = /^[\s|:-]+$/;

export function parseerInline(tekst: string): Inline[] {
	const delen: Inline[] = [];
	let vorigeEinde = 0;
	for (const treffer of tekst.matchAll(INLINE)) {
		if (treffer.index > vorigeEinde) {
			delen.push({ soort: 'tekst', tekst: tekst.slice(vorigeEinde, treffer.index) });
		}
		const [volledig, vet, cursief, code] = treffer;
		if (vet !== undefined) {
			delen.push({ soort: 'vet', tekst: vet });
		} else if (cursief !== undefined) {
			delen.push({ soort: 'cursief', tekst: cursief });
		} else if (code !== undefined) {
			delen.push({ soort: 'code', tekst: code });
		}
		vorigeEinde = treffer.index + volledig.length;
	}
	if (vorigeEinde < tekst.length) {
		delen.push({ soort: 'tekst', tekst: tekst.slice(vorigeEinde) });
	}
	return delen;
}

function tabelcellen(regel: string): string[] {
	return regel
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cel) => cel.trim());
}

export function parseerMarkdown(markdown: string): Blok[] {
	const blokken: Blok[] = [];
	const regels = markdown.split('\n');
	let index = 0;

	/** Verzamelt de regels vanaf `index` zolang `hoort` ze accepteert. */
	const verzamel = (hoort: (regel: string) => boolean): string[] => {
		const verzameld: string[] = [];
		while (index < regels.length && hoort(regels[index] ?? '')) {
			verzameld.push(regels[index] ?? '');
			index += 1;
		}
		return verzameld;
	};

	while (index < regels.length) {
		const regel = regels[index] ?? '';
		const kop = KOP.exec(regel);
		if (regel.trim() === '') {
			index += 1;
		} else if (kop !== null) {
			blokken.push({ soort: 'kop', niveau: kop[1]?.length ?? 1, inhoud: parseerInline(kop[2] ?? '') });
			index += 1;
		} else if (TABELREGEL.test(regel)) {
			const tabelregels = verzamel((kandidaat) => TABELREGEL.test(kandidaat));
			const [kopregel = '', ...overige] = tabelregels;
			const rijen = overige.filter((rij) => !TABELSCHEIDING.test(rij));
			blokken.push({
				soort: 'tabel',
				kop: tabelcellen(kopregel).map(parseerInline),
				rijen: rijen.map((rij) => tabelcellen(rij).map(parseerInline)),
			});
		} else if (PUNT.test(regel) || NUMMER.test(regel)) {
			const geordend = NUMMER.test(regel);
			const patroon = geordend ? NUMMER : PUNT;
			const items = verzamel((kandidaat) => patroon.test(kandidaat));
			blokken.push({
				soort: 'lijst',
				geordend,
				items: items.map((item) => parseerInline(patroon.exec(item)?.[1] ?? '')),
			});
		} else if (CITAAT.test(regel)) {
			const citaat = verzamel((kandidaat) => CITAAT.test(kandidaat));
			blokken.push({
				soort: 'citaat',
				inhoud: parseerInline(citaat.map((rij) => CITAAT.exec(rij)?.[1] ?? '').join(' ')),
			});
		} else {
			const alinea = verzamel(
				(kandidaat) =>
					kandidaat.trim() !== '' &&
					!KOP.test(kandidaat) &&
					!TABELREGEL.test(kandidaat) &&
					!PUNT.test(kandidaat) &&
					!NUMMER.test(kandidaat) &&
					!CITAAT.test(kandidaat),
			);
			blokken.push({ soort: 'alinea', inhoud: parseerInline(alinea.join(' ')) });
		}
	}
	return blokken;
}
