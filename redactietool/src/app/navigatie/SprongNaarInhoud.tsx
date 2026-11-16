type Props = {
	/** Op een hoofdstuk gaat de sprong naar het eerste vers, elders naar het begin van de inhoud. */
	opHoofdstuk: boolean;
};

/** De eerste tabstop van de pagina: slaat de balk over. Een gewone link zou het adres (`#`) van de tool veranderen, dus het is een link die alleen de focus verzet. */
export function SprongNaarInhoud({ opHoofdstuk }: Props) {
	const spring = (gebeurtenis: MouseEvent) => {
		gebeurtenis.preventDefault();
		const eerstVers = opHoofdstuk ? document.querySelector<HTMLElement>('tr.vers .versklik') : null;
		(eerstVers ?? document.querySelector<HTMLElement>('main'))?.focus();
	};
	return (
		<a class="sprong-naar-inhoud" href="#inhoud" onClick={spring}>
			{opHoofdstuk ? 'Naar de verzen' : 'Naar de inhoud'}
		</a>
	);
}
