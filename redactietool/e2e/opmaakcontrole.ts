import type { Page } from '@playwright/test';
import { wachtOpHoofdstuk } from './hulpen';

export type Opmaakuitkomst = { stukken: number; afwijkingen: string[] };

/**
 * De Bijbeltekst in de leesrijen heeft alleen kleuren en achtergronden uit het Word-sjabloon (inline) en is verder zwart.
 * Een hoofdstuk zonder stukken telt als afwijking: dan is er niets gecontroleerd.
 */
export async function controleerOpmaak(pagina: Page, hoofdstuk: number): Promise<Opmaakuitkomst> {
	await wachtOpHoofdstuk(pagina, hoofdstuk);
	const uitkomst = await pagina.evaluate(() => {
		const afwijkingen: string[] = [];
		let stukken = 0;
		for (const element of document.querySelectorAll<HTMLElement>('table.verzen tr.vers > td:not(.regels) :is(p, p span)')) {
			stukken++;
			const stijl = getComputedStyle(element);
			let verwacht = 'rgb(0, 0, 0)';
			for (let eigen: HTMLElement | null = element; eigen !== null && eigen.tagName !== 'TD'; eigen = eigen.parentElement) {
				if (eigen.style.color === '') continue;
				const proef = document.createElement('span');
				proef.style.color = eigen.style.color;
				document.body.append(proef);
				verwacht = getComputedStyle(proef).color;
				proef.remove();
				break;
			}
			const begin = (element.textContent ?? '').slice(0, 20);
			if (stijl.color !== verwacht) afwijkingen.push(`${begin}: ${stijl.color} in plaats van ${verwacht}`);
			if (stijl.backgroundColor !== 'rgba(0, 0, 0, 0)' && element.style.backgroundColor === '') {
				afwijkingen.push(`${begin}: achtergrond ${stijl.backgroundColor} komt niet uit Word`);
			}
		}
		return { stukken, afwijkingen };
	});
	if (uitkomst.stukken === 0) uitkomst.afwijkingen.push('geen enkel stuk gevonden om te controleren');
	return uitkomst;
}
