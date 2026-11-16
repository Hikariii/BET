import { ontsnapRegexTekens } from './zoekEnVervang';

/** Lidwoorden en bezittelijke woorden die in het Nederlands voor een zelfstandig naamwoord kunnen staan. */
const LIDWOORDEN = ['de', 'het', 'een', 'zijn', 'mijn', 'jouw', 'je', 'hun', 'haar', 'onze', 'ons'];

/** Uitgangen die een woord kan krijgen (meervoud, verkleinwoord, verleden tijd, deelwoord, bezit). Een lege uitgang is het woord zelf. */
const UITGANGEN = ['', 'e', 'en', 's', "'s", 'je', 'tje', 'de', 'den', 'te', 'ten', 't', 'd'];

/** Varianten zoeken we alleen bij een hoofdwoord van zoveel letters: een korter woord geeft te veel valse treffers. */
const MINIMUM_LETTERS = 4;

const WOORDGRENS_VOOR = '(?<![\\p{L}\\p{N}])';
const WOORDGRENS_NA = '(?![\\p{L}\\p{N}])';

const LIDWOORD_PATROON = `(?:(?:${LIDWOORDEN.join('|')})\\s+)?`;

/** Beide apostroffen komen in de teksten voor. */
const UITGANG_PATROON = UITGANGEN.map((uitgang) => ontsnapRegexTekens(uitgang).replace("'", "['’]")).join('|');

function isLidwoord(woord: string): boolean {
	return LIDWOORDEN.includes(woord.toLowerCase());
}

/** De woorden van het hoofdwoord: de zoekterm zonder een lidwoord of bezittelijk woord aan het begin. */
function hoofdwoord(zoekterm: string): string[] {
	const woorden = zoekterm.trim().split(/\s+/u);
	const [eerste, ...rest] = woorden;
	return eerste !== undefined && rest.length > 0 && isLidwoord(eerste) ? rest : woorden;
}

/** Een stam op `eër` heeft meervoud `eën` en andersom (Farizeeër, Farizeeën). */
function stammen(woord: string): string[] {
	if (woord.toLowerCase().endsWith('eër')) return [woord, `${woord.slice(0, -3)}eën`];
	if (woord.toLowerCase().endsWith('eën')) return [woord, `${woord.slice(0, -3)}eër`];
	return [woord];
}

/** De gevonden vorm als sleutel voor een variant: kleine letters, witruimte als één spatie. */
export function variantSleutel(gevonden: string): string {
	return gevonden.toLowerCase().replace(/\s+/gu, ' ');
}

/**
 * Een patroon (vlaggen `g`, `i`, `u`) voor de andere vormen van de zoekterm: met een ander lidwoord of bezittelijk woord, zonder lidwoord,
 * en bij een hoofdwoord van één woord ook met een uitgang (en eër/eën gewisseld). Een woordgrens is verplicht.
 * Het patroon vindt ook de zoekterm zelf; de aanroeper laat die weg.
 * Geen patroon (`null`) bij een hoofdwoord van minder dan `MINIMUM_LETTERS` letters.
 */
export function variantPatroon(zoekterm: string): RegExp | null {
	if (zoekterm.trim() === '') return null;
	const woorden = hoofdwoord(zoekterm);
	const aantalLetters = [...woorden.join('')].filter((teken) => /\p{L}/u.test(teken)).length;
	if (aantalLetters < MINIMUM_LETTERS) return null;
	const kern =
		woorden.length === 1
			? `(?:${stammen(woorden.join('')).map(ontsnapRegexTekens).join('|')})(?:${UITGANG_PATROON})`
			: woorden.map(ontsnapRegexTekens).join('\\s+');
	return new RegExp(`${WOORDGRENS_VOOR}${LIDWOORD_PATROON}${kern}${WOORDGRENS_NA}`, 'giu');
}
