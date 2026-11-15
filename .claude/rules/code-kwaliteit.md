---
name: code-kwaliteit
description: Regels voor het schrijven en reviewen van code: bestaande functionaliteit eerst, onderdrukken van waarschuwingen, zelfreview, en waar comments wel en niet horen.
paths:
  - "scripts/**"
  - "redactietool/**/*.ts"
  - "redactietool/**/*.tsx"
  - "redactietool/**/*.js"
  - "redactietool/**/*.css"
  - ".claude/hooks/**"
---

# Codekwaliteit

## Bestaande functionaliteit eerst

Kijk voor eigen code of een bestaande afhankelijkheid of de taal zelf het al doet; zo ja, gebruik dat. Past een bibliotheek bijna: breid die uit in plaats van ernaast iets eigens te bouwen. Een tijdelijke aanvulling krijgt een markering met wanneer hij weg kan.

De Python-scripts gebruiken alleen de standaardbibliotheek. Een nieuwe afhankelijkheid daar is een keuze voor de eigenaar.

## Waarschuwingen onderdrukken

Onderdrukken is het laatste middel. Eerst: 1) de code repareren; 2) de types verbeteren; 3) de configuratie van de tool aanpassen als de regel niet past bij deze repo.

Alleen twee geldige redenen:
1. **Bevestigde vals-positieve melding**: de tool heeft het mis en geen wijziging aan code of types lost het op. Mag; schrijf erbij waarom.
2. **De oplossing vraagt een grote refactor of kan gedrag breken**: vraag eerst de gebruiker.

Altijd met een comment die de reden noemt (`// eslint-disable-next-line <regel> -- <reden>`, `# noqa: <code>  <reden>`).

Raak je code aan met zo'n onderdrukking: kijk of hij weg kan.

## Zelfreview voordat je code laat zien

Laat geen code zien voordat elk punt gecontroleerd is:

- **Overbodige parameters**: is een parameter af te leiden uit een andere?
- **Herhaling bij de aanroeper**: dezelfde 1 of 2 regels na elke aanroep van een helper horen in de helper.
- **Eén taak per functie**: een functie die twee toestanden afhandelt (toevoegen en verwijderen) wordt er twee.
- **Namen**: geen afkortingen; elke naam zegt wat het betekent in het domein, niet hoe het gemaakt is.
- **Scheiding**: één duidelijke verantwoordelijkheid per eenheid.
- **Leesbaarheid**: lees het alsof je het voor het eerst ziet en vereenvoudig wat moeilijker is dan nodig.
- **Eén bron van waarheid**: een lijst van paden, tags of stijlen die al als data bestaat (`FORMAAT.md`, `boek.json`, `controle.json`, het Word-sjabloon) wordt niet overgetypt in code of documentatie; verwijs ernaar of lees hem in. Een kopie loopt uit de pas.
- **Comments**: noem voor elke nieuwe comment de plek uit [Comments](#comments-eerst-de-juiste-plek) waar hij vandaan komt, en verwijder hem als het antwoord de code zelf is.

**Een taak is pas af als de controles slagen**: voor de scripts de controles en de heen-en-terugtest uit `CLAUDE.md`, voor de tool de tests en de build.

**Gedrag vastleggen vóór een refactor van gedeelde code**: eerst tests die het huidige gedrag vastleggen en groen zijn op de ongewijzigde code, dan refactoren. Geen tests: draai de oude en nieuwe versie op dezelfde invoer en vergelijk uitvoer, exitcode en geschreven bestanden (zoals de byte-vergelijking van de Word-export).

## Eén waarde in twee producten: één bron en een test

Moeten twee dingen die we maken dezelfde waarde dragen (de Python-parser en de JS-parser van `FORMAAT.md`, de opmaak in Word en in de tool): leid beide af uit één bron **en** leg de gelijkheid vast in een test. De gedeelde bron voorkomt verschil, de test vangt iemand die later een kant opnieuw afleidt.

## Comments: eerst de juiste plek

Je weet iets wat de lezer niet weet. Zet het op de plek die het het best vasthoudt; een comment is de laatste optie, niet de eerste.

| Wat je weet | Waar het heen gaat |
|---|---|
| Wat de code doet | nergens: de code zegt het al |
| Hoe een waarde tot stand kwam | een berekende uitdrukking of een benoemde constante |
| Een voorwaarde voor de aanroeper | een assert of een controle |
| Gedrag dat niet mag terugvallen | een test |
| De vorm die data moet hebben | een type |
| Wanneer je iets aanroept, of welke van twee | de naam |
| De redenering achter deze wijziging | de PR |
| Een regel voor een heel gebied | de documentatie bij de controle die hem afdwingt |
| **Een beperking van buiten het bestand die geen code kan vasthouden** | **een comment** |

Goed: `# Word laat een lege alinea met rand erboven zien als sectiescheiding; daarom twee lege regels.`
Fout: `# Lees de verzen` boven `lees_verzen()`.

- **Komt het op een comment uit, schrijf hem dan volledig**: de beperking, het getal en het gevolg.
- **Een comment beschrijft nooit de code eronder**, ook niet in andere woorden. Een stap-label (`# Opzet`) gaat weg; in een test mogen uitgangssituatie / actie / resultaat blijven.
- **Beschrijf de regel die moet gelden, niet de geschiedenis.** "X moet gelden" overleeft elke implementatie; "dit bestaat omdat X stuk was" veroudert.
- **Een comment over één stap staat bij die stap.**
- **Verwijs naar andere code met namen**, niet met "zie hierboven".
- **Een comment "zelfde als X" of "houd gelijk met Y" meldt duplicatie**: haal de gedeelde code eruit. Alleen een waarde die echt in twee bestanden moet staan, krijgt aan beide kanten een verwijzing.
- **Opmaak**: één zin per regel, nooit midden in een zin afgebroken.

Of een comment zijn plek verdient blijft een oordeel; geen enkele controle geeft daar toestemming voor.
