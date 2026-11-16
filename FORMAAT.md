# Formaat: Markdown met opmaak-tags

Het werkformaat van `bijbel/<boek>/bron/` en `bijbel/<boek>/vereenvoudigd/`. Eén bestand per hoofdstuk: `<prefix>-NN.md` (prefix uit `boek.json`, bv. `lukas-01.md`).

Dit is de gedeelde specificatie voor **alle** gereedschap: de Python-scripts in `scripts/` en de web-tool in `redactietool/`. Wie het formaat verandert, past beide aan en draait de heen-en-terugtest (zie `CLAUDE.md`).

De betekenis zit deels in de Word-opmaak. Die wordt als tags in de tekst bewaard, zodat hij de vereenvoudiging overleeft en terug naar Word kan.

- **Eén alinea per regel**, lege regel = witregel/sectiescheiding zoals in het origineel.
- **Versnummers**: `[5]` vóór het vers. Een vers mag over meerdere alinea's lopen.
- **Hoofdstuk**: eerste regel `# <Naam> N`, met de naam uit `boek.json` (bv. `# Lukas 3`).
- **Alineastijlen** als voorvoegsel aan het begin van de regel:

  | Tag | Word-stijl | Betekenis |
  |---|---|---|
  | `@jezus` | `Jezuswoorden` | woorden van Jezus |
  | `@god` | `GodsStem` | stem van God |
  | `@engel` | `engelenwoord` | woorden van een engel |
  | `@citaat-ot` | `citaatOT` | citaat uit het Oude Testament |

- **Begripsdomeinen** (tekenstijlen, §13) als `{domein}…{/domein}`:
  `{eeuwigleven}`, `{genade}`, `{geloof}`, `{oordeel}`, `{rechtvaardig}`, `{zonde}`, `{torah}`, `{dag}`
- **Onderwijscluster** (rode tekst, §13A): `{onderwijs}…{/onderwijs}`
- **Highlights** (geel gemarkeerd): `==…==`
- **Directe Word-opmaak zonder stijl** (komt in bron en 0.9 voor, geen eigen stijl): `{vet}…{/vet}` (o.a. "Christus", "Messias", "de Christus"), `{onderstreept}…{/onderstreept}` (o.a. "het Evangelie", "het Goede Nieuws"; vet+onderstreept = beide tags genest) en `{cursief}…{/cursief}` (alleen cursief binnen een niet-cursieve alinea, bv. "(leerling)"). Vet/cursief die al uit de alineastijl of tekenstijl volgt, krijgt geen tag.
- **Tags en versnummers**: een versnummer staat altijd buiten tags; loopt een opmaakreeks over een vers heen, dan wordt hij voor `[n]` gesloten en erna opnieuw geopend. Tags zijn netjes genest (volgorde buiten→binnen: onderwijs, highlight, onderstreept, vet, cursief, domein). Witruimte aan de rand van een reeks staat buiten de tag. Een tag begint of eindigt alleen midden in een woord als de bron dat echt zo heeft (bv. 0.9, Lukas 1:69 "r{eeuwigleven}edding{/eeuwigleven}").
- **Lege regels**: een lege Word-alinea is één lege regel; een lege alinea gevolgd door een lege alinea met rand erboven (sectiescheiding in het origineel) geeft dus twee lege regels. Meer dan twee wordt twee. Lege alinea's krijgen nooit een alineastijl-voorvoegsel. Een regeleinde binnen een alinea (Lukas 11:2) wordt een spatie; paginaeinden vervallen.
- Spaties: alle witruimte (ook niet-brekende spatie) wordt één gewone spatie; voor en na `[n]` staat altijd een spatie.

## Voorbeeld

```
[12] En toen Zacharias hem zag, raakte hij in verwarring en vrees overviel hem. [13] Maar de engel zei tegen hem:
@engel “Wees niet bevreesd, Zacharias, want je gebed is verhoord …”
```

## Hoofdregel

Een tag die in de bron in een vers staat, moet in de vereenvoudiging in hetzelfde vers terugkomen (de inhoud ertussen mag wel veranderen).

## Wijzigingslog

Het bestand `bijbel/<boek>/wijzigingslog/<prefix>-NN.md` is geen Markdown met opmaak-tags, maar het wordt wel door twee programma's gelezen: `parse_log` in `scripts/md_naar_docx.py` (voor het reviewdocument) en `redactietool/src/log/leesLog.ts` (voor de tool). Een pariteitstest bewaakt dat beide hetzelfde lezen. Het sjabloon staat in `sjablonen/wijzigingslog.md`. De bevindingen van de onafhankelijke controle staan in `<prefix>-NN-controle.md`; dat bestand wordt niet gelezen.

**Volgorde van de kopjes** (zoals in de echte logs):
1. `# Wijzigingslog <Naam> N`, met daaronder een korte inleiding.
2. `## Vragen aan redactie`: de algemene vragen van het hoofdstuk.
3. `## Aandachtspunten (stap 1)`: de aandachtspuntenlijst uit WERKPLAN stap 1. Deze kop is voor de lezers gewoon een andere kop: wat eronder staat, wordt niet gelezen.
4. Per gewijzigd vers `## Vers N` of, voor een reeks, `## Vers N-M`.

**Wat de lezers afdwingen:**
- Het kopje voor de algemene vragen is een regel die met `##`, een spatie en het woord `Vragen` begint (hoofdletters maken niet uit). Elk item is een genummerde regel (`1. `) of een lijstregel (`- ` of `* `). Een ingesprongen regel (spatie of tab) hoort bij het vorige item. De lijst eindigt bij de volgende regel die met `#` begint.
- Een versdeel begint met `## Vers N`, of `## Vers N-M` voor een reeks (tussen N en M een koppelteken, gedachtestreep of aandachtsstreep), met eventueel een dubbele punt erachter, en niets anders op die regel. Elke andere kop sluit het deel af; een deel zonder juiste kop wordt niet gelezen. Bij een reeks krijgt het eerste vers de inhoud en de andere verzen een verwijzing "zie bij vers N". Een omgekeerde reeks (`## Vers 5-3`) bevat geen verzen en wordt overgeslagen.
- In een versdeel is een veld een lijstregel met een vetgedrukte naam: `- **Wijzigingen:** …`. Een naam die met `wijziging` begint, bevat de wijzigingen; een naam die met `twijfel` begint of het woord `vraag` bevat (bijvoorbeeld `Twijfel / vraag aan redactie`), bevat de vragen bij dit vers. Andere velden (`Bron`, `Nieuw`) worden niet gebruikt. Een veld mag zijn tekst op dezelfde regel hebben, of daaronder als ingesprongen lijstregels. Een niet-lege regel zonder lijstteken hoort bij het vorige item.
- Een vraag die alleen `(optioneel)`, `geen`, `nee`, `n.v.t.`, `-` of een aandachtsstreep is, telt niet als vraag.
- Wijzigingen verwijzen met `§7A` (de paragraaf van de richtlijn) of met het woord `precedent` naar hun grond; de tool maakt daar links van.
- De status van een vraag (open, voorlopig besloten) staat niet in een eigen veld. De tool leidt hem af uit een statuswoord in de tekst (bijvoorbeeld `VOORLOPIG BESLOTEN DOOR HOOFDSESSIE` of `Nog open`); `referentie/open-vragen.md` is de bron voor de status zelf.
