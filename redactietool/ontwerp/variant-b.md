# Variant b: Dicht bij Word

Alleen CSS: `src/ontwerp/variant-b.css`, te zien met `?ontwerp=b`. Schermen: `ontwerp/schermen/*-b.png`.

## Lettertypes
- Bijbeltekst (bron, vereenvoudiging, vers-editor, context in Vervangen): **Figtree**. Schreefloos, open en vriendelijk, dicht bij Aptos in Word, dus de vertaler ziet ongeveer wat in Word komt.
- Gereedschap (menu, knoppen, regels, tabellen, panelen, koppen): **IBM Plex Sans Condensed**. Smal en technisch, duidelijk anders dan de tekst.
- Versnummers, kolomkoppen, labels en statussen: **IBM Plex Mono**, klein, vaak in hoofdletters. Zo wordt een label nooit voor tekst aangezien.

## Schaal
- Vereenvoudiging: 19 px, gewicht 400, regelafstand 1,5, zwart. Dit is het werkstuk.
- Bron: 16 px, regelafstand 1,55, zwart zoals in Word. Referentie, kleiner dan de vereenvoudiging.
- Regels: 13 px condensed, grijs, geen opsommingstekens; ze lopen in een smalle kolom met een dunne lijn ervoor.
- Titels 36 px (hoofdstuk) en 24 px (zijbalk, paneel), vet. Labels 11 px mono. Tabs 17 px.
- Rijen scheiden met een lijn van 1 px in lichtgrijs; kolomkoppen met een zwarte lijn. Geen schaduwen, geen afgeronde hoeken.

## Rood (#a61816)
Alleen: het gekozen hoofdstuk (streep en nummer in de zijbalk), het gekozen scherm Begrippen, het actieve tabblad (streep onder), de rode streep in de goot naast het gekozen vers (niet in de tekstkolommen), de hoofdacties (Klaar, Zoeken, Toepassen) en focus, ook het kader van de vers-editor. De rest is zwart, wit en grijs. Kleuren van de Bijbeltekst (inline) zijn niet aangeraakt.

## Opgelost
- Statusbolletjes: gewone woorden, goedgekeurd zwart en vet, review grijs.
- Bewerken: tekstlink rechtsboven in de vereenvoudiging, alleen zichtbaar bij hover, focus of gekozen vers.
- Regels: geen blauwe chips; verwijzingen (§27, precedent) zijn onderstreepte mono-tekst.
- Versnummers: grijs mono, geen link-uiterlijk (onderstreept alleen bij hover).
- Actief hoofdstuk: rode streep, geen blok. Gekozen vers: lichtgrijs vlak, geen geel.
- Tabs: gewone woorden met een streep onder de actieve. Formulier en knoppen: vierkant, zwarte rand, labels in mono.
- Vertaalvragen: de gekleurde pillen zijn tekststatussen; vragen en tabellen zijn lijsten met dunne lijnen.
- Vervangen: doorgehaald (oud) en vet onderstreept (nieuw) in plaats van rood en geel.

## Niet gelukt met alleen CSS
- Bewerken staat in de DOM boven de rij en is met `opacity` verborgen; een echt "kopje" per rij of een potlood-icoon vraagt markup.
- De vers-editor erft een leidende spatie uit de data (`pre-wrap`), waardoor de eerste regel inspringt.
- Verhouding bron/vereenvoudiging per kolom (`<col>` of grid) zou schoner zijn dan vaste breedtes op de kolomkoppen.
- Het tabblad Besloten en Gevonden hebben geen eigen klassen voor kolommen; ik pak ze met `:nth-child`-achtige selectors niet, dus de volgorde blijft zoals ze is.
- Het ontwerp-keuzestrookje rechtsonder valt buiten de CSS en blijft in de standaardletter.
