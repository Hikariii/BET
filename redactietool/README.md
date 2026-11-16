# Redactietool

De broncode van de tool. Het plan staat in [`stap1-plan.md`](stap1-plan.md) (afgesloten: uitgangspunten, architectuur, fase 0 tot 5; bovenaan staat wat nu afwijkt) en [`stap2-plan.md`](stap2-plan.md) (stand per fase en wat nog moet). De tool kan lezen, vertaalkeuzes en vertaalvragen tonen, per vers bewerken, zoeken en vervangen over het boek, vragen beantwoorden, een back-up bewaren en inladen, en het resultaat naar Word en naar Claude brengen. Hij staat op https://hikariii.github.io/BET/.

| Map | Inhoud |
|---|---|
| `src/formaat/` | parser en serializer voor het Markdown-formaat uit [`../FORMAAT.md`](../FORMAAT.md) |
| `src/bouw/` | bouwscript: zet `bijbel/` en de richtlijn om naar JSON in `public/data/` |
| `src/app/` | de Preact-app die die JSON toont. De submappen: `begrippen/` (het scherm Keuzes en vragen met de tabbladen Vertaalkeuzes, Zo vertaald, Vertaalvragen en Zoeken en vervangen), `bewaren/` (de pagina Opgeslagen, de bewaarstatus, back-up downloaden en inladen), `bewerken/` (de vers-editor in de tabel), `naarWord/` (de hoofdstukacties), `navigatie/`, `bovenbalk/`, `verzen/`, `welkom/` en `galerij/`. De boekpagina heeft een bovenbalk (boekbalk met de plekken van het boek als tabbladen, Opgeslagen, de grootte en Help; hoofdstukbalk met de hoofdstukkeuze en acties). De css daarvan staat in `src/app/indeling.css`, die `main.tsx` na `vormgeving.css` laadt |
| `src/help/`, `src/app/help/` | de help: de tekst als Markdown per onderdeel (`src/help/*.md`) en het venster dat hem toont (knop Help in de boekbalk, toets `?`). In de tekst vullen `{{plek:…}}`, `{{boek}}`, `{{back-upbestand}}` en `{{exportbestand}}` namen in uit de code, `{{legenda}}` toont de legenda uit het Word-sjabloon en `{{wijs sleutel \| naam \| waar}}` maakt een regel met een knop "Wijs aan" die het element met `data-help="sleutel"` laat oplichten. `sleutels.test.ts` bewaakt dat de sleutels in de tekst en in de schermen gelijk zijn |
| `ontwerp/` | archief van fase 7: de besluitnotities (`*.md`) en `opmaakcontrole.mjs`, een los gereedschap dat de opmaak van een lopende tool met Word vergelijkt (de rooktest doet dat ook, in `e2e/opmaakcontrole.ts`). De schermafbeeldingen, html-pagina's en proefscripts zijn verwijderd; ze staan in de git-geschiedenis tot en met commit `15ef416`. Geen onderdeel van de build |
| `e2e/` | de rooktest op de gebouwde app (Playwright, Chromium); zie "Tests draaien" |
| `src/data/` | het gegevenscontract (types) tussen bouwscript en app |
| `src/log/`, `src/referentie/`, `src/sjabloon/` | de lezers voor wijzigingslogs, referentiebestanden, `STATUS.md`, richtlijn en Word-stijlen |
| `src/begrippen/` | rekenfuncties voor het scherm Keuzes en vragen: vertaalkeuzes tellen (`telPrecedenten`), vertaalvragen verzamelen (`verzamelVragen`) en de opties van een vraag (`opties`) |
| `src/vervangen/` | zoeken en vervangen: de zoekopdracht, het voorstel per plek en de bewaarde keuzes met terugdraaien |
| `src/bewerken/` | de tussenstand per vers in de browser (`localStorage`), de opmaakwaarschuwing en het knippen van een bewerkt vers |
| `src/antwoorden/` | de antwoorden op vertaalvragen, inclusief het genuanceerde antwoord (opslagsleutel `bet-antwoorden/<boek>`) |
| `src/reacties/` | de reacties op opmerkingen van Claude, met het vinkje "Maak hier een vertaalvraag van" (opslagsleutel `bet-reacties/<boek>`, sleutel per reactie het O-nummer met de kwestie erbij, omdat O-nummers kunnen verschuiven) |
| `src/bewaren/` | wat de browser bewaart: overzicht, back-up (download en inladen, versie 3; bevat tussenstanden, keuzes, antwoorden en reacties, en een back-up zonder reacties is geldig) en de meldingen bij een wijziging |
| `src/export/` | Export voor Claude (`<prefix>-NN.redactie.json`, versie 3; met `reactiesOpOpmerkingen`, de reacties op opmerkingen uit dat hoofdstuk, zie `WERKPLAN.md` stap D) |
| `src/uitlijning/` | woorduitlijning bron ↔ vereenvoudigd per vers en "Gevonden": hoe bronwoorden vertaald zijn (voor het begrippenoverzicht) |
| `src/editor/` | ProseMirror-schema, omzetting en toetsen voor de vers-editor (`src/app/bewerken/VersEditor.tsx`) |
| `src/klembord/` | Word-HTML voor kopiëren naar Word met de echte stijlnamen, en de copy-handler (knop Hoofdstuktekst kopiëren voor Word) |

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

Adressen: `#/lukas/9` is hoofdstuk 9, `#/lukas/9/22` vers 22 (dat vers wordt gekozen en in beeld gebracht). `#/lukas/begrippen` opent het scherm Keuzes en vragen (tabblad Vertaalkeuzes); `#/lukas/begrippen/gevonden` en `#/lukas/begrippen/vragen` de andere tabbladen. Dat scherm laadt alle hoofdstukken en rekent in de browser. `#/lukas/opgeslagen` toont wat de browser bewaard heeft (met back-up downloaden en inladen; het oude adres `#/lukas/bewaard` werkt nog); `#/galerij` toont de componenten in hun lastige toestanden. De adressen en de bestandsnamen in de code hebben de oude namen (Besloten, Gevonden, Vervangen, Bewaard) bewust behouden.

De site gaat via GitHub Actions (`../.github/workflows/pages.yml`) naar Pages. Het basispad `/BET/` staat in `vite.config.ts`.

## Tests draaien

Node staat vast in `../mise.toml`. Vanuit de hoofdmap van de repo:

```sh
mise x -- npm --prefix redactietool ci        # eenmalig
mise x -- npm --prefix redactietool test      # alle tests (vitest)
mise x -- npm --prefix redactietool run typecheck
mise x -- npm --prefix redactietool run build # nodig voor de rooktest
mise x -- npm --prefix redactietool run test:e2e  # de rooktest op de gebouwde app
python3 -I scripts/test_scripts.py            # de Python-scripts op een nep-boek
```

De tests hebben `python3` nodig (alleen de standaardbibliotheek). De componenttests (`*.test.tsx`) draaien in happy-dom: elk bestand zet bovenaan `// @vitest-environment happy-dom`, de andere tests draaien zonder browseromgeving.

De rooktest (`npm run test:e2e`) opent de gebouwde app met `vite preview` in Chromium en faalt als `dist/` ontbreekt: draai eerst `npm run build`. De poort staat in `E2E_POORT` (standaard 4173). De workflow draait hem vóór het publiceren, samen met de Python-controles en `test_scripts.py`.

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
| `src/bewerken/*.test.ts` | Tussenstand bewaren, terugzetten en verouderen; een bewerkt vers knippen; de opmaakwaarschuwing |
| `src/vervangen/*.test.ts` | Zoeken, het voorstel per plek en toepassen en terugdraaien van keuzes, ook op de echte hoofdstukken van Lukas |
| `src/antwoorden/*.test.ts`, `src/reacties/*.test.ts`, `src/bewaren/*.test.ts`, `src/export/*.test.ts` | Antwoorden, het overzicht van wat bewaard is, back-up (voorbeeld, samenvoegen, vervangen) en de export |
| `src/**/*.test.tsx` | Componenten in happy-dom: Back-up inladen (voorbeeld, Escape, focus), het vak Reageren bij een opmerking van Claude en het bewerken van een vers (typen, Enter, Escape, bewaren, Vers terugzetten) |
| `e2e/rooktest.e2e.ts` | De gebouwde app in Chromium, zonder console- en paginafouten: Lukas 1 toont alle versrijen, een bewerkt vers staat er na herladen nog en Vers terugzetten haalt het weg, Vertaalvragen en de galerij openen, Export voor Claude downloadt, Hoofdstuktekst kopiëren zet HTML met alle Word-stijlnamen op het klembord, de Bijbeltekst heeft in elk hoofdstuk alleen opmaak uit het sjabloon (`e2e/opmaakcontrole.ts`), en de versrijen komen overeen met `boek.json` |
| `../scripts/test_scripts.py` | De Python-scripts op een nep-boek "1 Johannes" in een tijdelijke map: omzetten, controles en export werken voor elk boek via `--boek` |
| `src/uitlijning/*.test.ts` | Uitlijning op kleine handgemaakte verzen en bekende vervangingen op Lukas (Heere → Heer, Zoon des mensen → Mensenzoon); rekentijd |

De pariteitstest draait `scripts/formaat_naar_json.py --boek lukas`, dat de uitvoer van `parse_md` als JSON geeft. Dat script geeft ook de lijsten met alineastijlen, domeinen en directe opmaak, zodat de test controleert dat TypeScript dezelfde kent.

## Woordenlijst

Eén naam per begrip, in de schermen, de Help en de documenten. Namen in de code en de `data-help`-sleutels mogen afwijken; de bestandsnamen houden bewust de oude namen.

| Naam | Bedoeld is | Opmerking |
|---|---|---|
| vervanging | een uitgevoerde zoek-en-vervang | |
| vertaalkeuze | een afspraak in `precedenten.md` | In de tool nooit "precedent". |
| opmerking van Claude | wat in het wijzigingslog staat | In de tool geen "log". |
| de tekst van Claude, de vereenvoudiging van Claude | de vereenvoudigde tekst zoals Claude hem in de repo zette | In de tool geen "repo". |
| Vers terugzetten | de bewerking van een vers weghalen, zodat de tekst van Claude weer staat | De knop onder een bewerkt vers. |
| Opgeslagen | de pagina met wat de browser bewaart | De adressen en bestandsnamen houden de oude naam Bewaard. |
| antwoord | wat je op een vertaalvraag kiest of schrijft | |
| reactie | wat je zelf bij een opmerking van Claude schrijft, met eventueel het vinkje "Maak hier een vertaalvraag van" | Geen antwoord: een antwoord hoort bij een vraag met opties. |
| toelichting | de uitleg die je zelf bij een antwoord of in Export voor Claude schrijft | |

## Gegevensmodel

Een hoofdstuk is een lijst alinea's, één per regel van het bestand: `titel`, `leeg` of `tekst`. Een tekstalinea heeft een `stijl` (of `null`) en `stukken`: tekststukken met een lijst `opmaak` (van buiten naar binnen) en versnummers als eigen stuk zonder opmaak. De spaties rond `[n]` blijven in de tekststukken staan.

## Strenger dan Python

De TypeScript-parser weigert wat `parse_md` toelaat maar `FORMAAT.md` niet: tags in de verkeerde volgorde of die elkaar kruisen, een versnummer binnen een tag, meer dan twee lege regels achter elkaar, een regel met alleen witruimte, en meer dan één spatie na `@stijl`. Anders zou terugschrijven de tekst ongemerkt veranderen. Een BOM en CRLF worden net als in Python genegeerd en bij het terugschrijven niet teruggezet.
