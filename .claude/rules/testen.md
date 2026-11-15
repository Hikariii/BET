---
name: testen
description: Algemene regels voor tests: opbouw, asserties, en een test laten falen om te bewijzen dat hij werkt. Geldt voor de tool en voor tests van de scripts.
paths:
  - "docs/**"
  - "scripts/**"
  - "**/*.test.*"
  - "**/tests/**"
---

# Testen

## Uitgangspunten

- **Test gedrag via de publieke ingang**, niet de interne opbouw. Een test breekt alleen als het gedrag verandert, niet bij een refactor.
- **Test alleen wat eigen is aan de code onder test.** Gedrag dat voor elke aanroeper van dezelfde bibliotheek geldt (ProseMirror, de `zipfile`-module), test je niet.
- **Controleer de uitkomst, niet de aanroepen**: het opgeslagen bestand bevat de keuze, niet "de opslag is één keer aangeroepen".
- **De belangrijkste tests in deze repo vergelijken twee kanten**: de JS-parser tegen de Python-scripts, en md → editor → md tegen het origineel, op alle bronhoofdstukken. Verwachte waarden komen uit een onafhankelijke bron (de bestanden in `bijbel/`), nooit uit dezelfde berekening als de code.

## Opbouw: uitgangssituatie → actie → resultaat

Controleer de uitgangssituatie vóór de actie, zodat de test laat zien wat de actie veranderde.

## Asserties

- **Een helper controleert zijn eigen resultaat.** Aanroepers herhalen dat niet.
- **De gecontroleerde waarde hoort alleen bij het geteste gedrag.** `0` past ook bij "alles geweigerd", `[]` ook bij "geen data". Kies de data zo dat de waarde uniek is.
- **Een voorrang of terugval vraagt beide kanten aanwezig en verschillend.**
- **Geen commentaar over de test zelf** in assertieberichten ("deze test controleert X"). Beschrijf het gedrag.
- **Twee aanroepen die verschillend uitkomen bij gelijke invoer**: de gelijke invoer moet in de test zichtbaar zijn (dezelfde helper, één extra parameter), anders bewijst het verschil niets.

## Breek de code om te bewijzen dat de test hem bewaakt

Een test voor een controle, weigering of vroege return die meteen slaagt: breek die ene tak, controleer dat **precies** die test faalt, en draai het terug.

- Nul fouten: de test bereikt de tak niet. Een onverklaarde extra fout: twee tests overlappen.
- Geldt ook voor tests die bestaand gedrag vastleggen: een groene run betekent pas iets als je hem een keer rood hebt gezien.
- Draai de proef terug met een gerichte bewerking, nooit met `git checkout` of `git restore` op het bestand: dan verdwijnt ook de wijziging die je test.
- De proef breekt code, nooit data in `bijbel/`, een remote of de werkmap.
