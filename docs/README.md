# Redactietool (docs/)

De broncode van de tool. Het plan staat in [`PLAN.md`](PLAN.md). Nu kan de tool lezen: een hoofdstuk per scherm met bron, vereenvoudiging en regels naast elkaar, en een zijbalk met alle hoofdstukken. Bewerken en de rest van het plan volgen.

| Map | Inhoud |
|---|---|
| `src/formaat/` | parser en serializer voor het Markdown-formaat uit [`../FORMAAT.md`](../FORMAAT.md) |
| `src/bouw/` | bouwscript: zet `bijbel/` en de richtlijn om naar JSON in `public/data/` |
| `src/app/` | de Preact-app die die JSON toont |
| `src/data/` | het gegevenscontract (types) tussen bouwscript en app |
| `src/log/`, `src/referentie/`, `src/sjabloon/` | de lezers voor wijzigingslogs, referentiebestanden, `STATUS.md`, richtlijn en Word-stijlen |

## Draaien

Node staat vast in `../mise.toml`. Vanuit `docs/`:

```sh
mise x -- npm ci            # eenmalig
mise x -- npm run dev       # bouwt de data en start de dev-server (http://localhost:5173/)
mise x -- npm run build     # bouwt de data en de site in dist/
mise x -- npm run preview   # toont dist/ zoals op Pages (http://localhost:4173/BET/)
mise x -- npm run data      # alleen de data opnieuw bouwen
```

`npm run data` (`src/bouw/start.ts`) leest per boek in `bijbel/<boek>/` het bestand `boek.json`, `STATUS.md`, `bron/`, `vereenvoudigd/`, `wijzigingslog/` en `referentie/`, de richtlijn in `richtlijn/`, en de stijlen uit `word/styles.xml` van het Word-sjabloon. Het schrijft naar `public/data/` (staat in `.gitignore`); de vorm staat bovenin `src/data/types.ts`. Na een wijziging in `bijbel/` draai je `npm run data` opnieuw; de dev-server leest dan de nieuwe bestanden.

Een hoofdstuk zonder `vereenvoudigd/`- of logbestand toont de bron met lege kolommen. Een hoofdstuk zonder rij in `STATUS.md` heeft de status `nog niet begonnen`.

Adressen: `#/lukas/9` is hoofdstuk 9, `#/lukas/9/22` vers 22 (dat vers wordt gekozen en in beeld gebracht).

De site gaat via GitHub Actions (`../.github/workflows/pages.yml`) naar Pages. Eenmalig in de repo-instellingen: Pages, bron "GitHub Actions". Het basispad `/BET/` staat in `vite.config.ts`.

## Tests draaien

Node staat vast in `../mise.toml`. Vanuit de hoofdmap van de repo:

```sh
mise x -- npm --prefix docs ci        # eenmalig
mise x -- npm --prefix docs test      # alle tests
mise x -- npm --prefix docs run typecheck
```

De tests hebben `python3` nodig (alleen de standaardbibliotheek).

## Wat de tests bewijzen

| Bestand | Controleert |
|---|---|
| `src/formaat/parseer.test.ts` | Elke regel van `FORMAAT.md` op kleine invoer, ook de weigeringen met regelnummer |
| `src/formaat/serialiseer.test.ts` | Opmaak in de nestingvolgorde, tags sluiten en heropenen rond een versnummer |
| `src/formaat/pariteit.test.ts` | Voor alle bestanden in `bijbel/lukas/bron/` en `vereenvoudigd/` hetzelfde resultaat als `parse_md` in `scripts/md_naar_docx.py`. Een verschil staat met bestand, regel en stuk in de foutmelding |
| `src/formaat/heenEnTerug.test.ts` | Parseren en terugschrijven geeft voor al die bestanden byte-gelijk de oorspronkelijke tekst |
| `src/bouw/bouw.test.ts` | Het bouwscript maakt op de echte repo JSON voor alle 24 hoofdstukken in de vorm van `src/data/types.ts`, met in elke bron de versnummers uit `boek.json` |
| `src/app/groepeerPerVers.test.ts` | Bron en vereenvoudiging per vers, ook voor een vers over meer alinea's |
| `src/app/vertaalvragen.test.ts` | Welke vertaalvraag bij welk vers hoort, en het aantal open vragen per hoofdstuk |
| `src/app/stijl.test.ts` | Opmaak naar CSS, met kleuren uit het sjabloon en `src/data/stijlkoppeling.ts` |

De pariteitstest draait `scripts/formaat_naar_json.py --boek lukas`, dat de uitvoer van `parse_md` als JSON geeft. Dat script geeft ook de lijsten met alineastijlen, domeinen en directe opmaak, zodat de test controleert dat TypeScript dezelfde kent.

## Gegevensmodel

Een hoofdstuk is een lijst alinea's, één per regel van het bestand: `titel`, `leeg` of `tekst`. Een tekstalinea heeft een `stijl` (of `null`) en `stukken`: tekststukken met een lijst `opmaak` (van buiten naar binnen) en versnummers als eigen stuk zonder opmaak. De spaties rond `[n]` blijven in de tekststukken staan.

## Strenger dan Python

De TypeScript-parser weigert wat `parse_md` toelaat maar `FORMAAT.md` niet: tags in de verkeerde volgorde of die elkaar kruisen, een versnummer binnen een tag, meer dan twee lege regels achter elkaar, een regel met alleen witruimte, en meer dan één spatie na `@stijl`. Anders zou terugschrijven de tekst ongemerkt veranderen. Een BOM en CRLF worden net als in Python genegeerd en bij het terugschrijven niet teruggezet.
