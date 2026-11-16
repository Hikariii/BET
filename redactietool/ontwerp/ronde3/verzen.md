# Verzen dicht op elkaar (ronde 3)

**Gekozen (2026-11-16): d4 is de vaste weergave. d1 tot d3, de parameter `?verzen=` en de keuzestrook zijn verwijderd; de code staat nu in `src/app/verzen/` (`VertaalregelsCel.tsx`, `verzen.css`). Hieronder staat de afweging zoals ze toen was.**

Wisselen met `?verzen=d1`, `d2` of `d3`, ook naast `?ontwerp=v1` tot `v6`. Een keuzestrook staat rechtsonder boven die van de ontwerpen; `ruim` is de huidige indeling. Schermafbeeldingen: `d1-1440-lezen.png` enzovoort, met `nu-` ter vergelijking.

**Gemeenschappelijk (alle drie).** Minder witruimte in de rijen (`verzen/dicht.css`): de gemiddelde rij in Lukas 22 gaat van 159 naar 76 px, de totale hoogte van 11.296 naar 5.390 px. De rijhoogte komt nu van bron en vereenvoudiging, niet van de vertaalregels. Bewerken, de naslagkaart onder het vers, de vraagmarkering en Escape werken in alle drie.

| Verzen per scherm (Lukas 22, v1) | nu | d1, d2, d3 |
|---|---|---|
| 1440 x 900, eerste scherm / gemiddeld | 4 / 5,0 | 10 / 10,5 |
| 1920 x 1080, eerste scherm / gemiddeld | 5 / 6,2 | 13 / 12,9 |

**d1 Overloop zweeft.** De cel is zo hoog als het vers; wat niet past vervaagt. Bij aanwijzen (na 0,18 s) of toetsenbordfocus klapt hij uit over de volgende verzen, zonder dat de tekst verschuift; "nog N regels" werkt in het vak.
- Sterk: de kolom blijft op zijn plek en de regels staan altijd naast hun vers; het kleinste ingrijpen.
- Zwak: de vervaging verbergt de verwijzingen (§, precedent) en de vraag tot je aanwijst; je ziet niet hoeveel er verborgen is, behalve aan de vervaging.

**d2 Samenvatting.** Per vers één regel: de eerste vertaalregel ingekort, met de labels §, precedent en vraag. Aanwijzen of focus opent onder het vers een breed vak in kolommen met alle regels; het vers zelf blijft leesbaar. Het vak ligt over bron en vereenvoudiging van de volgende verzen, want de vereenvoudiging staat tussen bron en vertaalregels en kan niet worden overgeslagen.
- Sterk: de rustigste pagina, en de labels geven in één blik waar een vraag of precedent zit; alle regels staan in een breed, leesbaar vak.
- Zwak: de regels lezen kost altijd een aanwijsbeweging; het vak dekt het volgende vers af. "Nog N regels" is hier niet nodig (het vak toont alles).

**d3 Kanttekeningen.** De regels staan als notities in de rechtermarge, uitgelijnd met hun vers; loopt er een door, dan schuiven de volgende omlaag (`plaatsNotities`, getest) en krijgen ze het versnummer ervoor. Een notitie toont één regel plus "nog N regels", en mag bij schermen vanaf 1400 px verder doorlopen dan de tabel.
- Sterk: niets zweeft of verbergt zich; alles blijft zichtbaar en klikbaar naast het vers.
- Zwak: de lange logregels maken de notities hoger dan de verzen. Met de eerste opzet (regel en knop onder elkaar, in een smallere marge) liep de verschuiving in Lukas 22 op tot 1060 px; nu is het hoogstens 86 px. Een uitgeklapte notitie duwt de volgende omlaag. Vraagt JS (metingen).

**Gemeten.** Opmaakcontrole (`opmaakcontrole.mjs` met `?ontwerp=v1&verzen=dN`): 0 afwijkingen op Lukas 1, 4 en 22 bij alle drie; de vakken en notities zitten in `td.regels`, dat de controle uitsluit omdat het geen Bijbeltekst is. 0 consolefouten. Geen overlap van notities bij 1100, 1280, 1440 en 1700 px, bij bewerken en bij uitklappen.

**d4 Overloop, vast bij naslag** (op verzoek van de eigenaar, na d1). Zoals d1, maar zodra je een verwijzing (§ of precedent) aanklikt en de naslagkaart onder het vers opent, staat de cel Vertaalregels van dat vers vast in de kolom met alle regels; de rij groeit mee (Lukas 22:11: van 68 naar 321 px). Sluit de kaart (knop of Escape), dan is de cel weer het zwevende vak van d1 en staat de focus terug op de verwijzing. Bouwt voort op d1 (`cssVanDichtheid`, `tabelklassenVanDichtheid`); opmaakcontrole 0 afwijkingen in alle varianten.
