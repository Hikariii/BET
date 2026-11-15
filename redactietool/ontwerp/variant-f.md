# Variant f: Werkblad met focus op het werk

A als uitgangspunt, met de rust van C. Alleen CSS (`src/ontwerp/variant-f.css`), geen markup aangepast.

## Van A overgenomen
- De indeling en het ruimtegebruik: volle breedte, vier kolommen (vers, bron, vereenvoudigd, regels), zijbalk links, naslag rechts.
- Het Bewerken-koppeltje rechtsonder in de cel, pas zichtbaar bij hover of bij het gekozen vers.
- Tabbladen als tekst met een rode lijn onder het actieve tabblad, tabellen met dunne lijnen.

## Uit C genomen
- Grijze zijbalk (compact, 12 rem) en grijze naslag. Actief hoofdstuk: rode letters met een smalle rode balk.
- Gevulde donkerrode hoofdknop, de rest met een dun grijs kader dat bij hover zwart wordt.
- Regels als notitiekolom: klein, grijs, zonder lijnen tussen de regels. De "vraag" is een grijs kopje, geen kader.
- Tekstknoppen met een grijs lijntje eronder (Bewerken, Klaar, Sluiten).

## Wat ik veranderde
- Vereenvoudiging is het werkstuk: 19 px, 46% van de breedte. Bron 15 px, 27%. Regels 12 px in de rest (ongeveer een vijfde).
- Het gekozen vers staat in de versnummergoot: grijs vlak, rode balk en vet cijfer. De tekstkolommen krijgen alleen een heel lichte tint.
- Het vers in bewerking: de goot wordt zwart met een wit cijfer, de vers-editor krijgt een zwart kader (geen rood).
- Lijn onder de kolomkoppen is grijs; alleen "Vereenvoudigd" is zwart en vet.
- Statuswoord "review" in de zijbalk is nog lichter grijs.
- Letters: overal `--boek` (Bijbeltekst) of `--tool` (de rest); tijdelijke waarden Figtree en Inter in `:root`.

## Opmaakcontrole
`opmaak.mjs` met `VARIANTEN=f`: 0 verschillen in Lukas 1, 4 en 22, en de vers-editor (Lukas 22:12) heeft dezelfde kleur en stijl als de huidige tool. Op de Bijbeltekst staat alleen `color: #000`, lettertype en grootte.

## Wensen voor de markup
- Een klasse op de Bijbeltekst-cellen van de richtlijntabellen, nu geraden via kolomnummer.
- Standaardstatus "review" weglaten in de zijbalk: nu alleen lichter te maken.
- Een knop Bewerken die alleen bij focus bestaat, nu onzichtbaar maar wel bereikbaar met Tab.
- Met het naslagpaneel open is Regels smal (ongeveer 170 px); een uitklapper of een kolom die onder de tekst valt zou helpen.
