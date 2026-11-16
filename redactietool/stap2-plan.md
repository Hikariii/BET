# Plan: redactietool, stap 2

Status: **concept** (2026-11-15), nog niet doorgevraagd met de eigenaar.

Dit plan bouwt voort op [`stap1-plan.md`](stap1-plan.md). Daar staan het doel, de uitgangspunten (U1 tot U8), wat de vertaler ziet en kan, het terugvoeren, de architectuur, wat buiten het plan valt en de risico's. Die gelden nog steeds, behalve waar dit plan iets anders zegt. Stap 2 bevat alleen wat in stap 1 beschreven is maar nog niet gebouwd.

De tool staat op https://hikariii.github.io/BET/ en wordt bij elke push naar `main` bijgewerkt.

## Stand na stap 1

| Onderdeel (stap 1) | Gebouwd | Nog niet gebouwd |
|---|---|---|
| **1. Lezen** | Bron, vereenvoudiging en regels per vers; kolom Regels in- en uitklappen; zijpaneel met richtlijn; markering **vraag**; status en open vragen in de zijbalk | Stip in de zijbalk bij een hoofdstuk met wijzigingen; "precedent" opent de hele tabel in plaats van de regel |
| **2. Begrippen en vragen** | Tabbladen Besloten, Gevonden en Vertaalvragen | Kleine punten in `TAKEN.md` (kolom Plaats, status "onbeslist") |
| **3. Bewerken** | Vrij typen, opmaakwaarschuwing, tussenstand in de browser, terug naar de repo per vers, label bij goedgekeurd | Verschil zichtbaar (t.o.v. bron en repo); terug per hoofdstuk; waarschuwingen voor oude vormen en vaste begrippen |
| **4. Structurele keuzes** | Tabblad Vervangen: voorbeeldvenster met vinkjes, goedgekeurd standaard uit, "met de hand" bij een opmaakgrens, opmaak behouden, terugdraaien per keuze, herkomst per vers | Markering bij aanwijzen, menu bij klikken, hint na typen, varianten, terugdraaien per vers, alleen de markering wisselen, een optie van een vertaalvraag kiezen |
| **5. Naar Word en Claude** | Kopiëren naar Word (Chrome, Edge), melding in Safari, Export voor Claude met herkomst per vers | In de export: structurele keuzes met overgeslagen plekken, beantwoorde vragen, genegeerde waarschuwingen; hint na kopiëren |

Afwijking van stap 1 die blijft: de tussenstand staat in `localStorage`, niet in IndexedDB. Een hoofdstuk is klein genoeg; zie de risico's.

## Fasen

| Fase | Inhoud | Klaar als |
|---|---|---|
| **6. Proef van de cyclus** | Een echt hoofdstuk door de hele cyclus: bewerken in de tool, Hoofdstuktekst kopiëren voor Word op Windows bij de redacteur, aanleveren, terugvoeren volgens `WERKPLAN.md` deel D met de export erbij. Geen bouwwerk; de uitkomst bepaalt de volgorde van fase 7 tot 9 | Het hoofdstuk staat ongeschonden in de repo (criterium van fase 5 uit stap 1), of we weten precies waar het misgaat. Gaat plakken op Windows mis: knop **Download als Word** komt vóór fase 8 |
| **7. Ontwerp** | Een samenhangend ontwerp voor de hele tool voordat de interactie van fase 8 tot 10 gebouwd wordt. Werkwijze in [Ontwerp](#ontwerp-fase-7) | Een gekozen richting voor lezen en bewerken, het menu bij een woord en het voorbeeldvenster; de visuele basis als CSS-variabelen op één plek; een galerijpagina in de tool met de componenten in hun lastige toestanden; de bestaande schermen gebruiken de basis |
| **8. Vragen beantwoorden** | De vervangfunctie kan ook alleen de **markering** op dezelfde woorden wisselen (bv. `eeuwigleven` → `genade`); in Vertaalvragen bij elke optie een knop die Vervangen opent, al ingevuld; varianten (vervoegingen, meervoud, met of zonder lidwoord) als aparte groep; terugdraaien per vers; in de export de structurele keuzes met overgeslagen plekken en de beantwoorde vragen | Een vraag als "Gezegend" is met één optie te beantwoorden, met overslaan per plek; de export bevat de keuze en de vraag, en Claude kan er bij het terugvoeren een precedentvoorstel van maken |
| **9. Bewerken afmaken** | Verschil zichtbaar t.o.v. de repo (wat de vertaler veranderde) en t.o.v. de bron (wat Claude veranderde); terug per hoofdstuk; waarschuwingen voor oude vormen en vaste begrippen (§15) uit één gedeelde lijst voor `controleer_hoofdstuk.py` en de tool; genegeerde waarschuwingen in de export; stip in de zijbalk; hint na kopiëren | De waarschuwingen van de tool en van `controleer_hoofdstuk.py` zijn gelijk op alle hoofdstukken (test); de vertaler ziet per vers wat hij veranderde |
| **10. Keuzes in de tekst** | Stippellijn bij aanwijzen (woorden met een precedent of met meerdere vertalingen); menu bij klikken of selecteren (gevonden vertalingen, precedent, bronvorm, "Elders ook wijzigen…"); hint na typen als de oude verwoording elders nog staat; herkomst *menu: bronvorm / precedent / gevonden* in de export | Vanuit een vers is een keuze in twee klikken voor dit ene woord of voor het hele boek te maken |

Volgorde: 6 en 7 kunnen tegelijk. 6 laat zien wat de redacteur echt mist; 7 is nodig omdat het meeste werk dat nog open staat interactie is (menu, hint, verschil, varianten) en die beter in één ontwerp past dan per fase bedacht wordt. Daarna 8, want "Gezegend" is een open vraag die nu met de hand moet. 9 en 10 daarna; 10 kan vervallen als de redacteur het tabblad Vervangen genoeg vindt.

Kleine punten (toegankelijkheid, componenttests, rooktest, woordgrenzen bij een apostrof) blijven in `TAKEN.md` en gaan mee met de fase die het bestand toch al raakt.

## Ontwerp (fase 7)

**Wie beslist:** de eigenaar; de redacteur geeft feedback.

**Uitgangspunt: functioneel, typografie boven kleur.** Geen decoratie of opvallende UI; hiërarchie en structuur komen uit lettergrootte, gewicht, witruimte en uitlijning, niet uit kleur of kaders.

**Kleur:** wit, zwart en het donkerrood van [Gebedshuis Amersfoort](https://gebedshuisamersfoort.nl/) (`#a61816`, uit hun logo), voor en door wiens mensen de vertaling gemaakt wordt. Er is verder geen huisstijl.
- Wit als achtergrond, zwart voor tekst; grijs alleen als tint van zwart voor bijzaken (versnummers, regels, randen).
- Donkerrood spaarzaam en alleen buiten de tekstkolommen: de actieve plek (gekozen hoofdstuk, tabblad, vers), de ene hoofdactie op een scherm, focus. Contrast op wit is 7,6:1, dus ook geschikt voor kleine tekst.
- Waarschuwingen en meldingen door tekst en plaats, niet door een eigen kleurenpalet.

**Vast gegeven:** de opmaak van de Bijbeltekst komt uit het Word-sjabloon van het boek, met eigen kleuren (Jezuswoorden `FF0000`, domeinen in blauw, groen, paars, oranje). Het ontwerp kiest daar niets voor en houdt het donkerrood uit de tekst, zodat het niet met de Jezuswoorden verward wordt. Doordat de rest van de tool kleurloos is, vallen de markeringen uit de bron juist op: dat is wat de vertaler moet zien.

**Typografie** is het eigenlijke ontwerpwerk: één schreefloze letter voor de tool (zoals de Helvetica van de site), een rustige, goed leesbare zetting voor de Bijbeltekst (regelbreedte, regelafstand, versnummers), duidelijk verschil tussen bron, vereenvoudiging en regels zonder kleur, en een vaste schaal van groottes en gewichten.

**Keuzes na de eerste ronde (2026-11-15):** variant a (Werkblad) is het uitgangspunt voor de layout, met de grijze naslag en elementen van c; drie nieuwe layouts (d, e, f) bouwen daarop voort. **Letters zijn een apart spoor:** alles schreefloos zoals Word, met een duidelijk verschil tussen Bijbeltekst en tool; tien combinaties in `ontwerp/letters.md`. De opmaak van de Bijbeltekst (kleuren, arcering, vet, cursief, onderstreept) blijft in elk ontwerp gelijk aan Word en wordt niet opnieuw ontworpen; `ontwerp/opmaakcontrole.mjs` controleert dat.

**Letters en kleur (2026-11-15):** Bijbeltekst in **Atkinson Hyperlegible Next** (schreefloos, in maat het dichtst bij Aptos: 5% breder; gemaakt om tekens goed te onderscheiden), in Word-zwart. Tool in **Inter** met toolkleur **`#6b4f4b`** (warm bruingrijs, verwant aan het donkerrood); alternatief antraciet `#383e42`. Afgevallen: schreefletters, smalle letters, en monospaced voor de tool (DM Mono scheidde tekst en tool duidelijker, maar leest minder als één geheel en is breder). Vastgelegd in `src/app/vormgeving.css`. Bij de definitieve keuze leveren we de letters zelf mee (geen Google Fonts in de site).

**Layout (2026-11-15):** de eigenaar kiest **e, A met lucht** (`ontwerp/variant-e.md`): de kolommen van a, geen lijnen tussen verzen, veel witruimte, grijze zijbalk en naslag zoals c, regels klein in de toolkleur. Bekend punt: een vers met veel regels wordt een hoge rij met wit onder de vereenvoudiging.

**Namen (2026-11-15):** het scherm heet **Keuzes en vragen** (knop met ondertitel "voor heel <boek>"), met de tabbladen **Vertaalkeuzes** (was Besloten; de precedenten), **Zo vertaald** (was Gevonden), **Vertaalvragen** en **Zoeken en vervangen** (was Vervangen). De kolom per vers heet **Vertaalregels**. De adressen (`#/lukas/begrippen/besloten` enz.) blijven gelijk. In dit plan staan op oudere plekken nog de oude namen.

**Open ontwerpspoor: ingangen vanuit de tekst** (eerst ontwerpen, met varianten naast elkaar):
- *Ingangen vanuit de context* (prioriteit van de eigenaar): de markering vraag bij een vers opent die vraag; "N open vragen in dit hoofdstuk" bovenaan een hoofdstuk; "precedent" in de vertaalregels opent die vertaalkeuze; de hint na typen ("staat nog 25× in Lukas 4–24, overal aanpassen?").
- *Duidelijke acties per regel*: bij een vertaalkeuze "12 plekken bekijken" en "Overal toepassen"; bij Zo vertaald met twee vertalingen "kies er één"; bij een vertaalvraag de opties als knoppen; elke actie via het voorbeeldvenster.
- *Een woord in de tekst omzetten* (zoals DeepL): A via selectie zonder vaste markering (een balkje met Zo vertaald, Vertaalkeuze, Bron, Overal aanpassen), B stippellijnen bij woorden met een keuze (als schakelaar), C rechtermuisknop of Alt+klik. Voorlopige voorkeur: A als basis, B als schakelaar. Let op: een klik in de vereenvoudiging opent nu de editor; de woordinteractie mag daar niet mee botsen.
- Open: zegt "precedent" de redacteur iets; waar komen de alternatieven vandaan (Zo vertaald, vertaalkeuzes, bronvorm).

**Opmaakwerkbalk in de vers-editor (eigenaar, 2026-11-15; hoort bij fase 9):** alleen wat `FORMAAT.md` kent, zodat alles terug kan naar Word en de repo. Geen vrije kleuren en geen losse cursief.
- **B** (`{vet}`) en **U** (`{onderstreept}`), met Ctrl+B en Ctrl+U.
- **Kleur ▾**: kies een stijl uit het sjabloon, de kleur komt mee: de begripsdomeinen (`{eeuwigleven}`, `{genade}`, `{geloof}`, `{oordeel}`, `{rechtvaardig}`, `{zonde}`, `{torah}`, `{dag}`), Onderwijs (`{onderwijs}`) en Highlight (`==`). Namen en kleuren komen uit `FORMAAT.md` en het Word-sjabloon (`boek.json`), niet uit de code.
- **Alinea ▾**: gewone tekst, Jezuswoorden (`@jezus`), Stem van God (`@god`), Engel (`@engel`), Citaat OT (`@citaat-ot`).
- **Wissen**: opmaak van de selectie halen.
- Alleen zichtbaar tijdens het bewerken van een vers; samen ontwerpen met het selectiebalkje uit het ontwerpspoor "Ingangen vanuit de tekst" (één balk voor opmaak en vertaalkeuzes). De bestaande opmaakwaarschuwing blijft.

**Ontwerpideeën ronde 3 (eigenaar, 2026-11-16; nog niet ontworpen):**
- **Hele schermbreedte gebruiken**, met de huidige verhouding van de kolommen (bron, vereenvoudigd, vertaalregels).
  - Let op: dit gaat in tegen de maximale leesbreedte van ~65 tekens (keuze 2026-11-15, `--tabel-breedte` in `vormgeving.css`). Op 1920 px wordt de vereenvoudiging dan weer ~90 tekens per regel. Te kiezen: grotere letter op brede schermen (de tekst groeit mee), een ruimere grens, of de breedte laten zoals hij is.
- **Navigatiekolom inklapbaar**, met een pijl onderaan.
  - Ingeklapt alleen een smalle strook per hoofdstuk: nummer, vinkje voor goedgekeurd en het aantal vragen (bv. `1 ✓ 3?`).
  - De drie andere kolommen worden dan naar verhouding breder.
  - De keuze onthouden (in de browser) en toegankelijk maken (`aria-expanded`, toetsenbord).
- **Bovenbalk los en sticky**: de knop Keuzes en vragen, de hoofdstuktitel en de acties (Hoofdstuktekst kopiëren voor Word, Export voor Claude) staan in een balk bovenaan die blijft staan bij scrollen en niet mee inklapt met de navigatiekolom.
- **Kolom Vertaalregels inklappen**: twijfel. Er is al een schakelaar "Vertaalregels altijd tonen" (anders onder het gekozen vers); bekijken of een ingeklapte smalle kolom met alleen labels (§7A, precedent, vraag) beter is.

**Grootte instelbaar (eigenaar, 2026-11-16; nog niet ontworpen):** de tool leest wat priegelig (nu: basis 13 px, vereenvoudiging 19 px, bron 14 px, vertaalregels 11,5 px).
- **Weergave-instelling** in de bovenbalk, bv. `A− · A · A+` of "Normaal / Groter / Grootst" (+1 en +2 pt), onthouden in de browser. Standaard blijft zoals nu; groter alleen als de vertaler dat kiest.
- **Hoe het werkt**: alles in de vormgeving is in `rem` gezet, dus één schaal op de basisgrootte vergroot de hele tool in verhouding (een zoom binnen de tool, zonder de browserzoom die ook zijbalk en marges groter maakt). Eventueel een aparte schaal alleen voor de Bijbeltekst.
- **Samen met de leesbreedte**: de maximale leesbreedte in tekens (`ch`) uitdrukken in plaats van in rem, zodat hij meegroeit met de letter. Bij een grotere letter wordt de kolom breder en gebruikt de tool meer van het scherm (sluit aan bij "hele schermbreedte" uit ronde 3), met steeds ~65 tekens per regel.
- Los daarvan overwegen of de vertaalregels (11,5 px) en de bron (14 px) standaard iets groter mogen.

**Opslag zichtbaar, back-up downloaden en inladen (eigenaar, 2026-11-16; nog niet ontworpen):** de tussenstand (bewerkte verzen) en de structurele keuzes staan in `localStorage`, maar de vertaler ziet nergens óf en wát er bewaard is.
- **Bewaarstatus** in de bovenbalk, bv. "Bewaard in deze browser · 12 verzen in 3 hoofdstukken · 14:32", met een melding als bewaren mislukt (opslag vol).
- **Overzicht van wat er bewaard is**: per hoofdstuk de bewerkte verzen (met link), de toegepaste keuzes, verouderde bewerkingen (repo veranderd); terug naar de repo per vers of per hoofdstuk.
- **Back-up downloaden**: één bestand per boek (`lukas.bet-bewaard.json`) met alle tussenstanden en keuzes, de datum en de repo-commit. Anders dan Export voor Claude: dit is om terug in te laden, niet om te laten verwerken.
- **Back-up inladen**: bestand kiezen, eerst een voorbeeld (wat komt erin, wat wordt overschreven, wat is verouderd), dan kiezen tussen samenvoegen en vervangen. Geldt als herstel en om op een andere computer verder te werken.
- Past binnen U4 (geen opslag op een server): het bestand is van de vertaler. Neemt het risico "tussenstand in de browser gewist" grotendeels weg.

**Werkwijze:**
1. **Analyse.** Schermafbeeldingen van de huidige tool en de taken van de redacteur als verloop uitgeschreven (een vers aanpassen, een vertaalvraag beantwoorden, een hoofdstuk naar Word brengen). Wat werkt, wat schuurt, welke patronen ontbreken.
2. **Richtingen met Claude Design.** Binnen de basis hierboven twee of drie typografische richtingen voor de schermen die het meest tellen: lezen en bewerken, het menu bij een woord, het voorbeeldvenster met varianten. Altijd met echte Lukas-tekst, ook uit een druk hoofdstuk. De eigenaar kiest, de redacteur reageert, daarna itereren.
3. **Galerij in de tool.** Zodra de richting vaststaat: een route (bv. `#/galerij`) met de componenten in hun lastige toestanden (leeg vers, heel lang vers, vondst over een opmaakgrens, volle opslag), met echte data. De visuele basis (typografie, kleur, ruimte, meldingen) als CSS-variabelen op één plek. Vanaf dan is de galerij de bron van waarheid, niet het ontwerpbestand. Hij staat ook op Pages, zodat de redacteur kan meekijken; schermafbeeldingen met Playwright vangen ongewenste veranderingen. Geen Storybook: een eigen route doet hier hetzelfde zonder extra gereedschap.

## Open vragen voor de eigenaar

1. Is de volgorde (6 en 7 tegelijk, dan 8, 9, 10) goed, of wil je eerst bewerken afmaken (9)?
2. Fase 6: welk hoofdstuk, en wanneer kan de redacteur het doen?
3. Fase 10: willen we die bouwen voordat de redacteur met de tool gewerkt heeft, of pas als blijkt dat het tabblad Vervangen niet genoeg is?
4. `localStorage` in plaats van IndexedDB: akkoord als blijvende keuze?

## Risico's (aanvulling op stap 1)

| Risico | Gevolg | Maatregel |
|---|---|---|
| Markering wisselen raakt opmaak die Word nodig heeft | Verkeerde stijl in Word, terugvoeren meldt verloren opmaak | Voorbeeldvenster toont de markering voor en na; heen-en-terugtest via Word op een hoofdstuk met gewisselde markering |
| Twee keuzes op hetzelfde vers | Terugdraaien in de verkeerde volgorde | Al opgevangen: een keuze blijft staan voor verzen die een latere keuze nog bezit, met melding |
| `localStorage` vol (ongeveer 5 MB per site) | Bewaren mislukt | De tool meldt een mislukte opslag per vers; bij veel bewerkte hoofdstukken alsnog IndexedDB |
| Fase 10 bouwen zonder dat de redacteur erom vraagt | Werk dat niet gebruikt wordt | Eerst fase 6; open vraag 3 |
| Ontwerp los van de echte data | Mooie schermen die breken op lange verzen, veel regels of veel vondsten | Prototypes altijd met echte Lukas-tekst, ook de drukste hoofdstukken |
