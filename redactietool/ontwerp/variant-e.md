# Variant e: A met lucht

De kolomindeling van A met de rust van C. Alleen CSS (`src/ontwerp/variant-e.css`, een bewerkte kopie van `variant-a.css`), geen markup aangepast.

## Wat ik van A hield
- De breedte: versnummer, bron (25%), vereenvoudiging (45%) en regels als het resterende deel. De vereenvoudiging krijgt de meeste ruimte.
- Bewerken als tekstlink rechtsonder, pas zichtbaar bij hover of een gekozen vers; de hoofdactie in donkerrood; tabbladen als tekst met lijn.

## Wat ik uit C nam
- Grijze zijbalk en grijs zijpaneel (`#f5f5f5`) zonder randlijn; wit in het midden.
- Rustige regels: kleiner (11,5 px), grijs, zonder lijnen tussen de regels.
- Een rode streep alleen bij het gekozen hoofdstuk en bij "Begrippen en vragen". "Sluiten" in het paneel is een tekstlink.
- Veel witruimte, een gevulde rode hoofdknop, "Bewerken" pas bij hover.

## Wat ik veranderde
- Tussen de verzen geen lijnen meer, wel ruim 1,1 rem boven en 1,9 rem onder de tekst. Over blijft de lijn onder de kolomkoppen.
- Geen lijn links van de vereenvoudiging; de kolommen scheiden door witruimte.
- Letters: bron 14 px, vereenvoudiging 19 px (regelafstand 1,55). De hiërarchie komt uit de grootte, want de kleur van de bron blijft Word-zwart.
- Het gekozen vers heeft een zwarte streep bij het versnummer en een lichtgrijs vlak, niet rood: rood hoort niet naast de tekstkolommen.
- Het kader van de vers-editor is zwart (1 px kader plus 1 px rand bij focus).
- Tabellen in Begrippen en het zijpaneel: lichte rijlijnen en meer ruimte; de kopregel heeft één grijze lijn.
- `--boek` is Figtree en `--tool` is Inter (tijdelijk, via één `@import`).

## Opmaakcontrole
`opmaak.mjs` voor e: Lukas 1, 4 en 22 geven 0 verschillen (484, 271 en 412 stukken), en de vers-editor ziet er hetzelfde uit als in de huidige tool.

## Markup-wensen
- Een klasse op de cellen met Bijbeltekst in de richtlijntabellen, in plaats van kolomnummers.
- De standaardstatus "review" weglaten in de zijbalk.
- De kolom Regels smaller of inklapbaar: bij lange regels wordt een rij erg hoog en ontstaat daar te veel wit onder de vereenvoudiging.
