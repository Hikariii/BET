# Instructies voor Claude

Deze repository bevat vereenvoudigde Bijbelboeken (`bijbel/<boek>/`) en het gereedschap daarvoor (`scripts/`, en straks een web-tool in `docs/`).

Lees eerst:
- `README.md`: mappen, scripts, een nieuw boek toevoegen;
- `FORMAAT.md`: het Markdown-formaat met opmaak-tags;
- `WERKPLAN.md`: stappen per hoofdstuk;
- de redactierichtlijn `richtlijn/redactierichtlijn.md` (v1.4);
- bij werk aan een boek: `bijbel/<boek>/CLAUDE.md`.

## Vertalen (per boek)
- `origineel/` (in `richtlijn/` en in elk boek) en `bron/` nooit met de hand wijzigen.
- Werk vers voor vers vanuit `bijbel/<boek>/bron/<prefix>-NN.md`; nooit vanuit geheugen of andere vertalingen (richtlijn §1).
- Lever per hoofdstuk altijd twee bestanden: `vereenvoudigd/<prefix>-NN.md` en `wijzigingslog/<prefix>-NN.md` (volg `sjablonen/wijzigingslog.md`).
- Alle opmaak-tags uit de bron moeten in hetzelfde vers terugkomen.
- Volg de precedenten in `bijbel/<boek>/referentie/precedenten.md` boven voorbeelden in de richtlijn (§25A).
- Werk `bijbel/<boek>/STATUS.md` bij (in de autonome modus doet alleen de hoofdsessie dat; vertaal- en controle-agents laten `STATUS.md` en `referentie/` met rust).

## Word
- Markdown is alleen het werkformaat; Word is het eindproduct en het reviewformaat. Review = per vers bron en vereenvoudiging naast elkaar (tabel), zodat terugvoeren naar het origineel makkelijk is. De gebruiker en redactie lezen Word, niet de .md-bestanden.
- Opmaak nooit zelf verzinnen: de export gebruikt het Word-bestand uit `boek.json` (`sjabloon`) als stijlsjabloon. Elke tag in `FORMAAT.md` hoort bij precies één bestaande Word-stijl.

## Gereedschap
- Scripts werken voor elk boek via `--boek`; niets boekspecifieks (namen, paden, versaantallen) in de code. Dat hoort in `bijbel/<boek>/boek.json` of `controle.json`.
- `FORMAAT.md` is de gedeelde specificatie voor de Python-scripts en de web-tool. Verander je het formaat, dan pas je beide kanten aan.
- Bij een wijziging aan de omzet- of exportscripts: eerst de heen-en-terugtest (origineel → md → docx, zonder vereenvoudiging) en controleren dat opmaak en tekst gelijk blijven.
