---
description: Leg vast waar deze branch voor is (doel, criteria, wat er niet in komt) voordat het werk begint.
argument-hint: "[fase uit redactietool/PLAN.md of een regel over het werk]"
---

# Intentie vastleggen

Invoer: $ARGUMENTS: een fase of onderdeel uit `redactietool/PLAN.md`, een regel over het werk, of niets (vraag dan waar de branch voor is).

Het bestand is `.plan/intent-<branch>.md`, met `/` in de branchnaam vervangen door `-`. `.plan/` staat in `.gitignore`. Bestaat het bestand al, werk het dan bij.

## Stappen

1. Fase of onderdeel uit `redactietool/PLAN.md` genoemd, of af te leiden uit de branchnaam: neem de "klaar als" van die fase en de besluiten die erbij horen als uitgangspunt. Een mechanisme dat het plan noemt is een voorstel, geen eis. Schrijf nooit terug in `redactietool/PLAN.md` zonder dat te zeggen.
2. Schrijf het bestand in deze vorm, in gewone woorden volgens de [writing-skill](../skills/writing/SKILL.md):
   ```markdown
   # <doel in één regel>

   - <criterium dat een reviewer aan de diff kan controleren>
   - ...

   Keuzes:
   - <keuze tijdens het werk>: <waarom>, of "nog geen"

   Niet in deze PR: <wat erbuiten blijft>, of "niets weggelaten".

   Open vraag: <een beslissing die de eigenaar nog moet nemen>, of "geen".

   Plan: redactietool/PLAN.md, fase <n>
   ```
   2 tot 5 criteria, geschreven als uitkomst, niet als implementatie ("een opgeslagen keuze staat na herladen nog in de editor", niet "IndexedDB toevoegen").
3. Toon het bestand; goedkeuring is niet nodig.

## Tijdens het werk

Zie `CLAUDE.md`, "Intentie". Een gewijzigd of geschrapt criterium blijft in de lijst staan, met wat er veranderde en waarom.
