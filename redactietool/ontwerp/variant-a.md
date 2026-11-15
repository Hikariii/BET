# Variant a: Werkblad

Compact en precies, als een goed gezette werktabel. Alleen CSS (`src/ontwerp/variant-a.css`), geen markup aangepast.

## Lettertypes
- Bijbeltekst (bron, vereenvoudiging, vers-editor, context in Vervangen, bron- en vereenvoudigd-kolommen in Besloten, Gevonden en de precedententabellen): Source Serif 4, met optische maat. Het is een heldere boekletter die op 15 tot 18 px goed leest en de rode, groene en blauwe woorden goed laat staan.
- Tool (menu, knoppen, regels, panelen, tabellen): Inter op 13 px. Neutraal en smal genoeg voor veel informatie per scherm.
- Beide komen van Google Fonts (`@import` bovenaan), met Georgia en systeemletter als terugval.

## Schaal
- Vereenvoudiging 18 px, zwart, regelafstand 1,5: dit is het werkstuk.
- Bron 15 px, zwart zoals in Word: referentie, kleiner dan de vereenvoudiging. De kleuren uit het Word-sjabloon blijven ongemoeid, dus Jezuswoorden blijven rood.
- Regels 12 px; kopjes boven kolommen 11 px, hoofdletters met letterspatiëring; paginatitel 22 px.
- Gewichten: 400 gewone tekst, 500 labels, 600 titels en actieve plek, 700 alleen het gekozen vers en hoofdstuk.

## Rood (`#a61816`)
Alleen: de rode balk links van het gekozen hoofdstuk en het gekozen vers, de onderstreping van het actieve tabblad, de hoofdactie per scherm (Kopiëren naar Word, Zoeken, Toepassen) en de focusrand. Nooit in tekstkolommen. Verder zwart, wit en grijs.

## Opgelost
- Statusbolletjes zijn gewone grijze woorden; alleen "goedgekeurd" is zwart met vinkje.
- Bewerken is een tekstlink rechtsonder in de cel, zichtbaar bij hover, gekozen vers of toetsenbordfocus (en altijd bij een bewerkt vers).
- Regels: geen chips meer. De §-verwijzingen zijn onderstreepte tekstlinks, de regels staan als lijst met dunne scheidingslijnen.
- Versnummers zijn een grijs cijfer, geen blauwe link; het gekozen vers wordt zwart en vet.
- Actief hoofdstuk: grijs vlak met rode balk, geen blauw blok.
- Hiërarchie bron en vereenvoudiging: grootte, kleur en een lijn links van de vereenvoudiging.
- Gekozen vers: licht grijs, geen geel.
- Tabbladen zijn tekst met een lijn eronder. Formulieren en knoppen hebben vlakke, vierkante kaders; de hoofdactie is rood.
- Vertaalvragen: geen gekleurde pillen of kaartjes, alleen lijnen; "open" valt op door gewicht.
- Vervangen: doorgehaald grijs voor oud, onderstreept vet voor nieuw (geen geel en rood).

## Met alleen CSS niet gelukt
- De kolom Regels blijft breed (ongeveer een derde); smaller maken lukt alleen met andere markup of een uitklapper.
- Bewerken staat onzichtbaar maar wel in de tabindex-volgorde; liever een knop per rij die alleen bij focus bestaat.
- Statuswoord "review" in de zijbalk blijft zichtbaar (24 keer); weglaten van de standaardstatus kan alleen in de markup.
- Welke kolommen in de richtlijntabellen Bijbeltekst zijn, wordt via kolomnummer geraden; een klasse op die cellen is beter.
- Het kopje "Plaats of aantal" in Besloten is smal; kolomgroepen zouden dat sturen.
