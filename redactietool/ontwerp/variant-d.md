# Variant d: Werkblad verfijnd

A met de rust van C. Alleen CSS (`src/ontwerp/variant-d.css`), geen markup aangepast. De letters zijn tijdelijk: `--boek` (Figtree) voor Bijbeltekst en `--tool` (Inter) voor al het andere; een ander lettersoort kiezen kan met `?letter=` of door die twee regels in `:root` te wijzigen.

## Wat ik van A hield
- De dichtheid en de drie kolommen (vers, bron, vereenvoudiging, regels) met dunne lijnen; geen kaartjes of schaduwen.
- Schaal: vereenvoudiging 18 px, bron 15 px, regels 12 px.
- Versnummer als grijs cijfer, gekozen vers met rode balk, Bewerken pas bij hover of keuze, regels als lijst met dunne scheidingslijnen.

## Wat ik uit C nam
- Grijze zijbalk (zonder rand) en grijs zijpaneel voor de naslag, met witte invoervelden.
- Gevulde donkerrode hoofdactie (Kopiëren naar Word, Zoeken, Toepassen).
- Knoppen zonder zwarte vulling bij hover: alleen het kader wordt zwart.
- Sluiten in het paneel als tekst met een lijn; tabbladen als tekst met een lijn.

## Wat ik verfijnde
- Het kader van de vers-editor is zwart (ook bij focus); er zit geen rood meer om of in de tekstkolommen.
- Kolombreedtes 28% bron en 42% vereenvoudiging, zodat Regels iets smaller wordt.
- Regelteksten iets lichter grijs, met meer lucht tussen de regels.
- In Besloten is de markering van "bronvorm staat nog" een dunne grijze streep zonder grijs vlak.
- Zijbalk en paneel hebben dezelfde grijstint.

## Opmaakcontrole
`opmaak.mjs` met alleen variant d: Lukas 1 (484 stukken), 4 (271) en 22 (412) geven 0 verschillen. De vers-editor in 22:12 geeft dezelfde kleur en stijl als de huidige tool.

## Markup-wensen
- Een klasse op de Bijbeltekst-cellen in de richtlijntabellen (nu geraden via kolomnummer).
- Standaardstatus "review" in de zijbalk weglaten.
- Regels-kolom als uitklapper of smaller; dat kan niet met CSS.
- Bewerken als knop die alleen bij focus bestaat (nu onzichtbaar maar wel in de tabvolgorde).
