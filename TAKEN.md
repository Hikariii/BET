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
- [~] Web-tool in `docs/` om vertalingen te redigeren en naast het origineel te vergelijken. Plan in `docs/PLAN.md` (concept, ter review)
  - Leest het formaat uit `FORMAAT.md`; zorg dat de JavaScript-parser en `scripts/` hetzelfde opleveren (bv. een gedeelde set testbestanden).
  - Publicatie via GitHub Actions, die de boeken bij het bouwen naar JSON omzet (PLAN O7).
- [ ] Gedeelde begrippenlijst voor alle boeken: zodra de redactie precedenten `vast` maakt, de boekoverstijgende begrippen (Mensenzoon, discipel, Farizeeën …) uit `bijbel/lukas/referentie/precedenten.md` naar een gedeelde lijst verhuizen
- [ ] Bekende afwijking in `controleer_docx_md.py`: Lukas 8 onderstreept, md 2 tegen docx 1 (bestond al; uitzoeken of het aan de omzetting of aan de telling ligt)
