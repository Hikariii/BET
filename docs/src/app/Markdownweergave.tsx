import { parseerInline, parseerMarkdown, type Blok, type Inline } from './markdown';

export function InlineTekst({ inhoud }: { inhoud: readonly Inline[] }) {
	return (
		<>
			{inhoud.map((deel) => {
				switch (deel.soort) {
					case 'vet':
						return <strong>{deel.tekst}</strong>;
					case 'cursief':
						return <em>{deel.tekst}</em>;
					case 'code':
						return <code>{deel.tekst}</code>;
					case 'tekst':
						return deel.tekst;
				}
			})}
		</>
	);
}

/** Dezelfde weergave voor een losse regel tekst, bijvoorbeeld een logregel. */
export function InlineMarkdown({ tekst }: { tekst: string }) {
	return <InlineTekst inhoud={parseerInline(tekst)} />;
}

function BlokWeergave({ blok }: { blok: Blok }) {
	switch (blok.soort) {
		case 'kop': {
			// De sectietitel staat al als kop van het paneel; koppen in de tekst beginnen een niveau dieper.
			const Kop = `h${Math.min(blok.niveau + 2, 6)}` as 'h3' | 'h4' | 'h5' | 'h6';
			return (
				<Kop>
					<InlineTekst inhoud={blok.inhoud} />
				</Kop>
			);
		}
		case 'alinea':
			return (
				<p>
					<InlineTekst inhoud={blok.inhoud} />
				</p>
			);
		case 'citaat':
			return (
				<blockquote>
					<InlineTekst inhoud={blok.inhoud} />
				</blockquote>
			);
		case 'lijst': {
			const Lijst = blok.geordend ? 'ol' : 'ul';
			return (
				<Lijst>
					{blok.items.map((item) => (
						<li>
							<InlineTekst inhoud={item} />
						</li>
					))}
				</Lijst>
			);
		}
		case 'tabel':
			return (
				<div class="tabelrand">
					<table>
						<thead>
							<tr>
								{blok.kop.map((cel) => (
									<th scope="col">
										<InlineTekst inhoud={cel} />
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{blok.rijen.map((rij) => (
								<tr>
									{rij.map((cel) => (
										<td>
											<InlineTekst inhoud={cel} />
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
	}
}

export function Markdownweergave({ markdown }: { markdown: string }) {
	return (
		<div class="markdown">
			{parseerMarkdown(markdown).map((blok) => (
				<BlokWeergave blok={blok} />
			))}
		</div>
	);
}
