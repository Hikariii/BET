# Takenlijst – gereedschap en repository

Taken per boek staan in `bijbel/<boek>/TAKEN.md`. `[x]` = klaar, `[ ]` = open, `[~]` = bezig.

## Gereedschap
- [x] Mappenstructuur, README, WERKPLAN, CLAUDE.md
- [x] Omzetscript Word → md (`scripts/docx_naar_md.py`)
- [x] Exportscript md → Word (`scripts/md_naar_docx.py`), modus doc en review
- [x] Heen-en-terugtest (tekst en opmaak gelijk, op kleine punten na)
- [x] Controlescript (`scripts/controleer_hoofdstuk.py`)
- [x] Eerste commit op `main`
- [x] Repository geschikt voor meerdere boeken: `bijbel/<boek>/` met `boek.json`; scripts met `--boek`; formaat apart in `FORMAAT.md` (uitvoer van alle scripts voor Lukas gelijk gebleven)

## Open
- [ ] Redactietool. Stap 1 (`redactietool/stap1-plan.md`, fase 0 tot 5) is afgesloten; het werk dat nog moet staat in `redactietool/stap2-plan.md` (fase 6 tot 9, concept).
  - [x] **Fase 0**: prototype kopiëren en plakken in Word (branch `fase-0-plakken-in-word`). Mac in Chromium geslaagd; Safari valt af. Geen aparte Windows-test: de redacteur test in het gebruik.
  - [ ] Bij de redacteur nagaan of Hoofdstuktekst kopiëren voor Word op Windows (Edge of Chrome) de stijlen goed overneemt; zo niet: knop Download als Word (zie `redactietool/stap1-plan.md`, fase 5).
  - [x] **Fase 1** (lezen) gebouwd op branch `fase-1-lezen`, met voorwerk voor fase 2, 3 en 5; twee onafhankelijke reviews en een critical judge verwerkt.
  - [x] **Fase 2** (begrippen en vragen) gebouwd op branch `fase-2-begrippen` met /autopilot: tabbladen Besloten, Gevonden en Vertaalvragen; review en critical judge verwerkt.
  - [ ] Vertaalvragen: de kolom Plaats van het register tonen (`Vertaalvraag` heeft er nog geen veld voor).
  - [ ] Vertaalvragen: status "onbeslist" betekent "geen statuswoord in de tekst"; overwegen of de logs een vast statusveld krijgen, zodat het filter "open" volledig is.
  - [ ] Begrippen: de heuristieken voor werkregels en verschijnselen (`src/begrippen/precedentVormen.ts`) en de statuswoorden (`verzamelVragen.ts`) zijn op Lukas afgesteld; bij een tweede boek uit `boek.json` halen.
  - [x] **Fase 3** (bewerken) gebouwd op branch `fase-3-bewerken` met /autopilot: vers-editor, tussenstand in localStorage (wijkt af van het plan: geen IndexedDB), opmaakwaarschuwing, terug naar de repo per vers; review en critical judge verwerkt.
  - [ ] Bewerken: verschil t.o.v. de repo zichtbaar maken; terug per hoofdstuk; opmaakwerkbalk (zie `redactietool/stap2-plan.md`, Opmaakwerkbalk).
  - [ ] Bewerken: waarschuwingen voor oude vormen en vaste begrippen, met de lijst uit `controleer_hoofdstuk.py` als gedeelde JSON voor Python en TypeScript.
  - [ ] Bewerken: waarschuwing alleen bij opmaak die de repo-versie nog had (nu t.o.v. de bron, dus een bewust ontbrekende tag geeft steeds een waarschuwing).
  - [ ] Bewerken: kleine punten uit de review: `wisVers` vangt opslagfouten niet af (anders dan `bewaarVers`); `BewerkbaarVers.tsx` heeft geen componenttest; onleesbare verzen in de opslag verdwijnen stil bij de volgende bewaring; dubbele samenvoeglogica in `tussenstand.ts` en `versknip.ts`; focus na Terug naar de repo; waarschuwingen als live region.
  - [x] **Fase 5** (naar Word en Claude) gebouwd op branch `fase-5-naar-word` met /autopilot: Kopiëren naar Word (eigen copy-handler, Chromium getest), Safari-waarschuwing, Export voor Claude als JSON per hoofdstuk; review en critical judge verwerkt.
  - [x] **Fase 4** (structurele keuzes) gebouwd op branch `fase-4-structureel` met /autopilot: tabblad Vervangen met voorbeeldvenster en vinkjes per plek, toepassen via de tussenstand met behoud van opmaak, terugdraaien in één keer, herkomst "structurele keuze" in tussenstand en export.
  - [ ] Vervangen: een vondst over een opmaakgrens kan alleen met de hand; overwegen of de tool die ook kan vervangen (met keuze welke opmaak blijft).
  - [ ] Vervangen: de toegepaste keuzes gaan nog niet mee in de export (`structureleKeuzes` blijft leeg); alleen de herkomst per vers.
  - [ ] Vervangen: de context in het voorbeeldvenster begint en eindigt midden in een woord ("n jullie naam"); knippen op woordgrenzen, met "…".
  - [ ] Vervangen: een lege "Vervang door" verwijdert tekst zonder waarschuwing (wel terug te draaien); bevestiging of waarschuwing in het voorbeeld.
  - [ ] Vervangen, toegankelijkheid: "vervangen door" voor schermlezers bij `del`/`ins`; focus na toepassen naar de samenvatting.
  - [ ] Vervangen: woordgrenzen bij een apostrof ("zo" in "zo'n", "m" in "m'n"); aansluitende stukken met gelijke opmaak samenvoegen voordat een vondst "met de hand" wordt (alleen als dat in de data voorkomt).
  - [ ] Vervangen: de test op echte data telt met bijna dezelfde regex als de code; liever een vaste verwachting (bv. 26 plekken voor "de Mensenzoon").
  - [ ] Naar Word: in een echte Safari controleren dat de waarschuwing verschijnt; nagaan of `navigator.clipboard.write` de `mso-`stijlen ook behoudt (dan kan `execCommand` weg).
  - [ ] Export: veld `basis` (de repo-tekst waarop de vertaler begon) bij verouderde verzen; melding "voordat je kopieert" verduidelijken voor bewerkingen die niet toegepast worden.
  - [ ] Toegankelijkheid hoofdstukacties: focus naar het tekstveld bij openen, `aria-controls`, melding na downloaden.
  - [ ] Componenttests (DOM-omgeving zoals happy-dom) voor de schermen; nu alleen rekenfuncties getest en handmatig met Playwright.
  - [ ] Rooktest van het leesscherm (render met DOM of Playwright op `dist/`), nu alleen handmatig gecontroleerd.
  - [ ] "precedent" in de kolom Regels koppelen aan de bijbehorende regel in `precedenten.md` (nu opent de doorzoekbare tabel).
  - [ ] `redactietool/src/klembord/chromiumKlembord.mjs` (alleen macOS, gebruikt rolldown van Vite en Playwright uit `/tmp/pw`) opnemen in de tests of vervangen.
  - [ ] `document.title` per hoofdstuk zetten; Node-versie op één plek (nu `mise.toml` 26.13.1 en workflow `26`).
  - [ ] Pages aanzetten in de repo-instellingen (bron: GitHub Actions); daarna publiceert de workflow bij elke push naar `main`.
- [x] Redactietool: bewaarstatus zichtbaar, overzicht van wat er bewaard is, back-up downloaden en inladen (gebouwd in fase 7b, v8e).
- [ ] Redactietool, uit de review van fase 7b (v8e):
  - [x] Back-up samenvoegen: per vers wint de nieuwste (keuze eigenaar, 2026-11-16).
  - [ ] Feature: bij back-up inladen conflicten tonen (beide versies naast elkaar) en per vers laten kiezen (zie `redactietool/stap2-plan.md`, "conflicten tonen").
  - [ ] Overzicht Bewaard: "verouderd nog niet gecontroleerd" tonen zolang de hoofdstukken laden (`verouderdBekend`); in het voorbeeld van inladen ook verouderde verzen tonen; terug naar de repo per vers vanuit het overzicht.
  - [ ] Bewaarstatus: een mislukte schrijfactie (opslag vol) ook bovenin melden, niet alleen bij het vers.
  - [ ] Vervangen bij inladen: eerst automatisch een back-up van de huidige stand downloaden.
  - [ ] Tests: foutpaden van back-up (terugzetten mislukt, keuzes niet bewaard); `toegepast` als datum controleren in `alsKeuze`; component- of Playwright-test voor de vaste vertaalregels bij een open naslagkaart en voor Escape/focus in het back-upvenster.
  - [ ] Toegankelijkheid: `aria-label` van de groottes met het zichtbare label ("A+, groter"); skip-link langs de hoofdstukstrip; focus bij een verdwijnende strippijl.
  - [ ] Opruimen: dubbele `--zijbalk-breedte`; `laadHoofdstukkenEenmalig` naar `gegevens.ts`; `statusKlasse` uit `Zijbalk.tsx` naar een neutrale plek; export `ZICHTBARE_REGELS`; `aantal.tekst` in `boekplekken.ts`; `--schaal` vóór de eerste render zetten; één telling voor open vragen (strip en tabblad).
  - [ ] Meetdata `redactietool/ontwerp/v8e-omzetting/*.json` weghalen als ze niet meer nodig zijn.
- [ ] Redactietool, uit de review van fase 7 (ontwerp):
  - [ ] Opmaakcontrole (`redactietool/ontwerp/opmaakcontrole.mjs`) uitbreiden: vet, cursief, onderstreept; vers-editor, naslagkaart, versvoorproef, Zoeken en vervangen; boek en hoofdstukken niet vast in het script; eventueel als test in de build.
  - [ ] Bewerken door klikken: de Bijbeltekst gewone tekst laten (geen `role="button"`), met een knop "Vers N bewerken" die bij focus zichtbaar wordt; testen met een schermlezer.
  - [ ] Versvoorproef in Keuzes en vragen: Escape ook voor muisgebruikers, vak aanwijsbaar (WCAG 1.4.13), meeschuiven bij scrollen.
  - [ ] Zijbalk: "Status review" voor schermlezers weglaten waar de legenda het al zegt.
  - [ ] Galerij: boek en verzen uit de data halen in plaats van vast `lukas` (bij een tweede boek); unieke ids per hoofdstuk.
  - [ ] Richtlijntabellen in de naslagkaart: Bijbeltekst-kolommen herkenbaar maken in de markdown in plaats van op kolompositie.
  - [ ] Oude namen in bestanden en commentaar (Besloten.tsx, Gevonden, regels.css) bijwerken naar Vertaalkeuzes, Zo vertaald, Vertaalregels.
  - [ ] OFL-licentie van de letters (Atkinson Hyperlegible Next, Inter) vermelden in de README of met de site meeleveren.
- [ ] Logformaat: bij een vertaalregel met "precedent" aanwijzen **welke** vertaalkeuze uit `precedenten.md` bedoeld is (bv. `precedent: nabij → dichtbij`), zodat de naslagkaart onder het vers exact de juiste vertaalkeuze toont in plaats van te raden (`redactietool/src/app/precedentenBijRegel.ts`). Stappen: vorm kiezen met de eigenaar; `sjablonen/wijzigingslog.md` en de logparser van de redactietool (en `FORMAAT.md`/Python als die het log lezen) aanpassen; bestaande logs in `bijbel/lukas/wijzigingslog/` bijwerken (alleen de verwijzing, geen inhoud); het raden vervangen door opzoeken, met een test op alle logs dat elke verwijzing een bestaande vertaalkeuze vindt.
- [x] Kolom **Verzen** in `bijbel/lukas/referentie/open-vragen.md` (35 van 36 vragen; "aanhalingstekens" bewust leeg)
- [ ] `WERKPLAN.md` deel D (aangeleverd Word terugvoeren) een keer doorlopen met het eerstvolgende aangeleverde hoofdstuk, en bijstellen waar nodig
- [ ] Gedeelde begrippenlijst voor alle boeken: zodra de redactie precedenten `vast` maakt, de boekoverstijgende begrippen (Mensenzoon, discipel, Farizeeën …) uit `bijbel/lukas/referentie/precedenten.md` naar een gedeelde lijst verhuizen
- [x] Afwijking in `controleer_docx_md.py` (Lukas 8 onderstreept, md 2 tegen docx 1) verklaard: in 8:1 is de onderstreping in Word één reeks; de md splitst hem rond een spatie die niet rood is. Tekst en opmaak per teken kloppen; geen actie
