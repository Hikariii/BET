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
- [ ] Redactietool, plan in `docs/PLAN.md` (v2, vastgesteld). Volgorde: fase 0 → 1 → 2 → 3 → 5 → 4.
  - [ ] **Fase 0, eerstvolgende taak**: prototype kopiëren en plakken in Word met de echte stijlen; testen op Windows in Edge en Chrome; resultaat door `docx_naar_md.py`. Uitkomst bepaalt of er een Word-download in fase 5 komt.
- [ ] `WERKPLAN.md` deel D (aangeleverd Word terugvoeren) een keer doorlopen met het eerstvolgende aangeleverde hoofdstuk, en bijstellen waar nodig
- [ ] Gedeelde begrippenlijst voor alle boeken: zodra de redactie precedenten `vast` maakt, de boekoverstijgende begrippen (Mensenzoon, discipel, Farizeeën …) uit `bijbel/lukas/referentie/precedenten.md` naar een gedeelde lijst verhuizen
- [x] Afwijking in `controleer_docx_md.py` (Lukas 8 onderstreept, md 2 tegen docx 1) verklaard: in 8:1 is de onderstreping in Word één reeks; de md splitst hem rond een spatie die niet rood is. Tekst en opmaak per teken kloppen; geen actie
