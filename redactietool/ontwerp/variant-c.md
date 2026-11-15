# Variant c: Leesboek

De tekst staat in het midden op wit, de tool treedt terug in grijs. Eén bestand: `src/ontwerp/variant-c.css` (laden met `?ontwerp=c`).

## Letters
- Bijbeltekst (bron, vereenvoudiging, vers-editor, context in Vervangen, bron- en vertaalkolom in de precedenten): Literata. Gemaakt voor lang lezen op een scherm, met een eigen optische maat per grootte. Ook de vette en cursieve vormen hebben echt gewicht, dus de opmaak uit het sjabloon blijft goed leesbaar.
- Tool (menu, knoppen, regels, tabellen, panelen): Work Sans. Stil, met cijfers die netjes onder elkaar staan.

## Schaal
- Vereenvoudiging: 18,4 px (1,15 rem), regelafstand 1,7, zwart. Het werkstuk.
- Bron: 15,5 px, regelafstand 1,65, zwart zoals in Word. Referentie, kleiner dan de vereenvoudiging. Kleuren uit het sjabloon (Jezuswoorden, domeinen) blijven zoals ze zijn.
- Regels: 13 px, grijs, zonder opsommingstekens. Tool: 15 px; kleine koppen 11 px, hoofdletters, grijs. Titel 28 px, gewicht 600.
- Gewichten: 400 voor lopende tekst, 500 voor nummers en labels, 600 voor titels en de actieve plek.

## Rood (`#a61816`)
Alleen: het gekozen hoofdstuk (rode streep en rood nummer), het actieve tabblad, het gekozen versnummer (streep in de nummerkolom), de hoofdactie (Kopiëren naar Word, Zoeken, Toepassen, Downloaden) en focus. Niet in de tekstkolommen. Grijs vlak (`#f5f5f5`) voor het gekozen vers en voor de zij-kolommen.

## Opgelost
- Statuspillen zijn gewone grijze woorden; goedgekeurd is zwart met een vinkje.
- Bewerken verschijnt pas bij het vers (hover, gekozen of toetsenbordfocus) als onderstreepte tekst.
- Regels: geen chips meer; §-verwijzingen zijn kleine onderstreepte tekst.
- Versnummers zijn grijze getallen; de vraagmarkering is een grijs vraagteken.
- Actief hoofdstuk: streep en rode tekst, geen blok. Gekozen vers: grijs vlak plus rode streep.
- Tabbladen: tekst met een rode streep onder het actieve tabblad. Velden en knoppen zijn vierkant, zonder schaduw; kaartjes in Vertaalvragen zijn lijsten met een dunne lijn.
- Vervangen: doorhalen en onderstrepen in plaats van rood en geel.

## Niet gelukt met alleen CSS
- Het tabel-element blijft: de rijhoogte volgt de langste kolom (Regels), dus rijen zijn vaak hoger dan de tekst. Regels in een eigen blok onder de tekst vraagt andere markup.
- Bewerken verbergen met `opacity` is niet te vinden met aanraking; een echte weergave bij focus of hover in de markup is beter.
- De status in de zijbalk kan niet weg of korter ("review" staat 24 keer); een bolletje of weglaten bij `review` vraagt markup.
- Het Google Fonts-bestand komt van het internet; voor eigen gebruik zouden de letters lokaal moeten staan.
