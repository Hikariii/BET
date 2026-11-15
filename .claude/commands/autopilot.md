---
description: Voer een fase uit redactietool/stap2-plan.md zonder toezicht uit, van onderzoek tot een gecommitte branch op main (zonder push).
argument-hint: "[fase uit redactietool/stap2-plan.md, bv. 'fase 7']"
---

Fase: $ARGUMENTS. Geen fase genoemd: vraag welke en stop.

Voer deze fase uit van onderzoek tot een gecommitte branch die op `main` is overgenomen. Niemand kijkt mee.
Waar je normaal de eigenaar zou vragen (een ontwerpkeuze, een afwijking van het plan, een oordeel), vraag je de [tegenspreker](#tegenspreker) en beslis je daarna zelf.
Leg elke beslissing vast in het intentiebestand onder `## Beslissingen zonder toezicht`: de keuze, het bewijs, en of de tegenspreker het eens was.

Volg de stappen als taken:

1. **Start.** Branch vanaf een actuele `main` (`fase-N-<kort>`). Draai [/intent](intent.md) met de fase. Lees `CLAUDE.md`, `redactietool/stap2-plan.md` (en `redactietool/stap1-plan.md` voor uitgangspunten en architectuur), `FORMAAT.md` en de rules in `.claude/rules/`.
2. **Onderzoek.** Zoek de gaten waar de fase op leunt: een aanname, een bewering zonder `bestand:regel`, gegevens die nog niet bestaan, een randgeval in de data van `bijbel/`. Sluit elk gat met één subagent per vraag (alleen lezen) en zet de antwoorden in het intentiebestand.
3. **Plan en contract.** Verdeel het werk in onderdelen die los te bouwen zijn. Leg eerst het gedeelde contract vast (types, vaste plekken voor functies met een lege invulling, wie welk bestand bezit) en commit dat. Alleen wat echt rendeert krijgt een eigen subagent: een onderdeel dat los te bouwen en te testen is, met eigen bestanden.
4. **Bouwen.** Start de subagents tegelijk, elk met `isolation: worktree`, in één bericht. `.plan/` en `node_modules/` staan in `.gitignore` en zijn in een worktree niet aanwezig: geef het absolute pad van het intentiebestand mee en laat elke subagent eerst `mise x node@26.13.1 -- npm ci` in `redactietool/` draaien. Geef elk: wat te lezen, de taak, de bestanden die van hem zijn en die niet van hem zijn, de regels (Nederlands, geen em-dashes, strikte types, testen volgens `.claude/rules/testen.md` inclusief één keer bewust breken), committen in de eigen worktree-branch zonder push, en wat het rapport moet bevatten. Neem hun werk over met `git cherry-pick` (geen merge-commits); los botsingen op in het voordeel van de echte invulling boven de lege. Ruim daarna alleen de worktrees en branches op die deze run zelf maakte; laat andere worktrees (bv. van de Orchestrator of een andere sessie) staan.
5. **Geheel controleren.** In `redactietool/`: typecheck, alle tests, build. Bekijk de gebouwde site met Playwright (`/tmp/pw`, of installeer daar opnieuw) en controleer dat er geen consolefouten zijn; stop de preview-server daarna. Raakt de fase de scripts in `scripts/`: draai de heen-en-terugtest en de controles uit `CLAUDE.md`.
6. **Review.** Werk eerst het intentiebestand bij met wat er feitelijk gebouwd is. Start dan een onafhankelijke reviewer (frisse `general-purpose`-subagent, alleen lezen) die `.claude/skills/two-axis-review/SKILL.md` volgt met het intentiebestand als spec; geef hem geen eigen conclusies. Start daarna een **critical judge** (frisse subagent) die elke bevinding toetst aan de code: terecht, overdreven of fout, met een advies per bevinding. Verwerk wat de judge aanraadt, draai stap 5 opnieuw, en laat bij grote wijzigingen nog één review op alleen die wijzigingen doen.
7. **Afronden.** Werk `TAKEN.md` en de stand van de fase in `redactietool/stap2-plan.md` bij (en noem elke wijziging aan het plan in het eindverslag). Commit op de branch (Nederlandse boodschap, attributieregels volgens de omgeving). Neem de branch op `main` over zonder merge-commit en zonder bestaande commits op `main` te herschrijven:
   ```bash
   git status --short          # moet leeg zijn; anders stoppen en melden
   git rebase main <branch>    # de branch bovenop main zetten
   git checkout main && git merge --ff-only <branch>
   ```
   Lukt `--ff-only` niet, stop dan en meld het. **Niet pushen.**

## Tegenspreker

Een frisse `general-purpose`-subagent, geen fork. Geef de vraag, de opties, je voorlopige keuze en het pad van het intentiebestand. Vraag hem tegen je keuze in te gaan, te kijken hoe recente commits in deze repo vergelijkbare keuzes maakten, goede praktijk mee te wegen, en terug te komen met een advies plus het feit dat het advies zou omdraaien. Bundel samenhangende vragen.

## Grenzen

- **Nooit zonder de eigenaar:** pushen; GitHub-instellingen (bv. Pages); iets wijzigen in `origineel/`, `bron/` of `richtlijn/`; inhoudelijke vertaalkeuzes: de kwestie, de gekozen oplossing, de status of het besluit van een open vraag of precedent, en de vereenvoudigde tekst zelf. Zet zulke punten als open vraag in het eindverslag.
- **Wijzigingen in `bijbel/`** alleen als de fase daar structuur of afgeleide data voor nodig heeft (zoals de kolom Verzen in `open-vragen.md`), nooit aan de inhoud van verzen of aan besluiten.
- **Weigert de toestemmingscontrole een stap:** niet omzeilen. Ga door met wat kan en meld het in het eindverslag.

## Doorwerken

Werk door tot stap 7 klaar is. Beëindig geen beurt om samen te vatten, de volgende stap aan te kondigen of door te gaan aan te bieden; zet korte statusregels in hetzelfde bericht als de volgende toolaanroep.
Stop alleen als niets meer kan zonder de eigenaar, of bij een stap uit Grenzen. Dezelfde fout na drie pogingen: draai één keer de skill `diagnosing-bugs`, markeer de taak dan als geblokkeerd en ga door met de rest.

## Eindverslag

De uitkomst; elk criterium uit het intentiebestand gehaald of niet; de beslissingen om na te kijken (onomkeerbare eerst); wat er nog nodig is van de eigenaar (push, instellingen, open vragen); de commits op `main`.
