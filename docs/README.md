# Redactietool (docs/)

De broncode van de tool. Het plan staat in [`PLAN.md`](PLAN.md). Nu is alleen `src/formaat/` er: de parser en serializer voor het Markdown-formaat uit [`../FORMAAT.md`](../FORMAAT.md).

## Tests draaien

Node staat vast in `../mise.toml`. Vanuit de hoofdmap van de repo:

```sh
mise x -- npm --prefix docs install   # eenmalig
mise x -- npm --prefix docs test      # alle tests
mise x -- npm --prefix docs run typecheck
```

De tests hebben `python3` nodig (alleen de standaardbibliotheek). Er is geen build; die komt met de Vite-app.

## Wat de tests bewijzen

| Bestand | Controleert |
|---|---|
| `src/formaat/parseer.test.ts` | Elke regel van `FORMAAT.md` op kleine invoer, ook de weigeringen met regelnummer |
| `src/formaat/serialiseer.test.ts` | Opmaak in de nestingvolgorde, tags sluiten en heropenen rond een versnummer |
| `src/formaat/pariteit.test.ts` | Voor alle bestanden in `bijbel/lukas/bron/` en `vereenvoudigd/` hetzelfde resultaat als `parse_md` in `scripts/md_naar_docx.py`. Een verschil staat met bestand, regel en stuk in de foutmelding |
| `src/formaat/heenEnTerug.test.ts` | Parseren en terugschrijven geeft voor al die bestanden byte-gelijk de oorspronkelijke tekst |

De pariteitstest draait `scripts/formaat_naar_json.py --boek lukas`, dat de uitvoer van `parse_md` als JSON geeft. Dat script geeft ook de lijsten met alineastijlen, domeinen en directe opmaak, zodat de test controleert dat TypeScript dezelfde kent.

## Gegevensmodel

Een hoofdstuk is een lijst alinea's, één per regel van het bestand: `titel`, `leeg` of `tekst`. Een tekstalinea heeft een `stijl` (of `null`) en `stukken`: tekststukken met een lijst `opmaak` (van buiten naar binnen) en versnummers als eigen stuk zonder opmaak. De spaties rond `[n]` blijven in de tekststukken staan.

## Strenger dan Python

De TypeScript-parser weigert wat `parse_md` toelaat maar `FORMAAT.md` niet: tags in de verkeerde volgorde of die elkaar kruisen, een versnummer binnen een tag, meer dan twee lege regels achter elkaar, een regel met alleen witruimte, en meer dan één spatie na `@stijl`. Anders zou terugschrijven de tekst ongemerkt veranderen. Een BOM en CRLF worden net als in Python genegeerd en bij het terugschrijven niet teruggezet.
