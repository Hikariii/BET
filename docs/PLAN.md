# Plan: redactietool (web)

Status: **concept**. Brainstorm en besluiten van 2026-11-15. Er is nog niets gebouwd.

## Doel

Een webtool waarin een editor de vereenvoudigde tekst naast de bron leest en redigeert, ongeveer zoals DeepL of Google Translate: links de bron, rechts de vereenvoudiging, klikken op tekst geeft alternatieven, en de editor kan ook zelf typen. Zijn keuzes worden opgeslagen en daarna door Claude verwerkt in het boek (WERKPLAN stap 6).

## Besluiten

De onderbouwing per besluit, met de afgewezen alternatieven, staat onderaan in **Overwegingen** (O1–O9). De risico's staan in **Risico's**.

| # | Besluit | Gevolg |
|---|---|---|
| B1 | **Alleen frontend**, gepubliceerd via GitHub Pages | Geen eigen server; opslag via een dienst die vanuit de browser bereikbaar is |
| B2 | **De editor heeft geen GitHub-account, wel Google** → opslag in **Google Drive** | Inloggen met Google in de browser (Google Identity Services); geen geheime sleutels in de tool of bij de editor |
| B3 | **Word blijft ernaast**: eindproduct en ook een reviewformaat | De tool vervangt `scripts/md_naar_docx.py` niet; Word-export blijft in Python |
| B4 | **Redactiekeuzes worden apart opgeslagen**; de tool past `vereenvoudigd/` niet zelf aan | Claude verwerkt de keuzes in md, wijzigingslog en precedenten, en draait de controles |
| B5 | **Zelf typen mag overal**, ook in woorden met een domeintag | De tool waarschuwt maar blokkeert niet; zelf getypte tekst krijgt het label *eigen tekst* |
| B6 | Repo `BET` is publiek, dus de site is publiek | Iedereen kan de teksten lezen, niet schrijven. De redactiekeuzes staan in de Drive van de editor, niet op de site |

## Gebruikerservaring

```
┌─ Lukas 4 ──────────────── filter: [alles ▾] [alleen vragen] [niet beoordeeld] ─┐
│ BRON (alleen lezen)               │ VEREENVOUDIGD (te bewerken)          │ ✓  │
├───────────────────────────────────┼──────────────────────────────────────┼────┤
│ 18 De Geest des Heeren is op Mij, │ 18 De Geest van de Heer is op Mij,   │ ○  │
│                                   │         ┌──────────────────────────┐ │    │
│                                   │         │ van de Heer   ● huidig   │ │    │
│                                   │         │ des Heeren    bron       │ │    │
│                                   │         │ §11 Heere → Heer (log)   │ │    │
│                                   │         │ ☐ overal in Lukas 4 (3×) │ │    │
│                                   │         └──────────────────────────┘ │    │
└───────────────────────────────────┴──────────────────────────────────────┴────┘
```

- **Rijen per vers:** bron en vereenvoudiging staan altijd naast elkaar. Binnen een rij werkt het zoals in DeepL.
- **Opmaak zoals in Word:** stijlen en kleuren komen uit het Word-sjabloon van het boek (`styles.xml`), niet zelf verzonnen.
- **Hover koppelt:** de muis op een stuk tekst rechts laat het bijbehorende stuk links oplichten, en andersom. De koppeling komt uit een woordvergelijking tussen bron en vereenvoudiging.
- **Klikken op gewijzigde tekst** opent een keuzemenu met alternatieven, elk met het label waar het vandaan komt (zie onder), plus "terug naar bron" en "overal toepassen".
- **Zelf typen** kan overal. Getypte tekst binnen een tag neemt de opmaak van die tag over. Een knop "opmaak tonen" maakt de tagranden zichtbaar.
- **Waarschuwingen per vers**, zonder te blokkeren:
  - een tag uit de bron ontbreekt;
  - een oude vorm (richtlijn of `controle.json`);
  - een vast begrip uit §15 is verdwenen.

  Dit zijn dezelfde regels als in `scripts/controleer_hoofdstuk.py`.
- **Status per vers:** akkoord, aangepast of vraag, met een opmerkingveld. Met één toets geef je akkoord en ga je naar het volgende vers dat nog niet beoordeeld is.
- **Filters:** alleen vragen, niet beoordeeld, met waarschuwing.
- Ongedaan maken en "terug naar bron" werken altijd.

### Herkomst van de alternatieven

| Herkomst | Beschikbaar |
|---|---|
| De bron zelf (per stuk tekst) | ja, uit de woordvergelijking |
| Wijzigingslog ("X → Y — §n") | ja |
| Open vragen (kolommen *gekozen* en *alternatief*) | ja |
| Elders in het boek (hoe hetzelfde bronwoord daar is vereenvoudigd) | ja, uit de vergelijking over alle hoofdstukken |
| Precedenten / begrippenlijst | deels; moet machineleesbaar worden |
| Voorstellen van Claude, 1–3 per gewijzigd stuk tekst (`bijbel/<boek>/suggesties/<prefix>-NN.json`) | nieuw; zie open vraag V1 |

"Overal toepassen" bij een begrip levert een **voorgesteld precedent** op.

## Architectuur

```
docs/                      broncode van de tool (Vite + TypeScript)
  src/formaat/             parser en serializer volgens FORMAAT.md
  src/editor/              ProseMirror-schema: domeinen, onderwijs, highlight, vet,
                           onderstreept en cursief als marks; alineastijl als eigenschap;
                           versnummer als vast element dat je niet kunt bewerken
  src/uitlijning/          woordvergelijking bron ↔ vereenvoudigd, hover-koppeling
  src/controles/           regels uit controleer_hoofdstuk.py (+ controle.json)
  src/alternatieven/       verzamelt opties uit log, open vragen, boek, suggesties
  src/opslag/              vaste set opslagmogelijkheden: lokaal (IndexedDB) · bestand · Google Drive
.github/workflows/pages.yml
                           bouwt de tool en zet de boeken om naar JSON
                           (bron, vereenvoudigd, logs, open vragen, boek.json, stijlen uit het sjabloon)
```

- **Publicatie:** GitHub Pages via Actions (niet "deploy from /docs"). Teksten worden bij het bouwen omgezet naar JSON, dus er staan geen kopieën in git. Na elke push naar `main` staat de site vanzelf bij.
- **Eén formaat:** `FORMAAT.md` is de specificatie. Een test in de workflow controleert dat de JS-parser en `scripts/` op alle bronhoofdstukken hetzelfde opleveren, en dat md → editor → md exact gelijk blijft.

## Opslag: Google Drive

- **Inloggen:** Google Identity Services ("Inloggen met Google") rechtstreeks in de browser. Het kenmerk van de app (client-ID) is openbaar en staat in de code; er is geen geheime sleutel.
- **Rechten:** alleen `drive.file`. De tool ziet uitsluitend bestanden die hij zelf heeft gemaakt, niet de rest van de Drive van de editor.
- **Bestanden:** een map `BET-redactie` in de Drive van de editor, één bestand per hoofdstuk: `lukas-04.redactie.json`.
- **Altijd eerst lokaal:** elke wijziging gaat eerst naar IndexedDB en wordt daarna naar Drive gestuurd. Zonder internet wordt het later ingehaald.
- **Terugval:** "Download mijn keuzes" en "Bestand openen" werken altijd, ook zonder Google.
- **Botsingen:** vóór het schrijven controleert de tool of het bestand op Drive intussen veranderd is (bv. door een tweede apparaat). Zo ja, dan vraagt hij wat te doen.
- **Delen:** de editor deelt de map eenmalig met het Google-account dat Claude gebruikt, zodat Claude de keuzes kan lezen.

### Eenmalige opzet (Sebastiaan, ongeveer 30–45 minuten)
1. Google Cloud-project aanmaken en de Drive API aanzetten.
2. OAuth-inlogscherm in testmodus, met de editor als testgebruiker. In testmodus is geen beoordeling door Google nodig.
3. OAuth-client van het type "webapplicatie", met als toegestaan adres de Pages-site en `localhost` voor ontwikkeling.
4. De client-ID in de tool zetten.

## Redactiekeuzes: datamodel (eerste opzet)

```json
{
  "boek": "lukas",
  "hoofdstuk": 4,
  "editor": "naam",
  "gebaseerd_op": "<git-commit van vereenvoudigd/lukas-04.md waarop is gewerkt>",
  "verzen": {
    "18": {
      "status": "aangepast",
      "tekst": "[18] De Geest van de Heer is op Mij, …",
      "handelingen": [
        {"van": "des Heeren", "naar": "van de Heer", "herkomst": "log §11", "tijd": "2026-11-20T10:12:00Z"},
        {"van": "…", "naar": "…", "herkomst": "eigen tekst", "tijd": "…"}
      ],
      "opmerking": "",
      "precedent": false
    }
  },
  "vragen": {"4:18–19": {"antwoord": "…"}}
}
```

- `tekst` is het hele vers in het formaat van `FORMAAT.md`, dus inclusief tags.
- `gebaseerd_op` laat Claude zien of de vereenvoudiging intussen veranderd is.

## Verwerking (Claude, WERKPLAN stap 6)

1. Het `.redactie.json`-bestand uit Drive lezen.
2. Het bestand kopiëren naar `bijbel/<boek>/redactie/`. Zo staan de keuzes van de editor in git, met geschiedenis.
3. Per vers verwerken:
   - **akkoord:** niets te doen;
   - **aangepast:** tekst overnemen, log bijwerken; voor *eigen tekst* eerst langs de richtlijn;
   - **vraag:** naar open vragen;
   - **precedent:** naar `precedenten.md`, en waar nodig `controle.json`.
4. Controles draaien. Bij twijfel een vraag terug aan de editor, die in de tool verschijnt.
5. Na een push naar `main` ziet de editor de bijgewerkte tekst.

Later is hier een skill of script voor te maken, zodat dit één opdracht is.

## Fasen

| Fase | Inhoud | Klaar als |
|---|---|---|
| 1. Alleen lezen | Workflow en Pages, JSON uit de boeken, JS-parser, rijen per vers met opmaak uit het sjabloon, hover-koppeling | Lukas 1–24 leesbaar op Pages; pariteitstest met Python slaagt |
| 2. Editor | ProseMirror, zelf typen, waarschuwingen, status per vers, opmerkingen; opslag lokaal + downloaden/openen | md → editor → md exact gelijk voor alle bronhoofdstukken; editor kan een hoofdstuk afmaken en downloaden |
| 3. Alternatieven | Keuzemenu uit bron, log, open vragen en elders in het boek; overal toepassen | — |
| 4. Google Drive | Inloggen, opslaan en laden, botsingscontrole, offline inhalen | Editor werkt een week zonder downloaden |
| 5. Verwerking | Skill of script voor stap 6; `redactie/` in git | Eén hoofdstuk heen en terug verwerkt |
| 6. Suggesties | `suggesties/*.json` van Claude in het keuzemenu | zie V1 |

## Overwegingen

Per onderwerp: welke opties zijn bekeken, wat is gekozen en waarom. Bedoeld voor review. Een besluit kan heroverwogen worden als de aannames niet kloppen.

### O1. Opslag zonder eigen server (→ B1, B2)

Uitgangspunten: de tool draait alleen in de browser (GitHub Pages) en de editor heeft geen GitHub-account, wel Google.

| Optie | Hoe | Voor | Tegen | Oordeel |
|---|---|---|---|---|
| **GitHub API met het token van de editor** | De editor maakt zelf een token aan | Opslaan = commit, alles in git | Vereist een GitHub-account | afgevallen (geen account) |
| **"Inloggen met GitHub" (OAuth)** | Gewone inlogknop | Prettig | Het omwisselen van de inlogcode vraagt een geheime sleutel, dus een server; ook "device flow" werkt niet rechtstreeks vanuit de browser (CORS) | afgevallen (strijdig met B1) |
| **Opslagrepo + token van Sebastiaan** | Aparte (privé) repo `BET-redactie`; fine-grained token alleen voor die repo; de editor krijgt eenmalig een link met de sleutel na `#` | Opslaan is één klik; keuzes direct in git met geschiedenis; verwerken = `git pull`; opzet ~5 min | Jouw sleutel staat in de browser van de editor; na de vervaldatum moet er een nieuwe link komen; commits op naam van Sebastiaan | **tweede keus**: goed alternatief als de Google-opzet tegenvalt |
| **Google Drive** | "Inloggen met Google" in de browser, scope `drive.file` | Vertrouwde inlog voor de editor; geen geheim van Sebastiaan in omloop; niets dat bij de editor verloopt; Claude kan Drive lezen via de bestaande Google-koppeling | Opzet in de Google Cloud Console (~30–45 min); geschiedenis beperkter dan git (vandaar de kopie naar `redactie/` bij verwerking); af en toe opnieuw inloggen | **gekozen** |
| **Opslagdienst (Supabase/Firebase)** | Inloggen via een e-mailcode | Prettig; schaalt naar meerdere editors | Extra dienst met eigen account en beheer; gegevens buiten git en buiten de eigen omgeving | afgevallen (te veel extra voor één editor) |
| **Lokale map (File System Access API)** | De tool schrijft in een lokale git-clone | Geen token | Alleen Chrome/Edge; de editor heeft geen clone | afgevallen |
| **Downloaden en mailen** | Knop "Download mijn keuzes" | Geen accounts of sleutels; werkt altijd | Handmatige stap | **behouden als terugval** |

Bij de opslagrepo kwam de vraag op: *kan de hele wereld dan naar de repo schrijven?* Nee:
- alleen wie de sleutel heeft, kan schrijven;
- de sleutel staat niet in de code van de site;
- de sleutel werkt alleen voor de opslagrepo, niet voor `BET`.

Het risico is dat de link wordt doorgestuurd, of dat iemand bij de browser van de editor kan. Dan kunnen alleen redactiekeuzes worden overschreven, en die zijn terug te halen uit git. Dit argument speelt bij Drive niet, omdat daar geen gedeelde sleutel is.

Gevolg voor de bouw: opslag is een los onderdeel met een vaste set mogelijkheden. Overstappen naar de opslagrepo blijft goedkoop.

### O2. Wie past de tekst aan: tool of Claude? (→ B4)

| Variant | Voor | Tegen |
|---|---|---|
| **1. De tool schrijft direct in `vereenvoudigd/*.md`** | Eenvoudig; de editor ziet direct het eindresultaat | Het wijzigingslog loopt achter; de controles en de onafhankelijke review worden omzeild; niet meer te zien wat Claude voorstelde en wat de editor veranderde; botsingen met Claude-sessies die in dezelfde bestanden werken |
| **2. Keuzes apart; Claude verwerkt** (gekozen) | Past in WERKPLAN stap 6; de keuzes van de editor blijven apart zichtbaar; geen botsingen; *eigen tekst* gaat nog langs de richtlijn | Vertraging tussen keuze en zichtbare tekst in het boek; een verwerkstap nodig (fase 5) |

Ook bij variant 2 ziet de editor in de tool zijn eigen tekst. De vertraging zit alleen tussen opslaan en het bijwerken van het boek in git.

### O3. Word vervangen of ernaast? (→ B3)

- **Ernaast (gekozen):**
  - Word is het eindproduct;
  - de redactie leest Word (CLAUDE.md);
  - de export bestaat al en is getest (heen-en-terug byte-gelijk).
- **Vervangen** zou betekenen dat de opmaak in de browser precies gelijk moet zijn aan Word, en dat er een tweede exportroute komt. Daar is nu geen reden voor.
- **Gevolg:** de opmaak in de tool moet herkenbaar zijn (kleuren en stijlen uit het sjabloon), maar hoeft niet pixel-gelijk aan Word te zijn.

### O4. Zelf typen vrij of beperkt? (→ B5)

| Optie | Voor | Tegen |
|---|---|---|
| **Vrij typen, met waarschuwingen** (gekozen) | Prettig en snel; de editor is de deskundige | Fouten in kernbegrippen of tags zijn mogelijk |
| Kernbegrippen (woorden met een domeintag) alleen via het keuzemenu | Veiliger | Frustrerend als het goede alternatief er niet tussen staat |

Wat de risico's van vrij typen beperkt:
- waarschuwingen per vers, met dezelfde regels als het controlescript;
- het label *eigen tekst*, waardoor Claude die tekst nog langs de richtlijn haalt;
- ongedaan maken en "terug naar bron".

### O5. Alternatieven: vooraf klaarzetten of live laten maken?

- **DeepL** rekent alternatieven live uit met een taalmodel. Dat vraagt een server, of een API-sleutel van een taalmodel in de browser (kosten, en een geheim bij de editor).
- **Gekozen: vooraf klaarzetten** uit bronnen die er al zijn: bron, log, open vragen en elders in het boek. Later komen daar suggesties van Claude bij (`suggesties/*.json`), gemaakt tijdens het vertalen. Elk alternatief heeft een herkomst en een reden, wat bij dit project (richtlijn §1, §25) beter past dan een vrij voorstel van een taalmodel.
- **Live via een taalmodel** kan later een optionele knop worden. Het is niet nodig voor de kern.

### O6. Hoe de editor zelf werkt: tekstvak of rich-text-editor?

- **Tekstvak met de tags zichtbaar en een voorbeeld eronder:** eenvoudig te bouwen, maar voor een editor zonder technische kennis niet prettig, en het past niet bij het DeepL-gevoel.
- **WYSIWYG met `contenteditable` zelf gebouwd:** gevoelig voor fouten met geneste opmaak.
- **ProseMirror of Tiptap (gekozen):**
  - de tags worden *marks*, en het nesten regelt ProseMirror zelf;
  - de alineastijl wordt een eigenschap van de alinea;
  - versnummers worden een vast element dat je niet kunt bewerken.

  Het formaat uit `FORMAAT.md` past hier goed op. Voorwaarde is dat md → editor → md voor alle bronhoofdstukken exact gelijk blijft; dat is een harde test.

### O7. Publiceren: "deploy from /docs" of GitHub Actions?

- **Deploy from /docs:** alleen `docs/` wordt gepubliceerd. De teksten zouden dan naar `docs/` gekopieerd en meegecommit moeten worden, en dubbele kopieën lopen uit elkaar.
- **Actions (gekozen):** de workflow bouwt de tool en zet de boeken bij het bouwen om naar JSON. Er staan geen kopieën in git, de site is altijd gelijk aan `main`, en de pariteitstest draait in dezelfde workflow.

### O8. Publieke repo en publieke site (→ B6)

- **De situatie:** de repo `BET` is publiek, dus de site ook. Iedereen kan het werk in uitvoering lezen. Dat is al zo via de repo.
- **De keuzes van de editor** staan in diens Drive en komen pas bij verwerking in de (publieke) repo terecht. De opmerkingen van de editor worden daarmee ook publiek. *Te bevestigen bij review.*
- **Alternatief:** een privé-repo. Pages vraagt dan een betaald GitHub-abonnement, of hosting elders (bv. Cloudflare Pages of Netlify, beide ook alleen-frontend).

### O9. Hoe de editor het boek ziet: per vers of doorlopend?

- **Doorlopend, zoals DeepL (twee lange tekstvakken):** leest prettig, maar verzen raken uit lijn als de lengte verschilt.
- **Rijen per vers (gekozen):** bron en vereenvoudiging staan altijd naast elkaar. Dat is ook hoe de Word-review werkt, en terugvoeren naar de bron is zo eenvoudig. Binnen een rij werkt het zoals in DeepL.

## Risico's

| Risico | Gevolg | Maatregel |
|---|---|---|
| JS-parser wijkt af van Python | Tekst of tags gaan verloren bij het verwerken | Pariteitstest in de workflow; `FORMAAT.md` als enige specificatie |
| md → editor → md niet gelijk | Ongemerkte wijzigingen in verzen die niet aangeraakt zijn | Heen-en-terugtest op alle bronhoofdstukken; alleen verzen met een handeling worden opgeslagen |
| Google-opzet in testmodus | De editor moet als testgebruiker zijn toegevoegd; af en toe opnieuw inloggen | Vastgelegd in de opzetstappen; downloaden blijft als terugval |
| Werk kwijt (browser gewist, geen internet) | De editor verliest keuzes | Eerst lokaal (IndexedDB), daarna Drive; downloadknop |
| Vereenvoudiging verandert terwijl de editor werkt | Keuzes passen niet meer op de tekst | `gebaseerd_op` in het redactiebestand; Claude meldt verschillen bij verwerking |
| Eigen tekst wijkt af van de richtlijn | Ongemerkte afwijking in het boek | Label *eigen tekst*; Claude toetst bij verwerking; waarschuwingen in de tool |
| Omvang van het project | Lang bezig voordat er iets bruikbaars is | Fasen; fase 2 is al bruikbaar met downloaden, zonder Drive |

## Open vragen

- **V1.** Moet Claude voor Lukas 4–24 nu al alternatieven per wijziging maken (`suggesties/`)? Voorstel: pas na fase 3, als duidelijk is hoe het keuzemenu gebruikt wordt. Voor nieuwe hoofdstukken neemt de vertaal-agent het dan direct mee.
- **V2.** Werkt de editor op een laptop/desktop (Chrome, Edge, Safari)? Tablet maakt de editor moeilijker.
- **V3.** Ziet de editor de wijzigingslog-kolom, of alleen bron en vereenvoudiging met het keuzemenu?
- **V4.** Wordt de taal van de tool Nederlands? Aanname: ja.
- **V5.** Is het goed dat de opmerkingen van de editor publiek worden zodra ze verwerkt in de repo staan (O8)? Zo niet: opmerkingen niet meekopiëren naar `redactie/`, of een privé-repo.
