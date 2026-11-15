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
- [ ] Redactietool, plan in `redactietool/PLAN.md` (v2, vastgesteld). Volgorde: fase 0 → 1 → 2 → 3 → 5 → 4.
  - [~] **Fase 0**: prototype kopiëren en plakken in Word (branch `fase-0-plakken-in-word`). Mac in Chromium geslaagd; Safari valt af. **Open: test op Windows in Edge en Chrome** (geleende laptop of UTM), met `docs/prototype/plakken-in-word/LEESMIJ.md` op die branch.
  - [x] **Fase 1** (lezen) gebouwd op branch `fase-1-lezen`, met voorwerk voor fase 2, 3 en 5; twee onafhankelijke reviews en een critical judge verwerkt.
  - [x] **Fase 2** (begrippen en vragen) gebouwd op branch `fase-2-begrippen` met /autopilot: tabbladen Besloten, Gevonden en Vertaalvragen; review en critical judge verwerkt.
  - [ ] Vertaalvragen: de kolom Plaats van het register tonen (`Vertaalvraag` heeft er nog geen veld voor).
  - [ ] Vertaalvragen: status "onbeslist" betekent "geen statuswoord in de tekst"; overwegen of de logs een vast statusveld krijgen, zodat het filter "open" volledig is.
  - [ ] Begrippen: de heuristieken voor werkregels en verschijnselen (`src/begrippen/precedentVormen.ts`) en de statuswoorden (`verzamelVragen.ts`) zijn op Lukas afgesteld; bij een tweede boek uit `boek.json` halen.
  - [x] **Fase 3** (bewerken) gebouwd op branch `fase-3-bewerken` met /autopilot: vers-editor, tussenstand in localStorage (wijkt af van het plan: geen IndexedDB), opmaakwaarschuwing, terug naar de repo per vers; review en critical judge verwerkt.
  - [ ] Bewerken: verschil t.o.v. de repo zichtbaar maken; terug per hoofdstuk; knop of sneltoets om opmaak te zetten.
  - [ ] Bewerken: waarschuwingen voor oude vormen en vaste begrippen, met de lijst uit `controleer_hoofdstuk.py` als gedeelde JSON voor Python en TypeScript.
  - [ ] Bewerken: waarschuwing alleen bij opmaak die de repo-versie nog had (nu t.o.v. de bron, dus een bewust ontbrekende tag geeft steeds een waarschuwing).
  - [ ] Bewerken: kleine punten uit de review: onleesbare verzen in de opslag verdwijnen stil bij de volgende bewaring; dubbele samenvoeglogica in `tussenstand.ts` en `versknip.ts`; focus na Terug naar de repo; waarschuwingen als live region.
  - [ ] Rooktest van het leesscherm (render met DOM of Playwright op `dist/`), nu alleen handmatig gecontroleerd.
  - [ ] "precedent" in de kolom Regels koppelen aan de bijbehorende regel in `precedenten.md` (nu opent de doorzoekbare tabel).
  - [ ] `redactietool/src/klembord/chromiumKlembord.mjs` (alleen macOS, gebruikt rolldown van Vite en Playwright uit `/tmp/pw`) opnemen in de tests of vervangen.
  - [ ] `document.title` per hoofdstuk zetten; Node-versie op één plek (nu `mise.toml` 26.13.1 en workflow `26`).
  - [ ] Pages aanzetten in de repo-instellingen (bron: GitHub Actions); daarna publiceert de workflow bij elke push naar `main`.
- [x] Kolom **Verzen** in `bijbel/lukas/referentie/open-vragen.md` (35 van 36 vragen; "aanhalingstekens" bewust leeg)
- [ ] `WERKPLAN.md` deel D (aangeleverd Word terugvoeren) een keer doorlopen met het eerstvolgende aangeleverde hoofdstuk, en bijstellen waar nodig
- [ ] Gedeelde begrippenlijst voor alle boeken: zodra de redactie precedenten `vast` maakt, de boekoverstijgende begrippen (Mensenzoon, discipel, Farizeeën …) uit `bijbel/lukas/referentie/precedenten.md` naar een gedeelde lijst verhuizen
- [x] Afwijking in `controleer_docx_md.py` (Lukas 8 onderstreept, md 2 tegen docx 1) verklaard: in 8:1 is de onderstreping in Word één reeks; de md splitst hem rond een spatie die niet rood is. Tekst en opmaak per teken kloppen; geen actie
