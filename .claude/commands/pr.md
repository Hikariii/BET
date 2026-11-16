---
description: Commit, push naar origin en open een ingevuld PR-formulier in de browser.
argument-hint: "[draft]"
---

# Een PR openen

Commitbericht en PR-tekst volgen de [writing-skill](../skills/writing/SKILL.md), in het Nederlands. Kortste versie die werkt: alleen een onderwerpregel, tenzij het waarom niet uit de diff blijkt.

De reviewer heeft de PR en wat die linkt, nooit de sessie: alles wat in de sessie genoemd of besloten is, schrijf je uit; een andere PR met zijn nummer.

Nooit `gh pr create` zonder `--web`. Dit commando stopt bij het ingevulde formulier; de gebruiker bekijkt daar de diff en maakt de PR aan.

## Stappen

1. `git status` + `git diff` (staged en unstaged) + `git log origin/main..HEAD`: kijk wat er echt in gaat.
2. Op `main`? Eerst een branch maken.
3. Geen `.plan/intent-<branch>.md` ([/intent](intent.md))? Schrijf het uit de sessie en de diff in de vorm van dat commando, en zeg dat.
4. Werk dat nog niet gecommit is: stagen en committen. Eén onderwerpregel in de gebiedende wijs die de ene uitkomst noemt, nooit een lijst van wijzigingen; de PR-titel is dezelfde regel. Geen body tenzij het waarom niet voor de hand ligt. Nooit `--no-verify`. Sluit af met de attributieregels die de omgeving voorschrijft.
5. `git push -u origin HEAD`.
6. Wijziging aan de omzet-, export- of controlescripts: draai eerst de heen-en-terugtest (`python3 -I scripts/controleer_heen_en_terug.py --boek <boek>`) en de controles (`CLAUDE.md`, "Gereedschap") en neem het resultaat op onder evidence.
7. Schrijf de body naar een tijdelijk bestand en open het formulier:
   ```bash
   gh pr create --web --base main --head <branch> --title "<titel>" --body-file <bestand>
   ```
   - `--body-file`, nooit `--body "..."`: aanhalingstekens in de shell breken de backticks.
   - `/pr draft`: zeg dat draft in het formulier aangevinkt moet worden.
   - Body langer dan ~8.000 tekens na URL-codering: vul alleen de eerste hele secties in die passen, schrijf de rest naar een tijdelijk bestand en zeg dat die onderaan geplakt moet worden.
8. Toon titel en body als platte tekst, plus het pad van het restbestand.

## Eén PR of meerdere

Stel alleen een splitsing voor als de PR te groot of te weinig samenhangend wordt om in één keer te beoordelen. Elke PR geeft de reviewer één ding om te beoordelen.

## Body

Elk blok alleen als het de reviewer helpt; de body groeit mee met de diff.

**Bovenblok**, zonder kopjes:
1. `**vraag:**` één vette regel uit "Open vraag" van het intentiebestand, tenzij die "geen" is.
2. Inleiding: hooguit 3 zinnen: wat de PR verandert, zo breed als de titel, en wat er ontbrak of stuk was.
3. Laten zien, niet vertellen: echte uitvoer, een voorbeeld of een schermafbeelding, als voor/na wanneer de PR het verandert, ingekort tot de regels die het tonen. Een gewijzigd formaat krijgt een skelet als ```` ```diff ```` van oude en nieuwe vorm, nooit een volledig voorbeeld.
4. Eén mermaid-diagram van het hoofdpad, alleen als het iets toevoegt.
5. Hoe het werkt: 3 tot 5 genummerde stappen van het hoofdpad, met één of twee namen uit de code per stap.

**`### keuzes`**: hooguit 5 keuzes uit het intentiebestand waar een reviewer naar zou vragen, één korte regel per keuze met de reden.

**`### afwijkingen`**: elk criterium dat veranderde, vervallen is of gebouwd maar niet bewezen, één regel: `<onderwerp>: gepland <X>, nu <Y>. <waarom>`.

**`### niet gedaan`**: "Niet in deze PR" uit het intentiebestand en bekende beperkingen; elk als `<details><summary>item</summary>` met de reden erin.

**`### bewijs`**, als laatste: één `<details><summary><b>soort</b>: bewering</summary>` per bewering, met het bewijs erin (foutmelding, ingekorte uitvoer). Draai elke controle eerst. Soorten:
- `rood → groen`: een test die faalt zonder de wijziging, met de foutmelding, en slaagt met de wijziging.
- `bewust gebroken`: een controle één keer gebroken, en alleen de eigen test faalde.
- `ongewijzigd`: gedrag dat de wijziging zou kunnen breken, en wat laat zien dat dat niet gebeurde (bv. de heen-en-terugtest of een byte-gelijke export).
- `werkt`: een run van het nieuwe gedrag op echte data, met de uitvoer.
- `niet bewezen`: alleen wat lokaal niet kan draaien, met wat er nog te controleren is.

Nooit onder bewijs: aantallen tests, lint-resultaten, lokale omgevingsproblemen, een lijst testgevallen.

Elk punt staat onder één kopje: een geschrapt criterium onder afwijkingen, nooit ook onder niet gedaan of keuzes.

Mermaid op GitHub:
- Eerste regel van elk diagram: `%%{init: {"themeVariables": {"fontSize": "12px"}, "flowchart": {"padding": 6}}}%%`; nooit een `theme`.
- `flowchart TD`, ongeveer 6 knopen; labels van 1 tot 4 woorden die de actie noemen.
- Heen-en-weer tussen 3 of meer partijen (bv. inloggen bij Google): een `sequenceDiagram`.
- Elke flowchart: `classDef default fill:#8882,stroke:#888`; nooit een ondoorzichtige vulling, die blijft licht in de donkere modus.
- Label met `:`, `(` of `,` tussen aanhalingstekens: `A["label: x"]`.

Nooit: de diff navertellen, tabellen met bestanden, een testplan.

Laat ruimte onder een `---` leeg; die is voor de auteur.

## Een bestaande PR bewerken

Eerst `gh pr view --json body`, alles vanaf de laatste `---` letterlijk houden en alleen daarboven herschrijven.
