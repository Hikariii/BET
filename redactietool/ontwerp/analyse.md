# Ontwerp, stap 1: analyse van de huidige tool

**Afgerond 2026-11-15.** Gekozen: layout e met Atkinson Hyperlegible Next (tekst) en Inter in `#6b4f4b` (tool); nu de opmaak van de tool in `src/app/vormgeving.css`. De proef-CSS van de varianten a tot f en de keuzestrook zijn daarna uit de code gehaald; ze staan in commit `33dc464`. De schermafbeeldingen en toelichtingen hier blijven als geschiedenis. `opmaakcontrole.mjs` controleert nu de echte tool: elke kleur in de Bijbeltekst komt uit het Word-sjabloon, de rest is zwart.

Stand 2026-11-15, schermafbeeldingen in `schermen/*-huidig.png` (1440 × 900, Chrome). Ontwerpbasis: `../stap2-plan.md`, fase 7.

## Wat werkt

- De indeling klopt met het werk: zijbalk met hoofdstukken, per vers bron, vereenvoudiging en regels naast elkaar, naslag in een zijpaneel. Niets hoeft verplaatst te worden om het werk te doen.
- De opmaak uit Word komt goed door: Jezuswoorden rood, domeinen in hun kleur, vet en cursief zoals in het sjabloon (`1-lezen`, `4-naslag`).
- Adressen per vers en per tabblad werken; links naar verzen staan overal.

## Wat schuurt

1. **Geen hiërarchie tussen bron en vereenvoudiging.** Zelfde letter, grootte en kleur. De vereenvoudiging is het werkstuk, de bron is referentie; dat zie je niet.
2. **Kolom Regels is het drukst van het scherm.** Lange zinnen met aanhalingstekens, pijlen en omlijnde blauwe §-chips per regel. Hij trekt meer aandacht dan de tekst.
3. **Herhaalde knoppen.** Op elk vers een grijze knop Bewerken; in de zijbalk op elk hoofdstuk een omlijnde pil met de status.
4. **Kleur zonder betekenis.** Blauw voor links, het actieve hoofdstuk, chips en focus; geel voor het gekozen vers; rood-roze voor "open" en voor doorgehaalde tekst in Vervangen. Rood botst met de Jezuswoorden (`#FF0000`) in de tekst.
5. **Browserstandaard.** Knoppen, keuzelijsten, tabbladen en invoervelden zijn ongestyled; de koppen zijn standaard vet.
6. **Vertaalvragen als omlijnde kaarten** met een vette kop van drie regels (`6-vragen`): veel kader, weinig rust.
7. **Naslag-paneel** is een volle tabel met even zware kolommen (`4-naslag`); de regel die je zoekt valt niet op.

## Wat CSS niet oplost (voor stap 2 en 3)

- **Vervangen knipt de context midden in een woord** ("n jullie naam", "te ve" in `7-vervangen`). De context moet op woordgrenzen beginnen en eindigen, met "…".
- Bewerken via de tekst zelf (klik in het vers) in plaats van een knop per vers vraagt andere markup.
- De status per hoofdstuk en het aantal vragen als tekst in plaats van pillen vraagt een kleine aanpassing in `Zijbalk.tsx`.
- De regels per vers zouden rustiger zijn als de verwijzing (§7A, precedent) achter de regel staat als gewone tekstlink, niet als knop.

## Taken van de vertaler (om ontwerpen aan te toetsen)

1. **Een vers aanpassen:** hoofdstuk openen, vers lezen naast de bron, regels nalezen, typen, zien dat het bewaard is.
2. **Een vertaalvraag beantwoorden:** vraag vinden (Vertaalvragen of markering bij het vers), de verzen bekijken, een optie kiezen, plekken nalopen in het voorbeeldvenster, toepassen.
3. **Een hoofdstuk naar Word brengen:** zien wat bewerkt is, kopiëren, plakken in Word; eventueel de export voor Claude.

## Varianten

**Vaste eis voor elke variant:** de Bijbeltekst (bron en vereenvoudiging, ook in de vers-editor) heeft dezelfde opmaak als in de Word-bestanden: tekst in Word-zwart, kleuren, arcering, vet, cursief en onderstreept uit het sjabloon. Dat wordt niet opnieuw ontworpen; alleen de letter en de grootte mogen verschillen. `opmaakcontrole.mjs` vergelijkt per stukje tekst de berekende opmaak met Word (Lukas 1, 4 en 22 en de vers-editor): 0 verschillen in a, b en c. Kopiëren naar Word staat los van de opmaak op het scherm en verandert niet.

Drie typografische richtingen binnen dezelfde basis (wit, zwart, donkerrood `#a61816`; Bijbeltekst in een andere letter dan de tool). Elke variant is alleen CSS bovenop de bestaande tool, met een toelichting:

- **a, Werkblad** (`variant-a.md`): compact, schreefletter voor de tekst, grotesk voor de tool.
- **b, Dicht bij Word** (`variant-b.md`): schreefloze tekstletter die op Aptos lijkt, tool in een smalle of monospaced letter.
- **c, Leesboek** (`variant-c.md`): ruim, een leesletter voor lang lezen, de tool treedt terug.

Bekijken: `npm run dev` in `redactietool/` en dan `?ontwerp=a`, `b` of `c` in het adres, of de keuzestrook rechtsonder. Vergelijken per scherm: `vergelijk.md`.
