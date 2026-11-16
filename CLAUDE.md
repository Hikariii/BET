# Instructies voor Claude

Deze repository bevat vereenvoudigde Bijbelboeken (`bijbel/<boek>/`) en het gereedschap daarvoor (`scripts/`, en de redactietool in `redactietool/`).

Lees eerst:
- `README.md`: mappen, scripts, een nieuw boek toevoegen;
- `FORMAAT.md`: het Markdown-formaat met opmaak-tags;
- `WERKPLAN.md`: stappen per hoofdstuk;
- de redactierichtlijn `richtlijn/redactierichtlijn.md` (v1.4);
- bij werk aan een boek: `bijbel/<boek>/CLAUDE.md`.

## Vertalen (per boek)
- `origineel/` (in `richtlijn/` en in elk boek) en `bron/` nooit met de hand wijzigen.
- Werk vers voor vers vanuit `bijbel/<boek>/bron/<prefix>-NN.md`; nooit vanuit geheugen of andere vertalingen (richtlijn §1).
- Lever per hoofdstuk altijd twee bestanden: `vereenvoudigd/<prefix>-NN.md` en `wijzigingslog/<prefix>-NN.md` (volg `sjablonen/wijzigingslog.md`). De onafhankelijke controle schrijft daarnaast `wijzigingslog/<prefix>-NN-controle.md` (WERKPLAN stap 3, deel C); dat is geen wijzigingslog.
- Alle opmaak-tags uit de bron moeten in hetzelfde vers terugkomen.
- Volg de precedenten in `bijbel/<boek>/referentie/precedenten.md` boven voorbeelden in de richtlijn (§25A).
- Werk `bijbel/<boek>/STATUS.md` bij (in de autonome modus doet alleen de hoofdsessie dat; vertaal- en controle-agents laten `STATUS.md` en `referentie/` met rust).

## Word
- Markdown is alleen het werkformaat; Word is het eindproduct en het reviewformaat. Review = per vers bron en vereenvoudiging naast elkaar (tabel), zodat terugvoeren naar het origineel makkelijk is. De gebruiker en redactie lezen Word, niet de .md-bestanden.
- Opmaak nooit zelf verzinnen: de export gebruikt het Word-bestand uit `boek.json` (`sjabloon`) als stijlsjabloon. Elke stijltag in `FORMAAT.md` (alineastijlen, begripsdomeinen, onderwijs) hoort bij precies één bestaande Word-stijl. Vet, onderstreept, cursief en highlight zijn directe opmaak zonder stijl; verzin daar geen stijl bij.

## Gereedschap
- Scripts werken voor elk boek via `--boek`; niets boekspecifieks (namen, paden, versaantallen) in de code. Dat hoort in `bijbel/<boek>/boek.json` of `controle.json`.
- `FORMAAT.md` is de gedeelde specificatie voor de Python-scripts en de web-tool. Verander je het formaat, dan pas je beide kanten aan.
- Bij een wijziging aan de omzet- of exportscripts: eerst de heen-en-terugtest (origineel → md → docx → md, zonder vereenvoudiging): `python3 -I scripts/controleer_heen_en_terug.py --boek <boek>`. Opmaak en tekst moeten gelijk blijven (exit 0).

## Schrijfstijl
Tekst voor mensen (chat, commits, PR's, comments, documentatie): Nederlands, gewone woorden, actieve vorm, geen em-dashes. Volledige regels: [writing-skill](.claude/skills/writing/SKILL.md). De hook `.claude/hooks/check_em_dash.py` blokkeert em-dashes, behalve in de vaste logformaten (`bijbel/*/wijzigingslog/`, `bijbel/*/referentie/`, `sjablonen/`) en in `richtlijn/`. Een geblokkeerde Write: herschrijf de zin, omzeil de hook niet.

## Intentie
Bestaat `.plan/intent-<branch>.md` (van [/intent](.claude/commands/intent.md)): lees het voor het werk en werk het in dezelfde beurt bij (en zeg dat) als de gebruiker van richting verandert of als er een keuze gemaakt wordt waar een reviewer naar zou vragen. Stel `/intent` voor bij werk dat groter is dan een kleine reparatie, als de branch nog geen intentiebestand heeft. Een PR openen: [/pr](.claude/commands/pr.md).
