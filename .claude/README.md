# Claude Code-configuratie voor deze repository

Claude Code laadt dit automatisch voor iedereen die in deze repo werkt. Het meeste is bedoeld voor het bouwen van de redactietool (`redactietool/PLAN.md`). Voor het vertalen zelf gelden `CLAUDE.md`, `WERKPLAN.md` en de richtlijn.

| Map / bestand | Inhoud |
|---|---|
| `commands/` | `/intent` en `/pr` |
| `skills/` | Skills, zie [Herkomst](#herkomst) |
| `rules/` | Regels die laden bij bestanden in hun `paths`: `code-kwaliteit` (incl. comments), `testen`, `typescript` |
| `hooks/check_em_dash.py` | Blokkeert em-dashes bij Write en Edit (zie `CLAUDE.md`, "Schrijfstijl") |
| `settings.json` | Koppelt de hook |
| `references/` | Checklists waarnaar de skills van Osmani verwijzen (toegankelijkheid, prestaties) |
| `worktrees/` | Lokaal, niet in git |

## Herkomst

| Onderdeel | Bron | Waarvoor hier |
|---|---|---|
| `grilling` | [mattpocock/skills](https://github.com/mattpocock/skills) @ `5863806` | Plan of ontwerp doorvragen tot alles beslist is (review van `redactietool/PLAN.md`) |
| `grill-with-docs` | idem | Zelfde als `grilling`, maar legt besluiten meteen vast (ADR's en `GLOSSARY.md`); alleen handmatig te starten |
| `domain-modeling` | idem | Begrippenlijst (`GLOSSARY.md`) en ADR's voor de code van de tool; nodig voor `grill-with-docs` |
| `codebase-design` | idem | Woordenschat voor modules en grenzen; gebruikt door `tdd` |
| `tdd` | idem | Test-first, o.a. voor de pariteitstest JS ↔ Python en md → editor → md |
| `prototype` | idem | Wegwerpprototype, bv. van de keuzemenu-UX in de stijl van DeepL |
| `diagnosing-bugs` | idem | Systematisch fouten opsporen |
| `two-axis-review` | idem (`code-review`) | Review van een branch op twee assen: standaarden en spec (de spec is meestal het intentiebestand of `redactietool/PLAN.md`) |
| `frontend-ui-engineering` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) @ `39b723c` | Toegankelijke, responsieve interface |
| `performance-optimization` | idem | Prestaties (1.100+ verzen in één editor) |
| `browser-testing-with-devtools` | idem | De tool testen in een echte browser; **vereist de Chrome DevTools MCP-server** (zie de skill) |
| `/intent`, `/pr`, `writing`, de rules en de hook | eigen bewerking van de Claude-configuratie van een ander project van de eigenaar | Nederlands, en aangepast aan deze repo: geen issue tracker, base `main`, geen fork |

De licenties van de twee open-source bibliotheken (MIT) staan in `skills/_licenties/`.

## Aanpassingen aan de overgenomen skills
- `code-review` heet hier `two-axis-review`, om botsing met de ingebouwde `/code-review` van Claude Code te voorkomen. In de skill staat in plaats van de verwijzing naar een issue tracker waar in deze repo de spec en de standaarden staan. `tdd` verwijst naar de nieuwe naam.
- De mappen `agents/` (instellingen voor OpenAI/Codex) zijn weggelaten.
- Verder ongewijzigd, ook de em-dashes in de Engelse tekst (de hook controleert alleen nieuwe tekst). Bijwerken: opnieuw kopiëren uit de bron en deze aanpassingen opnieuw doen.

## Let op
- `domain-modeling` schrijft ADR's naar `docs/adr/` en de begrippenlijst naar `GLOSSARY.md`. Die begrippenlijst gaat over de code van de tool, niet over de Bijbelse begrippen; die staan in de precedenten per boek.
- Wie de plugin `mattpocock-skills` ook globaal heeft, ziet sommige skills dubbel (bv. `grilling` en `mattpocock-skills:grilling`). Ze doen hetzelfde.
- De overgenomen skills zijn Engelstalig; de eigen onderdelen en alles wat ze opleveren zijn Nederlands (zie `writing`).
