# Redactietool

De broncode van de tool. Het plan staat in [`stap1-plan.md`](stap1-plan.md) (afgesloten: uitgangspunten, architectuur, fase 0 tot 5) en [`stap2-plan.md`](stap2-plan.md) (wat nog moet). De tool kan lezen, begrippen en vertaalvragen tonen, per vers bewerken, zoeken en vervangen over het boek, en het resultaat naar Word en naar Claude brengen. Hij staat op https://hikariii.github.io/BET/.

| Map | Inhoud |
|---|---|
| `src/formaat/` | parser en serializer voor het Markdown-formaat uit [`../FORMAAT.md`](../FORMAAT.md) |
| `src/bouw/` | bouwscript: zet `bijbel/` en de richtlijn om naar JSON in `public/data/` |
| `src/app/` | de Preact-app die die JSON toont. De boekpagina heeft een bovenbalk (boekbalk met de plekken van het boek als tabbladen, Opgeslagen, de grootte en Help; hoofdstukbalk met titel, hoofdstukstrip en acties). De css daarvan staat in `src/app/indeling.css`, die `main.tsx` na `vormgeving.css` laadt |
| `src/help/`, `src/app/help/` | de help: de tekst als Markdown per onderdeel (`src/help/*.md`) en het venster dat hem toont (knop Help in de boekbalk, toets `?`). In de tekst vullen `{{plek:…}}`, `{{boek}}`, `{{back-upbestand}}` en `{{exportbestand}}` namen in uit de code, `{{legenda}}` toont de legenda uit het Word-sjabloon en `{{wijs sleutel \| naam \| waar}}` maakt een regel met een knop "Wijs aan" die het element met `data-help="sleutel"` laat oplichten. `sleutels.test.ts` bewaakt dat de sleutels in de tekst en in de schermen gelijk zijn |
| `ontwerp/` | analyse en ontwerpvarianten van fase 7 (schermafbeeldingen, `opmaakcontrole.mjs`, de meting van de omzetting naar v8e in `v8e-omzetting/`); geen onderdeel van de build |
| `src/data/` | het gegevenscontract (types) tussen bouwscript en app |
| `src/log/`, `src/referentie/`, `src/sjabloon/` | de lezers voor wijzigingslogs, referentiebestanden, `STATUS.md`, richtlijn en Word-stijlen |
| `src/begrippen/` | rekenfuncties voor het scherm Begrippen: precedenten tellen (`telPrecedenten`) en vertaalvragen verzamelen (`verzamelVragen`) |
| `src/uitlijning/` | woorduitlijning bron ↔ vereenvoudigd per vers en "Gevonden": hoe bronwoorden vertaald zijn (voor het begrippenoverzicht) |
| `src/editor/` | ProseMirror-schema en omzetting voor de editor (nog zonder scherm) |
| `src/klembord/` | Word-HTML voor kopiëren naar Word met de echte stijlnamen, en de copy-handler (nog zonder knop) |

## Draaien

Node staat vast in `../mise.toml`. Vanuit `redactietool/`:

```sh
mise x -- npm ci            # eenmalig
mise x -- npm run dev       # bouwt de data en start de dev-server (http://localhost:5173/)
mise x -- npm run build     # bouwt de data en de site in dist/
mise x -- npm run preview   # toont dist/ zoals op Pages (http://localhost:4173/BET/)
mise x -- npm run data      # alleen de data opnieuw bouwen
```

`npm run data` (`src/bouw/start.ts`) leest per boek in `bijbel/<boek>/` het bestand `boek.json`, `STATUS.md`, `bron/`, `vereenvoudigd/`, `wijzigingslog/` en `referentie/`, de richtlijn in `richtlijn/`, en de stijlen uit `word/styles.xml` van het Word-sjabloon. Het schrijft naar `public/data/` (staat in `.gitignore`); de vorm staat bovenin `src/data/types.ts`. Na een wijziging in `bijbel/` draai je `npm run data` opnieuw; de dev-server leest dan de nieuwe bestanden.

Een hoofdstuk zonder `vereenvoudigd/`- of logbestand toont de bron met lege kolommen. Een hoofdstuk zonder rij in `STATUS.md` heeft de status `nog niet begonnen`.

Adressen: `#/lukas/9` is hoofdstuk 9, `#/lukas/9/22` vers 22 (dat vers wordt gekozen en in beeld gebracht). `#/lukas/begrippen` opent het scherm Keuzes en vragen (tabblad Vertaalkeuzes); `#/lukas/begrippen/gevonden` en `#/lukas/begrippen/vragen` de andere tabbladen. Dat scherm laadt alle hoofdstukken en rekent in de browser. `#/lukas/bewaard` toont wat de browser bewaard heeft (met back-up downloaden en inladen); `#/galerij` toont de componenten in hun lastige toestanden.

De site gaat via GitHub Actions (`../.github/workflows/pages.yml`) naar Pages. Eenmalig in de repo-instellingen: Pages, bron "GitHub Actions". Het basispad `/BET/` staat in `vite.config.ts`.

## Tests draaien

Node staat vast in `../mise.toml`. Vanuit de hoofdmap van de repo:

```sh
mise x -- npm --prefix redactietool ci        # eenmalig
mise x -- npm --prefix redactietool test      # alle tests
mise x -- npm --prefix redactietool run typecheck
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
| `src/log/*.test.ts` | Wijzigingslogs: verwijzingen naar § en precedent, randgevallen, en pariteit met `parse_log` over alle 24 logs |
| `src/referentie/*.test.ts` | Precedenten, `STATUS.md`, richtlijn en open vragen op de echte bestanden; elk vers in de kolom Verzen bestaat |
| `src/sjabloon/*.test.ts` | Stijlen uit `styles.xml` van het echte sjabloon (namen, kleuren, vet en cursief) |
| `src/klembord/*.test.ts` | Word-HTML byte-gelijk aan het geslaagde prototype van fase 0 (Lukas 2, 3, 5, 17) |
| `src/editor/*.test.ts` | md → ProseMirror → md byte-gelijk voor alle 48 bestanden; opmaak blijft bij bewerken; versnummers zonder opmaak |
| `src/uitlijning/*.test.ts` | Uitlijning op kleine handgemaakte verzen en bekende vervangingen op Lukas (Heere → Heer, Zoon des mensen → Mensenzoon); rekentijd |

De pariteitstest draait `scripts/formaat_naar_json.py --boek lukas`, dat de uitvoer van `parse_md` als JSON geeft. Dat script geeft ook de lijsten met alineastijlen, domeinen en directe opmaak, zodat de test controleert dat TypeScript dezelfde kent.

## Gegevensmodel

Een hoofdstuk is een lijst alinea's, één per regel van het bestand: `titel`, `leeg` of `tekst`. Een tekstalinea heeft een `stijl` (of `null`) en `stukken`: tekststukken met een lijst `opmaak` (van buiten naar binnen) en versnummers als eigen stuk zonder opmaak. De spaties rond `[n]` blijven in de tekststukken staan.

## Strenger dan Python

De TypeScript-parser weigert wat `parse_md` toelaat maar `FORMAAT.md` niet: tags in de verkeerde volgorde of die elkaar kruisen, een versnummer binnen een tag, meer dan twee lege regels achter elkaar, een regel met alleen witruimte, en meer dan één spatie na `@stijl`. Anders zou terugschrijven de tekst ongemerkt veranderen. Een BOM en CRLF worden net als in Python genegeerd en bij het terugschrijven niet teruggezet.
