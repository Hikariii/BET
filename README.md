# Bijbelboeken – vereenvoudigde versie

Werkruimte voor het vereenvoudigen van Bijbelboeken voor kinderen van 8–10 jaar, met het gereedschap daarvoor. We beginnen met Lukas.

De inhoudelijke regels staan in de redactierichtlijn. Dit document beschrijft **de mappen en het gereedschap**. Het proces per hoofdstuk staat in [`WERKPLAN.md`](WERKPLAN.md), het tekstformaat in [`FORMAAT.md`](FORMAAT.md).

## Mappen

| Map / bestand | Inhoud | Wie schrijft erin |
|---|---|---|
| `richtlijn/` | Redactierichtlijn in Markdown (geldt voor alle boeken); `richtlijn/origineel/` bevat de aangeleverde Word-versie. **Origineel nooit wijzigen.** | redactie |
| `sjablonen/` | Sjablonen, zoals het wijzigingslog. | - |
| `scripts/` | Omzetten uit Word, controles, terugzetten naar Word. Werken voor elk boek (`--boek`). | - |
| `.claude/` | Configuratie voor Claude Code: skills, `/intent` en `/pr`, rules en een hook tegen em-dashes. Zie [`.claude/README.md`](.claude/README.md). | - |
| `docs/` | Web-tool om vertalingen te redigeren en naast het origineel te vergelijken (gepland). | - |
| `bijbel/<boek>/` | Alles van één Bijbelboek, zie hieronder. | |
| `FORMAAT.md` | Het Markdown-formaat met opmaak-tags: de gedeelde specificatie voor de scripts en de web-tool. | - |
| `WERKPLAN.md` | De stappen per hoofdstuk (en de autonome modus). | - |
| `TAKEN.md` | Openstaande taken voor het gereedschap. Taken per boek staan in het boek. | - |

### Per boek: `bijbel/<boek>/`

| Map / bestand | Inhoud | Wie schrijft erin |
|---|---|---|
| `boek.json` | Naam, bestandsprefix, Word-stijlsjabloon en versindeling (zie `scripts/boek.py`). | - |
| `controle.json` | Optioneel: extra oude vormen uit de precedenten van dit boek, voor het controlescript. | hoofdsessie |
| `CLAUDE.md` | Wat specifiek voor dit boek geldt. | - |
| `STATUS.md` | Per hoofdstuk: waar het staat. | hoofdsessie |
| `TAKEN.md` | Openstaande taken en beslissingen voor dit boek. | hoofdsessie |
| `origineel/` | De aangeleverde Word-bestanden. **Nooit wijzigen.** Nieuwe versies komen naast de oude. | alleen aanleveren |
| `bron/` | De brontekst per hoofdstuk, automatisch uit `origineel/` gehaald. **Niet met de hand bewerken.** | `scripts/` |
| `vereenvoudigd/` | De vereenvoudigde tekst per hoofdstuk: zelfde bestandsnamen en tags als `bron/`. | Claude → redactie |
| `wijzigingslog/` | Per hoofdstuk: per vers wat er veranderd is en op grond van welke regel. Hierop doet de redactie de review. | Claude → redactie |
| `referentie/` | Precedenten, open vragen en andere afgeleide besluiten voor dit boek (§25). | redactie / hoofdsessie |
| `export/` | Gegenereerde Word-bestanden. Niet in git; altijd opnieuw te maken. | `scripts/` |

Boeken nu: [`bijbel/lukas/`](bijbel/lukas/).

Versies houden we bij met git (commits en tags), niet met versienummers in bestandsnamen. Git-tags per boek en hoofdstuk: `lukas-04-v1.0`.

## Scripts

Draai vanuit de hoofdmap, met `python3 -I`. Alleen de standaardbibliotheek is nodig. `--boek lukas` mag weg zolang er maar één boek is.

```sh
B=bijbel/lukas

# Word -> bron/ (zonder argumenten: het sjabloon uit boek.json naar $B/bron/)
python3 -I scripts/docx_naar_md.py --boek lukas

# Controle van de omzetting: md tegen het Word-bestand
python3 -I scripts/controleer_docx_md.py --boek lukas

# Controle van een vereenvoudigd hoofdstuk tegen de bron (WERKPLAN stap 3)
python3 -I scripts/controleer_hoofdstuk.py 4-24 --boek lukas

# Reviewdocument (tabel per vers) en doorlopend document
python3 -I scripts/md_naar_docx.py --boek lukas review --hoofdstuk 4 -o $B/export/lukas-04-review.docx
python3 -I scripts/md_naar_docx.py --boek lukas doc $B/vereenvoudigd/lukas-*.md -o $B/export/lukas-vereenvoudigd.docx

# parse_md-uitvoer als JSON (voor de pariteitstest van de tool, zie docs/README.md)
python3 -I scripts/formaat_naar_json.py --boek lukas

# Heen-en-terugtest: bron zonder vereenvoudiging terug naar Word
python3 -I scripts/md_naar_docx.py --boek lukas doc $B/bron/lukas-*.md -o $B/export/heen-en-terug.docx
```

## Een nieuw boek toevoegen

1. Maak `bijbel/<boek>/` met `origineel/` (het aangeleverde Word-bestand) en `export/.gitkeep`.
2. Schrijf `boek.json` (kijk naar `bijbel/lukas/boek.json`). Het Word-bestand moet dezelfde stijlnamen gebruiken als in `FORMAAT.md` (Jezuswoorden, GodsStem, Bblhfdstk, …). Zo niet: eerst de scripts uitbreiden, niets zelf verzinnen.
3. `python3 -I scripts/docx_naar_md.py --boek <boek>` en daarna `controleer_docx_md.py` en de heen-en-terugtest.
4. Maak `STATUS.md`, `TAKEN.md`, `CLAUDE.md` en `referentie/` aan, en laat de redactie beslissen welke referentiehoofdstukken en precedenten voor dit boek gelden (richtlijn §25A, §26).
5. Daarna per hoofdstuk volgens `WERKPLAN.md`.
