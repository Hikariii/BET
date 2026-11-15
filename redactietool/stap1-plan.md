# Plan: redactietool, stap 1

Status: **afgesloten** op 2026-11-15. Dit was stap 1 van de bouw; wat nog niet gebouwd is, staat in [`stap2-plan.md`](stap2-plan.md). De uitgangspunten, de architectuur en het terugvoeren hieronder gelden nog steeds.

**Stand bij afsluiten:** fase 0, 1, 2, 3 en 5 gebouwd (met openstaande onderdelen, zie stap 2). Fase 4 deels: zoeken en vervangen met voorbeeldvenster, terugdraaien per keuze en herkomst in de export. Fase 0: Mac geslaagd; een aparte Windows-test vervalt, de redacteur test in het gebruik.

## Doel

Een inzage- en keuze-instrument voor **de vertaler**: de persoon die de definitieve vertalingen maakt. In de tool:
- ziet de vertaler de vereenvoudigde tekst naast de bron;
- ziet hij welke regels uit de richtlijn en welke eerdere keuzes (precedenten) zijn toegepast, en hoe woorden elders in het boek vertaald zijn;
- past hij de tekst aan, door zelf te typen of door een vertaalkeuze in één keer op andere plekken door te voeren;
- brengt hij het resultaat naar Word.

## Uitgangspunten

| # | Besluit |
|---|---|
| U1 | **Alleen frontend**, gepubliceerd op GitHub Pages. De repo is publiek, dus de site ook. |
| U2 | **Word is leidend.** De vertaler mag ook gewoon in Word blijven werken. Het aangeleverde Word-bestand is de definitieve tekst. |
| U3 | **Terugvoeren is handmatig**: de eigenaar geeft Claude het Word-bestand, Claude werkt de repo bij (zie [Terugvoeren](#terugvoeren-claude)). |
| U4 | **Geen opslag.** De tool bewaart de tussenstand alleen in de browser van de vertaler. Opslag (bv. Google Drive) is geparkeerd en komt mogelijk nooit. |
| U5 | **Geen goedkeuring in de tool.** Alle hoofdstukken zijn bewerkbaar. De tool toont de status per hoofdstuk alleen, uit `STATUS.md`. |
| U6 | **Eén vertaler**, op laptop of desktop met **Windows**, browser **Edge of Chrome**. Interface in het Nederlands. Ontwikkelen en testen ook op de Mac. **Safari wordt niet ondersteund voor kopiëren naar Word** (zie fase 0); lezen en bewerken werken daar wel. |
| U7 | **Techniek**: Vite + TypeScript + Preact, met ProseMirror als editor. Gebouwd en gepubliceerd via GitHub Actions. |
| U8 | **Eén hoofdstuk per scherm**, met een zijbalk voor alle hoofdstukken en een adres per vers (`…/lukas/9#22`). |

## Wat de vertaler ziet en kan

### 1. Lezen: per vers bron, vereenvoudiging en toegepaste regels

```
┌ Lukas ─────┐ ┌─ Lukas 4 · review ─────────────────────────────────────────────┐
│ 1 goedgek. │ │ BRON                  │ VEREENVOUDIGD           │ REGELS        │
│ 2 goedgek. │ ├───────────────────────┼─────────────────────────┼───────────────┤
│ 3 goedgek. │ │ 18 De Geest des       │ 18 De Geest van de Heer │ "des Heeren"  │
│ 4 review • │ │ Heeren is op Mij, …   │ is op Mij, …            │ → "van de     │
│ 5 review   │ │                       │                         │ Heer": §11    │
│ …          │ │                       │                         │ [regels ⇆]    │
└────────────┘ └───────────────────────┴─────────────────────────┴───────────────┘
```

- Opmaak zoals in Word (Jezuswoorden, domeinmarkeringen, onderwijs, highlights). Kleuren en stijlen komen uit het Word-sjabloon van het boek, niet zelf verzonnen.
- Kolom **Regels**: de regels uit het wijzigingslog van dat vers. Een knop wisselt tussen altijd zichtbaar (standaard) en ingeklapt (zichtbaar bij klikken op een vers).
- Klikken op een `§` opent die paragraaf van de richtlijn in een zijpaneel; klikken op "precedent" opent de regel uit `precedenten.md`.
- Zijbalk: alle hoofdstukken met hun status, het aantal open vertaalvragen, en een stip als de vertaler er iets in gewijzigd heeft.
- Hoort een vers bij een vertaalvraag (zie [Vertaalvragen](#7-vertaalvragen)), dan staat in de kolom Regels de markering **vraag**; klikken toont de kwestie, de gekozen oplossing en de alternatieven.

### 2. Begrippenoverzicht

Een apart scherm met twee tabbladen:
- **Besloten**: alle precedenten uit `precedenten.md` (tabel met Bron, Vereenvoudigd, Plaats, Status, Opmerking), doorzoekbaar en te filteren op `voorlopig` / `vast`. Per begrip het aantal plekken, met een link naar elk vers.
- **Gevonden**: per bronwoord hoe het feitelijk vertaald is, met aantallen, afgeleid uit de woordvergelijking van bron en vereenvoudiging. Woorden die **verschillend** vertaald zijn, staan bovenaan.

"Gevonden" is een automatische vergelijking; bij vrij herschreven zinnen kan de koppeling niet kloppen. Elke regel linkt daarom naar de verzen om het zelf te zien.

### 3. Bewerken

- Vrij typen in de vereenvoudiging, zoals in elke editor. Typen binnen opmaak neemt die opmaak over.
- Versnummers zijn niet te bewerken; een vers kan niet kwijtraken.
- **Waarschuwingen** per vers, zonder te blokkeren: opmaak uit de bron verdwenen, een oude vorm (richtlijn of `controle.json`), een vast begrip (§15) verdwenen. Dezelfde regels als `scripts/controleer_hoofdstuk.py`.
- **Tussenstand** wordt automatisch in de browser bewaard (IndexedDB); herladen gooit niets weg.
- **Terug naar de versie uit de repo**: per vers en per hoofdstuk.
- Twee soorten verschil zichtbaar: ten opzichte van de bron (wat Claude veranderde) en ten opzichte van de repo (wat de vertaler veranderde).
- Een goedgekeurd hoofdstuk is bewerkbaar, met bovenaan: "Goedgekeurd, referentie voor de rest van het boek. Wijzigingen gaan opnieuw langs de redactie."

### 4. Structurele keuzes

Vertaalkeuzes in één keer op meer plekken doorvoeren, met behoud van opmaak. Zelf typen blijft altijd mogelijk.

- **Aanwijzen** markeert woorden met een precedent of met meerdere vertalingen in het boek (stippellijn). Er opent geen menu.
- **Klikken of selecteren** opent een klein menu:
  - hoe deze woorden elders vertaald zijn (gevonden, met aantallen);
  - het precedent, als dat er is;
  - de bronvorm;
  - **Elders ook wijzigen…**

  Een keuze uit het menu voor dit ene woord gebeurt direct.
- **Hint na typen**: komt de oude verwoording elders nog voor in hoofdstukken die niet goedgekeurd zijn, dan verschijnt naast het vers: *"de Mensenzoon" staat nog 25× in Lukas 4–24. Overal anders verwoorden?* Negeren kan.
- **Een structurele vervanging gaat altijd via een voorbeeldvenster**:

  ```
  ┌─ "de Mensenzoon" → "<nieuw>"  ·  25 plekken ───────────────────┐
  │ Lukas 5                                                      │
  │ ☑ 5:24  … opdat jullie weten dat ~~de Mensenzoon~~ <nieuw> … │
  │ Lukas 6                                                      │
  │ ☑ 6:5   … ~~de Mensenzoon~~ <nieuw> is Heer van de sabbat    │
  │ ☐ 6:22  … om ~~de Mensenzoon~~ <nieuw> …   (overgeslagen)    │
  │ Varianten:  een Mensenzoon → [ … ]                           │
  │ Met de hand (opmaakgrens):  ⚠ 9:26  ga naar vers             │
  │ Goedgekeurd (standaard uit):  ☐ …                            │
  │                          [Annuleren]  [23 plekken toepassen] │
  └──────────────────────────────────────────────────────────────┘
  ```

  - elke plek los aan of uit te vinken; de knop noemt het aantal;
  - varianten (vervoegingen, meervoud, met of zonder lidwoord) als aparte groep met een eigen vervanging;
  - goedgekeurde hoofdstukken staan erin, maar standaard uit;
  - opmaak: valt een vondst binnen één opmaak, dan krijgt de nieuwe tekst die opmaak; bevat hij een hele markering of loopt hij over een grens, dan "met de hand";
  - achteraf alles in één keer of per vers terug te draaien;
  - behalve tekst kan de functie ook alleen de **markering** op dezelfde woorden wisselen (bijvoorbeeld `eeuwigleven` → `genade`), voor keuzes zoals bij een [vertaalvraag](#7-vertaalvragen).

### 5. Naar Word en naar Claude

- **Kopiëren naar Word** met de echte Word-stijlen (Jezuswoorden, GodsStem, domeinstijlen, hoofdstuktitel), zodat `docx_naar_md.py` de opmaak bij het terugvoeren herkent. Uit [fase 0](#fasen):
  - kopiëren gaat via een **eigen copy-handler** die HTML schrijft zoals Word die zelf maakt: elke stijl als klasse met `mso-style-name` (de echte stijlnaam uit het sjabloon) in een `<style>`-blok. De standaardkopie van de browser werkt niet (geen stijlnamen);
  - werkt in **Chrome en Edge**; in **Safari** niet (WebKit gooit het `<style>`-blok weg). In Safari toont de tool: "Kopiëren naar Word werkt in Chrome of Edge";
  - mislukt het plakken op Windows bij de redacteur toch, dan komt er een knop **Download als Word** (`.docx` met het sjabloon van het boek, gelijk aan `md_naar_docx.py`).
- **Export voor Claude**: een knop, altijd zichtbaar bovenin, en een hint na kopiëren. Eén bestand per hoofdstuk (`lukas-04.redactie.json`) met:
  - de commit van de repo waarop de vertaler werkte;
  - per gewijzigd vers de oude en de nieuwe tekst, met opmaak-tags volgens `FORMAAT.md`;
  - per wijziging de herkomst: *zelf getypt*, *menu: bronvorm / precedent / gevonden*, of *structurele keuze*;
  - de structurele keuzes, met de overgeslagen plekken;
  - beantwoorde vertaalvragen: vraag, gekozen optie, verzen en overgeslagen plekken;
  - genegeerde waarschuwingen;
  - een vrij veld "Toelichting voor de verwerking".

  De export is een **optionele toelichting, nooit een bron van tekst**. Hij kan achterlopen op Word (de vertaler werkt daarna verder in Word); Claude neemt alleen tekst over uit Word en gebruikt de export om wijzigingen die ook in Word staan te duiden.

### 6. Status per hoofdstuk

Uit `bijbel/<boek>/STATUS.md`, met de hand bijgewerkt:

| Status | Betekenis |
|---|---|
| `concept` | Claude werkt eraan |
| `review` | Claudes vereenvoudiging is klaar en wacht op de vertaler |
| `bij editor` | de vertaler werkt eraan (in de tool of in Word); Claude raakt het niet aan |
| `verwerkt` | het aangeleverde Word-bestand is teruggevoerd; lessen en opmaakherstel wachten op akkoord |
| `goedgekeurd` | alles bevestigd; het hoofdstuk is referentie |

Bij `verwerkt` en `goedgekeurd` staan de datum en het aangeleverde bestand (kolom **Herkomst**). Een wijziging aan een goedgekeurd hoofdstuk zet het terug naar `review`.

### 7. Vertaalvragen

Vertaaluitdagingen zichtbaar maken en laten beantwoorden waar ze spelen. Voorbeeld: de markering van "Gezegend" (uit "zalig"). De bron markeert zalig als `eeuwigleven` en gezegend als `genade`; de vertaler koos in 1:45 en 1:48 `genade`, Claude hield in 4–24 `eeuwigleven` (10×). Opties: a) `genade`, b) `eeuwigleven` houden, c) een ander woord voor "zalig".

Twee bronnen, samen getoond:
- **Per boek**: `bijbel/<boek>/referentie/open-vragen.md` (kwestie, gekozen in de tekst, alternatieven, status, besluit, verzen).
- **Per vers**: de vragen in de wijzigingslogs (`Twijfel / vraag aan redactie` en `## Vragen aan redactie`).

In de tool:
- **Per vers**: de markering **vraag** in de kolom Regels (zie Lezen).
- **Overzicht**: een tabblad **Vertaalvragen** naast Begrippen. Per vraag de kwestie, de opties, de status (`open`, `voorlopig besloten`, `besloten`) en alle betrokken verzen met een link. Te filteren op status; open vragen bovenaan.
- **Een optie kiezen**: opent de vervangfunctie met voorbeeldvenster (zie [Structurele keuzes](#4-structurele-keuzes)), al ingevuld. Een optie kan de **tekst** veranderen of alleen de **markering** op dezelfde woorden (bij "Gezegend": `eeuwigleven` → `genade`). De vervangfunctie moet dus ook opmaak kunnen wisselen.
- **Doorgeven**: de gekozen optie gaat mee in de [export voor Claude](#5-naar-word-en-naar-claude) als "vraag beantwoord" (vraag, optie, verzen, overgeslagen plekken). Bij het terugvoeren verwerkt Claude het besluit in `open-vragen.md` (status `besloten`) en in de precedenten, na akkoord van de eigenaar.

Nodig in de data: de kolom "Plaats" in `open-vragen.md` is vrije tekst ("Lk 4–24", "Lk 4:2 (4:12, 4:13)"). Er komt een kolom **Verzen** met een vaste lijst (`1:45, 1:48, 6:20-22, 7:23`), bijgehouden door Claude. Zonder die kolom kan de tool een vraag niet betrouwbaar aan verzen koppelen.

## Terugvoeren (Claude)

Op verzoek van de eigenaar, per aangeleverd Word-bestand. Werkt met elk Word-bestand, ook als het niet uit de tool komt; de export is welkom maar niet nodig. Stappen staan in `WERKPLAN.md`, deel D. Het levert drie dingen op:

1. **Tekst**: `scripts/docx_naar_md.py` naar `vereenvoudigd/`; het verschil met Claudes concept in het wijzigingslog. Status `verwerkt`.
2. **Lessen**: elke keuze van de vertaler die afwijkt van de richtlijn of de precedenten wordt een voorstel (precedent naar `vast`, nieuw precedent, richtlijn aanpassen), in een lijst zoals `referentie/afwijkingen-h1-3.md`. Structurele keuzes uit de export worden direct precedentvoorstellen; overgeslagen plekken blijven bewust anders. **Pas na akkoord** toepassen op hoofdstukken die nog op `review` staan, en in `precedenten.md` en `controle.json` zetten.
3. **Opmaak**: verloren markeringen. Woorden ongewijzigd: de markering terugzetten via één lijst die in één keer wordt goedgekeurd. Woorden herschreven: per stuk een vraag. Dit geldt ook voor de 8 open fouten in Lukas 1–3.

Na akkoord op lessen en opmaak: status `goedgekeurd`.

## Architectuur

```
redactietool/                       broncode van de tool
  src/formaat/              parser en serializer volgens FORMAAT.md
  src/editor/               ProseMirror: domeinen, onderwijs, highlight, vet, onderstreept
                            en cursief als marks; alineastijl als eigenschap van de alinea;
                            versnummer als vast element
  src/uitlijning/           woordvergelijking bron ↔ vereenvoudigd (regels per vers, gevonden)
  src/controles/            regels uit controleer_hoofdstuk.py (+ controle.json)
  src/begrippen/            precedenten inlezen, gevonden vertalingen tellen
  src/vragen/               vertaalvragen uit open-vragen.md en de wijzigingslogs, gekoppeld aan verzen
  src/vervangen/            structurele keuzes met voorbeeldvenster
  src/klembord/             kopiëren naar Word (HTML met de Word-stijlnamen)
  src/export/               export voor Claude
  src/tussenstand/          IndexedDB per hoofdstuk, terug naar de repo
.github/workflows/pages.yml bouwt de tool; zet bij het bouwen bijbel/ om naar JSON
                            (bron, vereenvoudigd, logs, precedenten, open vragen met verzen, STATUS.md,
                            boek.json, stijlen uit het Word-sjabloon); draait de tests
```

- **Pages via Actions**, niet "deploy from /docs": er staan geen kopieën van de teksten in git, en de site is altijd gelijk aan `main`.
- **Eén formaat**: `FORMAAT.md` is de specificatie. Tests in de workflow:
  - de JS-parser levert op alle bronhoofdstukken hetzelfde op als de Python-scripts;
  - md → editor → md is exact gelijk voor alle hoofdstukken.
- **Data die de tool inleest** bestaat al in de repo: wijzigingslogs (vast formaat, zie `sjablonen/wijzigingslog.md`), `precedenten.md` (tabellen met vijf kolommen), `STATUS.md`. Bij het bouwen omgezet naar JSON.

## Fasen

| Fase | Inhoud | Klaar als |
|---|---|---|
| **0. Prototype plakken** | HTML-pagina met een stuk Lukas in de opmaak van de tool, met de Word-stijlnamen; kopiëren en plakken in een Word-document op basis van het sjabloon; resultaat door `docx_naar_md.py` | Op **Windows**, in **Edge en Chrome**, komen tekst en tags gelijk terug. Zo niet: Word-download in fase 5. **Stand 2026-11-15:** Mac geslaagd in Chromium (Word-HTML met `mso-style-name`: 17 opmaaksoorten, 0 tekstverschillen); Safari mislukt en valt af. Windows: geen aparte test, de redacteur test in het gebruik (besluit eigenaar 2026-11-15). Prototype op branch `fase-0-plakken-in-word` |
| **1. Lezen** | Workflow en Pages, JSON uit `bijbel/`, JS-parser, hoofdstuk naast de bron met opmaak, kolom Regels met links naar richtlijn en precedenten, markering **vraag** per vers, status en aantal open vragen in de zijbalk; kolom Verzen in `open-vragen.md` | Lukas 1–24 leesbaar op Pages; pariteitstest met Python slaagt; elke open vraag hangt aan de juiste verzen |
| **2. Begrippen en vragen** | Tabbladen Besloten, Gevonden en Vertaalvragen; verschillen en open vragen bovenaan, links naar verzen | Elk precedent met aantallen; elk verschillend vertaald bronwoord zichtbaar; elke vertaalvraag met opties, status en verzen |
| **3. Bewerken** | ProseMirror, vrij typen, waarschuwingen, tussenstand in de browser, terug naar de repo, label bij goedgekeurd | md → editor → md exact gelijk; een middag werk overleeft herladen |
| **5. Naar Word en Claude** | Kopiëren naar Word via een eigen copy-handler met Word-HTML (of download), melding in Safari, Export voor Claude (incl. beantwoorde vragen) | Een bewerkt hoofdstuk komt via Word en terugvoeren ongeschonden in de repo |
| **4. Structurele keuzes** | Markering bij aanwijzen, menu bij klikken of selecteren, hint na typen, voorbeeldvenster (tekst en markering wisselen), een optie van een vertaalvraag kiezen, herkomst in de export | Een keuze als "de Mensenzoon → X" gaat in één handeling over het boek, met overslaan per plek; een vraag als "Gezegend" is met één optie te beantwoorden |

Fase 5 komt vóór fase 4: na fase 0–3 en 5 kan de vertaler de hele cyclus rond (lezen, bewerken, naar Word, terugvoeren).

## Niet in dit plan

- **Suggesties van Claude** in het menu (1–3 alternatieven per wijziging): pas als blijkt dat het menu er om vraagt.
- **Een `.docx` openen in de tool** om verder te werken met de tekst uit Word. Werkafspraak: een hoofdstuk eerst terugvoeren voordat de vertaler het opnieuw in de tool opent.
- **Word-download**: alleen als fase 0 mislukt.
- **Opslag** (Google Drive, een opslagrepo): geparkeerd, mogelijk nooit. Opnieuw bekijken als het aanleveren van Word-bestanden en exports te omslachtig wordt, of als er meer vertalers komen. De afweging van toen staat in het eerste plan (commit `2ca102d`, overweging O1).
- **Meerdere vertalers tegelijk.**
- **Tablet en telefoon.**

## Risico's

| Risico | Gevolg | Maatregel |
|---|---|---|
| Plakken in Word neemt de stijlen niet over | Opmaak gaat verloren bij het terugvoeren | Fase 0 vóór al het andere (Mac in Chromium geslaagd; Windows test de redacteur in het gebruik); anders Word-download |
| Vertaler kopieert vanuit Safari | Stijlen gaan verloren | Melding in Safari; het terugvoeren meldt verloren opmaak (WERKPLAN D3) |
| JS-parser wijkt af van Python | Tekst of tags anders in de tool dan in de repo | Pariteitstest in de workflow; `FORMAAT.md` als enige specificatie |
| md → editor → md niet gelijk | Ongemerkte wijzigingen in verzen die niet aangeraakt zijn | Heen-en-terugtest op alle hoofdstukken |
| Tussenstand in de browser gewist | Werk dat nog niet in Word staat is weg | Duidelijke melding in de tool dat Word leidend is; vaak kopiëren of exporteren |
| Tool toont een oudere versie dan het Word-bestand van de vertaler | Dubbel werk | Status `bij editor`; werkafspraak eerst terugvoeren |
| Structurele vervanging op de verkeerde plek | Betekenis verschuift | Altijd voorbeeldvenster; goedgekeurd standaard uit; terugdraaien |
| Vertaalvraag aan de verkeerde verzen gekoppeld | Vertaler past de keuze op verkeerde plekken toe | Kolom Verzen expliciet bijhouden; voorbeeldvenster toont elke plek |
| "Gevonden" koppelt woorden verkeerd | Vertaler trekt een verkeerde conclusie | Altijd link naar de verzen; label "automatisch afgeleid" |
