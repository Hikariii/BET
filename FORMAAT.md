# Formaat: Markdown met opmaak-tags

Het werkformaat van `boeken/<boek>/bron/` en `boeken/<boek>/vereenvoudigd/`. Eén bestand per hoofdstuk: `<prefix>-NN.md` (prefix uit `boek.json`, bv. `lukas-01.md`).

Dit is de gedeelde specificatie voor **alle** gereedschap: de Python-scripts in `scripts/` en de web-tool in `docs/`. Wie het formaat verandert, past beide aan en draait de heen-en-terugtest (zie `CLAUDE.md`).

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
