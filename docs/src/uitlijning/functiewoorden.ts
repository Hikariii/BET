/** Lidwoorden, voegwoorden, voorzetsels, voornaamwoorden en hulpwerkwoorden die in bijna elke zin staan. Ze zeggen weinig over een vertaalkeuze en vormen vaak een toevallig anker in de woorduitlijning. */
const FUNCTIEWOORDEN: ReadonlySet<string> = new Set([
	'de', 'het', 'een', 'en', 'of', 'maar', 'want', 'dus', 'dat', 'die', 'dit', 'deze', 'dan', 'toen', 'als',
	'van', 'in', 'op', 'aan', 'met', 'voor', 'naar', 'uit', 'bij', 'door', 'over', 'om', 'te', 'tot', 'tegen', 'zonder',
	'ik', 'je', 'jij', 'jou', 'jouw', 'hij', 'hem', 'zijn', 'zij', 'haar', 'wij', 'we', 'ons', 'onze', 'jullie', 'hen', 'hun', 'ze', 'mij', 'mijn', 'u',
	'is', 'was', 'waren', 'wordt', 'werd', 'worden', 'werden', 'heeft', 'had', 'hebben', 'hadden', 'zal', 'zul', 'zult', 'zullen', 'zou', 'zouden',
	'er', 'niet', 'ook', 'nog', 'al', 'wat', 'wie', 'waar', 'hoe', 'zo', 'daar', 'toch', 'nu',
]);

export function isFunctiewoord(vergelijkvorm: string): boolean {
	return FUNCTIEWOORDEN.has(vergelijkvorm);
}
