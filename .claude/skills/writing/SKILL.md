---
name: writing
description: Gebruik bij het schrijven van tekst voor mensen (commitberichten, PR-teksten, comments, documentatie, antwoorden in de chat): gewone woorden, geen AI-taal, geen em-dashes. Niet voor de vereenvoudigde Bijbeltekst zelf; daarvoor geldt de redactierichtlijn.
---

# Schrijfstijl

Voor alles wat een mens leest: chat, commits, PR's, comments, `README`, `WERKPLAN`, `docs/`. Taal: Nederlands (ook in code-comments en PR's). Begrippen uit het domein in het Nederlands (vers, hoofdstuk, redactiekeuze, herkomst); gangbare Engelse vaktermen blijven Engels (branch, commit, build, parser).

De vereenvoudigde tekst in `bijbel/*/vereenvoudigd/` volgt de redactierichtlijn, niet deze skill. Alleen de em-dash-regel geldt daar ook.

## Kort

- **Zeg het direct.** Geen inleiding, geen voorbehouden, geen beleefdheidsfrases.
- **Effect eerst, mechanisme daarna.** Begin met wat de lezer merkt; de uitleg komt erna, alleen waar die de volgende stap van de lezer verandert.
- **Detail naar de behoefte van de lezer, niet naar je eigen onderzoek.** Net iets uitgezocht hebben is het signaal dat je het te uitgebreid gaat opschrijven.
- **Kort maken kost nooit een precieze verwijzing.** Pad, `bestand:regel`, functienaam, commit en vlag blijven staan; "de eerdere comment" of "de helper" is vaag, niet kort.

## AI-taal vermijden

- **Gewone woorden.** De termen die de repo al gebruikt, zoals je ze hardop tegen een collega zou zeggen. Geen opgeblazen samenstellingen ("redactiekeuzeverwerkingspijplijn"), geen zelfbedachte labels.
- **Geen drietallen** ("helder, beknopt en onderhoudbaar"): houd het woord dat het werk doet. Een lijst van echt verschillende eisen mag wel.
- **Geen opgeblazen bijvoeglijke naamwoorden**: robuust, naadloos, uitgebreid, krachtig, elegant, aanzienlijk, zorgvuldig. Zeg wat het ding doet.
- **Geen samenvatting aan het eind** ("Kortom", een slotzin die de tekst herhaalt). Eindig bij het laatste echte punt.
- **Geen symmetrische steigers** ("Niet alleen X, maar ook Y"). Zeg X, zeg Y.
- **Geen overgangswoorden als opvulling** ("Daarnaast", "Bovendien", "Het is belangrijk op te merken dat"). Begin met het feit.
- **Geen formele vulwoorden**: middels (met, via, door), derhalve (dus, daarom), dientengevolge (daardoor), alsook (en), teneinde (om), dient te (moet).
- **Geen vage werkwoorden** ("zorgt voor een consistente ervaring"). Noem de concrete wijziging.
- **Geen aankondigende labels** in lopende tekst ("Let op:", "Belangrijk:", "Conclusie:"). Zeg het gewoon.
- **Geen vertaalde eigen Engelse kladversie.** Schrijf het Nederlands vanuit het ding zelf; noem de functie, het bestand of het veld.
- **Actieve vorm.** Noem wie het doet.
- **Geen em-dashes.** Een punt, dubbele punt, komma of haakjes. Afgedwongen door [`check_em_dash.py`](../../hooks/check_em_dash.py), behalve in de vaste logformaten (`bijbel/*/wijzigingslog/`, `bijbel/*/referentie/`, `sjablonen/`) en in `richtlijn/`.

## Woorden en code

- **Schrijf woorden voluit.** Afkortingen als `ID`, `URL`, `PR`, `JSON` mogen; verder voluit.
- **Houd samengestelde domeintermen heel**: "redactiekeuze", niet "keuze", als dat het onderwerp is.
- **Nooit afbreken op een vaste breedte**, in chat, tekst of comments: alleen na een zin of lijstitem.
- **Geen documentjargon in code.** Labels uit `.claude/`, `docs/PLAN.md` of `WERKPLAN.md` (B1, O7, "fase 3") horen niet in comments of testnamen; beschrijf het gedrag in de woorden van de code.

```
Slecht: Deze PR introduceert een robuuste en uitgebreide oplossing die naadloos
        alle redactiekeuzes verwerkt, wat de onderhoudbaarheid aanzienlijk verbetert.
Goed:   Sla redactiekeuzes per hoofdstuk op in IndexedDB. Na herladen staan ze er nog.
```
