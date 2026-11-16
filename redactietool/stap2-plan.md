# Plan: redactietool, stap 2

Status (2026-11-16): gebouwd zijn de fasen 7, 7b en 8 en de Help. Open zijn fase 6 (de proef met een echt hoofdstuk), 9a, 9b en 10, en de conflicten bij back-up inladen. Nog geen hoofdstuk is door de hele cyclus gegaan (bewerken in de tool, naar Word, export, terugvoeren). Het knelpunt is niet meer de tool maar de proef en de inhoud: zie het spoor Inhoud.

Dit plan bouwt voort op [`stap1-plan.md`](stap1-plan.md). Daar staan het doel, de uitgangspunten (U1 tot U8), wat de vertaler ziet en kan, het terugvoeren, de architectuur, wat buiten het plan valt en de risico's. Die gelden nog steeds, behalve waar het kader "Wijkt nu af" bovenaan stap 1 of dit plan iets anders zegt. Stap 2 bevat wat in stap 1 beschreven is maar nog niet gebouwd, plus wat erbij gekomen is.

De tool staat op https://hikariii.github.io/BET/ en wordt bij elke push naar `main` bijgewerkt. `/autopilot` leest dit plan als opdracht: bouw alleen wat in de kolom Open staat.

## Stand per fase

| Fase | Gebouwd | Open |
|---|---|---|
| **6. Proef van de cyclus** | Niets: dit is geen bouwwerk | 6a en 6b, zie [Fase 6](#fase-6-proef-van-de-cyclus-open) |
| **7. Ontwerp** | Gekozen richting v8e (zie [Ontwerp](#ontwerp-fase-7)), visuele basis als css-variabelen (`vormgeving.css`, `indeling.css`), galerij op `#/galerij`, Grootte instelbaar (A− A A+), de hele breedte met een letter die meegroeit | De kleinste tekst omhoog (besloten 2026-11-16: minimaal `.8125rem`, vertaalregels en verslinks `.875rem`, in één schaal van tokens); kolom Vertaalregels inklappen (twijfel); schermafbeeldingen met Playwright als test (zie `TAKEN.md`, Tests) |
| **7b. Opslag zichtbaar** | Bewaarstatus in de bovenbalk, pagina Opgeslagen (overzicht per hoofdstuk), back-up downloaden en inladen met voorbeeld, samenvoegen (per vers wint de nieuwste) of vervangen | Conflicten tonen en per vers kiezen, zie [Conflicten bij back-up inladen](#conflicten-bij-back-up-inladen-open) |
| **8. Vragen beantwoorden** | Markering wisselen, varianten, bereik van een vraag, terugdraaien per vers, Kiezen per optie en antwoord zonder wijziging; genuanceerd antwoord (toelichting of regel, eigen antwoord, meer keuzes onder één antwoord); in de export de structurele keuzes met overgeslagen plekken en de beantwoorde vragen (back-up en export versie 3). Opties komen uit de vrije kolom Alternatief; alleen Gezegend heeft nu echte opties | Niets in dit plan. De route "vraag beantwoorden" afmaken staat in verbeterplan UI (`TAKEN.md`) |
| **Help** | Knop Help en toets `?` met uitleg per pagina en "Wijs aan", welkom bij het eerste bezoek, "Laatste back-up" met herinnering, tip bij een lege browser | Niets in dit plan |
| **9a. Opmaak en waarschuwingen** | Opmaakwaarschuwing bij een weggevallen markering; waarschuwingen staan als tekst in de export | De opmaakwerkbalk, waarschuwingen voor oude vormen en vaste begrippen uit één gedeelde lijst; zie [Fase 9a](#fase-9a-opmaak-en-waarschuwingen-open) |
| **9b. Verschil en terug** | Terug naar de tekst van Claude per vers | Verschil zichtbaar, terug per hoofdstuk, stip in de hoofdstukstrip; zie [Fase 9b](#fase-9b-verschil-en-terug-open) |
| **10. Keuzes in de tekst** | Niets | Menu bij een woord; zie [Fase 10](#fase-10-keuzes-in-de-tekst-open) |

Wat uit stap 1 gebouwd is en blijft: lezen (bron, vereenvoudiging en regels per vers, kolom Regels, zijpaneel met richtlijn, markering vraag, status en open vragen), de tabbladen Vertaalkeuzes, Zo vertaald, Vertaalvragen en Zoeken en vervangen, bewerken met tussenstand, en kopiëren naar Word en Export voor Claude.

## Twee sporen

**Toolspoor** (hieronder, per fase): eerst 6, dan de gedeelde bouwstenen, dan 9a, 9b, conflicten en 10. Volgorde en bouwstenen staan bij [Volgorde](#volgorde).

**Spoor Inhoud** (de eigenaar en de redactie, met Claude): 21 hoofdstukken (4 tot 24) wachten op `review`, en elk besluit kan ze allemaal raken. Dit spoor zegt in welke volgorde en welk toolwerk het dient.

| Stap | Wat | Wie | Dient |
|---|---|---|---|
| 1 | Lukas 4 door de redacteur (de proef 6b), teruggevoerd volgens `WERKPLAN.md` deel D | redacteur, eigenaar, Claude | fase 6 |
| 2 | Evalueren: hoeveel verzen draaide de redacteur terug, hoeveel vragen kwamen er | Claude | beslist of 9b en 10 gebouwd worden |
| 3 | De negen vragen met status `open` in `bijbel/lukas/referentie/open-vragen.md` beantwoorden, bij voorkeur in de tool (Vertaalvragen) | eigenaar of redactie | fase 8 |
| 4 | De voorlopige vertaalkeuzes doorlopen tot `vast` (477 van 478 zijn voorlopig); zie het voorstel deel E in `WERKPLAN.md` | eigenaar of redactie, Claude zet de status | Vertaalkeuzes |
| 5 | Richtlijn v1.5 | redactie | |
| 6 | Daarna pas de rest: Lukas 5 tot 24 goedkeuren; de afwijkingen van hoofdstuk 1 tot 3 | redactie | |

## Fase 6: proef van de cyclus (open)

Geen bouwwerk. De uitkomst bepaalt wat van 9a, 9b en 10 gebouwd wordt.

- **6a, nu:** de eigenaar bewerkt drie tot vijf verzen van Lukas 4 in de tool, beantwoordt "Gezegend", kopieert naar Word en exporteert. Claude doorloopt `WERKPLAN.md` D1 tot D3 op een kopie en schrijft op wat schuurt. Geen redacteur nodig.
- **6b:** de proef met de redacteur op Windows. Lukas 2 van de live site plakken in het sjabloon, het Word-bestand terugsturen, `scripts/docx_naar_md.py` erover. Vraag ook welke Word het is (desktop of Word voor het web).
- **Klaar als:** het hoofdstuk staat ongeschonden in de repo (criterium van fase 5 uit stap 1), of we weten precies waar het misgaat. Mislukt plakken op Windows, dan is [Download als Word](#alleen-op-een-trigger) het eerstvolgende bouwwerk.

## Fase 9a: opmaak en waarschuwingen (open)

Dit onderdeel repareert het enige bewezen verlies: een herschreven zin kan nu nooit een Jezuswoord of domein krijgen (de editor kent alleen Enter, undo, redo en Escape; opmaakverlies was de pijn bij Lukas 1 tot 3).

**Opmaakwerkbalk in de vers-editor** (eigenaar, 2026-11-15): alleen wat `FORMAAT.md` kent, zodat alles terug kan naar Word en de repo. Geen vrije kleuren en geen losse cursief.
- **B** (`{vet}`) en **U** (`{onderstreept}`), met Ctrl+B en Ctrl+U.
- **Kleur ▾**: kies een stijl uit het sjabloon, de kleur komt mee: de begripsdomeinen (`{eeuwigleven}`, `{genade}`, `{geloof}`, `{oordeel}`, `{rechtvaardig}`, `{zonde}`, `{torah}`, `{dag}`), Onderwijs (`{onderwijs}`) en Highlight (`==`). Namen en kleuren komen uit `FORMAAT.md` en het Word-sjabloon (`boek.json`), niet uit de code.
- **Wissen**: opmaak van de selectie halen.
- Alleen zichtbaar tijdens het bewerken van een vers; samen ontwerpen met het selectiebalkje uit het ontwerpspoor "Ingangen vanuit de tekst" (één balk voor opmaak en vertaalkeuzes). De bestaande opmaakwaarschuwing blijft; tot de werkbalk er is, zegt die: "Zet de markering in Word, of kies Terug naar de tekst van Claude."
- Aanpak: alleen marks, geen datawijziging. Haal `DIRECTE_OPMAAK` en de alinea- en domeinnamen uit `Legenda` naar één module voor Legenda en werkbalk. Voeg `prosemirror-commands` (`toggleMark`) toe in plaats van eigen toggle-code. Zet B niet aan voor tekst waar de stijl al vet is (volgens `FORMAAT.md` krijgt die geen `{vet}`).

**Alinea ▾ apart** (gewone tekst, Jezuswoorden `@jezus`, Stem van God `@god`, Engel `@engel`, Citaat OT `@citaat-ot`): dit werkt niet zoals het lijkt. De stijl hoort bij de hele alinea, en van de 244 alinea's met een stijl in de vereenvoudiging beslaan er 100 meer dan één vers. `vervangVers` laat de alineastijl nu ongemoeid en `pasTussenstandToe` zet alleen de stukken terug, dus een gewijzigde stijl blijft op het scherm oud terwijl de export `@jezus` voor het nieuwe deel zet. Bouwen kan zo: `vervangVers` neemt de stijl over, de knop meldt "geldt voor de hele alinea (vers 5 en 6)" en de andere verzen in die alinea tonen de nieuwe stijl. De andere keuze is Alinea ▾ laten vervallen en de alineastijl aan Word laten (open vraag 5).

**Waarschuwingen uit één lijst** voor oude vormen en vaste begrippen (§15), gelijk in `controleer_hoofdstuk.py` en de tool. De tool leest `controle.json` nu niet en de regels staan alleen in Python; de `geaccepteerd`-lijst bestaat in de tool niet. Alle 78 patronen geven op alle 2302 verzen van Lukas dezelfde treffers in JS en Python, dus de lijst zelf kan over.
1. De lijst en `geaccepteerd` als JSON: algemeen naast de richtlijn, per boek in `controle.json`.
2. De bouw schrijft de samenvoeging per boek naar `public/data/<boek>/`.
3. Python krijgt `--json` (zoals `formaat_naar_json.py`). De pariteitstest vergelijkt alleen oude vormen, vaste begrippen en geaccepteerd, niet de tag-aantallen of "niet in het wijzigingslog".
4. Dan pas de waarschuwingen in de tool. Besluit eerst of een nieuw getypte oude vorm ook waarschuwt (in Python: nee).

De genegeerde waarschuwingen staan al in de export (elke waarschuwing als tekst); alleen de nieuwe soorten komen erbij.

**Klaar als:** de waarschuwingen van de tool en van `controleer_hoofdstuk.py` zijn gelijk op alle hoofdstukken (test), en de vertaler kan opmaak toevoegen en weghalen zonder terug te hoeven naar Word.

## Fase 9b: verschil en terug (open)

Alleen bouwen als 6a of 6b laat zien dat de redacteur het mist.

- **Verschil zichtbaar** van wat de vertaler veranderde, naast de tekst van Claude. Het verschil met de bron is Claudes werk en staat al in de kolom Vertaalregels; overweeg dat niet te bouwen.
- **Terug per hoofdstuk**, in één keer, met ongedaan maken.
- **Stip bij een hoofdstuk met wijzigingen**, in de hoofdstukstrip (`KortHoofdstuk`, gevoed met het aantal bewerkte verzen per hoofdstuk; `useOpslagTeller` bestaat). De zijbalk bestaat niet meer.
- **Aanpak:**
  - Eerst één `terugNaarRepo(opslag, boek, hoofdstuk, vers)` die tussenstand én keuze bijwerkt, via `draaiVersTerug` als het vers van een keuze komt. Anders blijft een vers dat via een keuze veranderd is, na terugzetten in `keuze.verzen` staan en noemt de export het nog toegepast. Terug per hoofdstuk is dan een lus eroverheen.
  - Eén diffmodule (bijvoorbeeld `uitlijning/verschil.ts`). `lijnVersUit` is gemaakt om bronwoorden aan vertalingen te koppelen en negeert leestekens en hoofdletters: een wijziging van alleen een komma geeft er geen verschil. De module tokeniseert mét leestekens, vergelijkt exact en hergebruikt het algoritme uit `overeenkomendeWoorden` (nu niet geëxporteerd). Vergelijk met `bewerkt.basis`, niet met de huidige repo, anders toont een verouderde bewerking andermans wijzigingen. Dezelfde module dient de conflictweergave.
- **Klaar als:** de vertaler ziet per vers wat hij veranderde, en kan een hele bewerkte stand in één keer terugzetten zonder dat de export of Zoeken en vervangen iets als toegepast tonen dat teruggezet is.

## Conflicten bij back-up inladen (open)

Eigenaar, 2026-11-16 (feature). Nu wint bij Samenvoegen per vers de nieuwste bewerking (bij gelijke tijd de back-up). Gewenst: verzen die in beide staan met een andere tekst als conflict tonen, met beide versies naast elkaar (in de Word-opmaak, met wanneer ze bewaard zijn en zo mogelijk het verschil gemarkeerd), en de vertaler per vers laten kiezen (mijn versie of back-up), met "voor alle: nieuwste" als snelle keuze. Ook conflicten in keuzes (dezelfde keuze met andere verzen) meenemen. De nieuwste-regel blijft de standaard.

**Aanpak:** wie per vers wint, wordt nu in `voorbeeldInladen` en in `voegSamen` apart bepaald (en bij antwoorden nog eens); een derde kopie voor de per-vers-keuze maakt het fout.
- Eén functie `besluitPerVers(eigen, uitBackup, gekozen)` voor voorbeeld én schrijven. `pasBackupToe` krijgt een `Map<versSleutel, 'mijn' | 'back-up'>`, standaard de nieuwste.
- Het voorbeeld heeft nu geen inhoud (`VersVergelijking` bevat alleen hoofdstuk, vers en soort); die komt erbij. Voor de weergave in Word-opmaak is `VersTekst` bruikbaar; het gemarkeerde verschil gebruikt de diffmodule uit 9b.
- Geen apart conflictscherm voor keuzes: leid `keuze.verzen` af uit de gekozen verzen (`keuzeId` staat al in `BewerktVers`). `voegSamen` voegt keuzes met hetzelfde `id` nu niet samen, dus `keuze.verzen` kan na een per-vers-keuze naar het verkeerde vers wijzen.
- Eerst `terugNaarRepo` (zie 9b). Klein en eerst: "bij Vervangen eerst automatisch een back-up van de huidige stand downloaden" dekt het echte risico (tussenstand gewist) al grotendeels.

## Fase 10: keuzes in de tekst (open)

Stippellijn bij aanwijzen (woorden met een vertaalkeuze of met meerdere vertalingen); menu bij klikken of selecteren (gevonden vertalingen, vertaalkeuze, bronvorm, "Elders ook wijzigen…"); hint na typen als de oude verwoording elders nog staat; herkomst *menu: bronvorm / vertaalkeuze / gevonden* in de export.

**Klaar als:** vanuit een vers is een keuze in twee klikken voor dit ene woord of voor het hele boek te maken.

**Aanpak:** alleen in de editor, op de selectiebalk van de werkbalk uit 9a (één balk). Begin met de hint na typen. Elke pagina laadt al alle 24 hoofdstukken, dus "staat nog 25× in Lukas 4 tot 24" kan zonder extra laden, met `zoekPlekken` en `telPrecedenten`. In de leesweergave staat een vers per stuk, niet per woord; stippellijnen per woord kunnen alleen in de editor. Een klik in de vereenvoudiging opent de editor, dus de woordinteractie mag daar niet mee botsen. Fase 10 kan vervallen als de redacteur het tabblad Zoeken en vervangen genoeg vindt (open vraag 3).

## Volgorde

Eerst fase 6; die laat zien wat de redacteur echt mist. Daarna de gedeelde bouwstenen, zodat geen fase werk van een andere terugdraait:

1. `terugNaarRepo` en de gedeelde diff.
2. De waarschuwingen-JSON, de bouw en Python `--json`, dan de waarschuwingen en hun export.
3. 9a: de werkbalk (B, U, Kleur, Wissen), met de plaatsing van zwevende balken (`plekBij` in `VersVoorproefVak.tsx`, naast `useAanwijzen.ts` en `wijsAan.ts`) naar één gedeelde functie.
4. 9b: verschil, terug per hoofdstuk en de stip, op 1 en 2.
5. Conflicten bij back-up inladen, op `besluitPerVers` en de diff.
6. Fase 10, na de werkbalk en na open vraag 3, op dezelfde balk.

## Alleen op een trigger

- **Download als Word.** Trigger: plakken in Word op Windows mislukt in 6b (de stijlen blijven niet behouden). Dan is dit het eerstvolgende bouwwerk, groter dan een knop: het sjabloon zit niet in de tool en de alinea-opbouw (titel inline in de eerste alinea, twee lege regels als sectiescheiding) staat al in Python en in `naarWordHtml.ts`. Aanpak: een neutrale alinealijst uit `naarWordHtml` die HTML en docx beide lezen; de bouw schrijft een skelet van het sjabloon naar `public/data/<boek>/`; test dat `word/document.xml` gelijk is aan die van `md_naar_docx.py doc` voor alle 48 bestanden.
- **Tweede boek.** Trigger: Lukas 4 is teruggevoerd (fase 6 klaar) en de eigenaar kiest het boek. Voorwaarden, in deze volgorde: de vertaalkeuzes `vast` (inhoudsspoor, stap 4) → een gedeelde begrippenlijst met alleen de rijen die de redactie boekoverstijgend noemt (veld `herkomst`: gedeeld of boek) → de heuristieken van `precedentVormen.ts` en de statuswoorden naar `boek.json`. Verder een boekkeuze in de boekbalk en pariteitstests over alle boeken in `bijbel/`. De losse "bij een tweede boek"-notities in `TAKEN.md` verwijzen hiernaar.

## Ontwerp (fase 7)

Gebouwd en gekozen; hieronder staat wat het ontwerp bepaalt, voor wie eraan werkt.

**Wie beslist:** de eigenaar; de redacteur geeft feedback.

**Uitgangspunt: functioneel, typografie boven kleur.** Geen decoratie of opvallende UI; hiërarchie en structuur komen uit lettergrootte, gewicht, witruimte en uitlijning, niet uit kleur of kaders.

**Kleur:** wit, zwart en het donkerrood van [Gebedshuis Amersfoort](https://gebedshuisamersfoort.nl/) (`#a61816`, uit hun logo), voor en door wiens mensen de vertaling gemaakt wordt. Er is verder geen huisstijl.
- Wit als achtergrond, zwart voor tekst; grijs alleen als tint van zwart voor bijzaken (versnummers, regels, randen).
- Donkerrood spaarzaam en alleen buiten de tekstkolommen: de actieve plek (gekozen hoofdstuk, tabblad, vers), de ene hoofdactie op een scherm, focus.
- Waarschuwingen en meldingen door tekst en plaats, niet door een eigen kleurenpalet.

**Vast gegeven:** de opmaak van de Bijbeltekst komt uit het Word-sjabloon van het boek, met eigen kleuren (Jezuswoorden `FF0000`, domeinen in blauw, groen, paars, oranje). Het ontwerp kiest daar niets voor en houdt het donkerrood uit de tekst, zodat het niet met de Jezuswoorden verward wordt. De opmaak (kleuren, arcering, vet, cursief, onderstreept) blijft in elk ontwerp gelijk aan Word; `ontwerp/opmaakcontrole.mjs` controleert dat.

**Letters en kleur (2026-11-15):** Bijbeltekst in **Atkinson Hyperlegible Next** (schreefloos, in maat het dichtst bij Aptos), in Word-zwart. Tool in **Inter** met toolkleur **`#6b4f4b`** (warm bruingrijs, verwant aan het donkerrood). Afgevallen: schreefletters, smalle letters en monospaced voor de tool. Vastgelegd in `src/app/vormgeving.css`; de combinaties staan in `ontwerp/letters.md`.

**Namen (2026-11-15):** het scherm heet **Keuzes en vragen**, met de tabbladen **Vertaalkeuzes** (was Besloten), **Zo vertaald** (was Gevonden), **Vertaalvragen** en **Zoeken en vervangen** (was Vervangen). De kolom per vers heet **Vertaalregels**. De adressen (`#/lukas/begrippen/besloten` enz.) en de bestandsnamen in de code blijven gelijk. Een uitgevoerde zoek-en-vervang heet een **vervanging** (eigenaar, 2026-11-16).

**Gekozen (2026-11-16): v8e.** De eigenaar kiest de boekbalk met de plekken als tabbladen met pictogrammen en Opgeslagen rechts, één hoofdstukbalk met titelblok (status als pictogram), hoofdstukstrip met pijltjes en de acties, geen zijbalk, de hele breedte met een letter die meegroeit, en de dichte verzen (d4). Dit is de tool zonder parameter. De css staat in `src/app/indeling.css`. Verslag van de ronde: `ontwerp/ronde4/v7-v8.md`. Eerdere rondes (layouts a tot f, ronde 3) staan als notities in `ontwerp/`; de schermafbeeldingen zijn uit de werkboom en alleen nog in de git-geschiedenis te vinden.

**Grootte instelbaar (gebouwd).** Alles staat in `rem`, dus één schaal op de basisgrootte vergroot de hele tool; de maximale leesbreedte staat in `ch` en groeit mee. Besloten (2026-11-16): de kleinste tekst minimaal `.8125rem`, vertaalregels en verslinks `.875rem`, in één schaal van lettergrootte-tokens.

**Open: kolom Vertaalregels inklappen.** Twijfel. De schakelaar "Vertaalregels altijd tonen" is weg (eigenaar, 2026-11-16); de kolom staat er altijd, met de punaise per vers. Bekijken of een ingeklapte smalle kolom met alleen labels (§7A, vertaalkeuze, vraag) beter is.

**Open ontwerpspoor: ingangen vanuit de tekst** (hoort bij fase 10 en 9a; eerst ontwerpen, met varianten naast elkaar):
- *Ingangen vanuit de context* (prioriteit van de eigenaar): de markering vraag bij een vers opent die vraag; "N open vragen in dit hoofdstuk" bovenaan een hoofdstuk; "vertaalkeuze" in de vertaalregels opent die vertaalkeuze; de hint na typen ("staat nog 25× in Lukas 4 tot 24, overal aanpassen?").
- *Duidelijke acties per regel*: bij een vertaalkeuze "12 plekken bekijken" en "Overal toepassen"; bij Zo vertaald met twee vertalingen "kies er één"; bij een vertaalvraag de opties als knoppen; elke actie via het voorbeeldvenster.
- *Een woord in de tekst omzetten* (zoals DeepL): A via selectie zonder vaste markering (een balkje met Zo vertaald, Vertaalkeuze, Bron, Overal aanpassen), B stippellijnen bij woorden met een keuze (als schakelaar), C rechtermuisknop of Alt+klik. Voorlopige voorkeur: A als basis, B als schakelaar.
- Open: zegt "vertaalkeuze" de redacteur iets; waar komen de alternatieven vandaan (Zo vertaald, vertaalkeuzes, bronvorm).

**Werkwijze (zoals gevolgd):** analyse van de huidige tool en de taken van de redacteur; richtingen met Claude Design op echte Lukas-tekst; een galerij in de tool (`#/galerij`) met de componenten in hun lastige toestanden, met echte data en op Pages. De galerij is de bron van waarheid voor de componenten. Schermafbeeldingen met Playwright die ongewenste veranderingen vangen zijn nog niet gebouwd; ze horen bij de rooktest (`TAKEN.md`, Tests).

## Open vragen voor de eigenaar

1. ~~Volgorde: 6 en 7 tegelijk, dan 8, 9, 10.~~ Beslist door het bouwen: 7, 7b en 8 zijn gebouwd; 9 en 10 volgen na de proef.
2. **Fase 6: welk hoofdstuk, en wanneer kan de redacteur het doen?** Nog open. Voorstel: Lukas 4 (het proefhoofdstuk uit `WERKPLAN.md`, "Tempo"), en de eigenaar noemt een week.
3. Fase 10: bouwen voordat de redacteur met de tool gewerkt heeft, of pas als blijkt dat Zoeken en vervangen niet genoeg is? Open; advies: eerst fase 6 (zie Risico's).
4. ~~`localStorage` in plaats van IndexedDB.~~ Beslist door het bouwen: de hele opslag, de back-up en de export zijn erop gebouwd. Blijft tenzij de opslag vol raakt (zie Risico's).
5. Alinea ▾ in de werkbalk: bouwen met "geldt voor de hele alinea", of de alineastijl aan Word laten? Open (zie fase 9a).

## Risico's (aanvulling op stap 1)

| Risico | Gevolg | Maatregel |
|---|---|---|
| Plakken in Word op Windows is nooit getoetst, en al het bouwwerk leunt erop | De redacteur plakt, de stijlen zijn weg, de markeringen gaan bij het terugvoeren verloren | Proef 6b eerst; mislukt het, dan Download als Word |
| De cyclus is nooit rondgegaan | Bouwwerk dat de redacteur niet nodig heeft, terwijl de besluiten (vertaalkeuzes `voorlopig`, open vragen) het knelpunt zijn | Proef 6a en 6b vóór 9b en 10; spoor Inhoud |
| Markering wisselen raakt opmaak die Word nodig heeft | Verkeerde stijl in Word, terugvoeren meldt verloren opmaak | Voorbeeldvenster toont de markering voor en na; heen-en-terugtest via Word op een hoofdstuk met gewisselde markering |
| Twee keuzes op hetzelfde vers | Terugdraaien in de verkeerde volgorde | Al opgevangen: een keuze blijft staan voor verzen die een latere keuze nog bezit, met melding |
| `localStorage` vol (ongeveer 5 MB per site) | Bewaren mislukt | De tool meldt een mislukte opslag per vers; bij veel bewerkte hoofdstukken alsnog IndexedDB |
| Fase 10 bouwen zonder dat de redacteur erom vraagt | Werk dat niet gebruikt wordt | Eerst fase 6; open vraag 3 |
| Ontwerp los van de echte data | Mooie schermen die breken op lange verzen, veel regels of veel vondsten | Prototypes altijd met echte Lukas-tekst, ook de drukste hoofdstukken |
