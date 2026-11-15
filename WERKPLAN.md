# Werkplan: een hoofdstuk omzetten

Dit plan beschrijft hoe één hoofdstuk van de brontekst naar een goedgekeurde vereenvoudigde versie gaat.
Inhoudelijke regels: de redactierichtlijn. Mappen: `README.md`. Tags: `FORMAAT.md`.

**Paden.** Het plan geldt voor elk boek. Paden als `bron/`, `vereenvoudigd/`, `wijzigingslog/`, `referentie/`, `export/` en `STATUS.md` zijn relatief aan de boekmap `boeken/<boek>/`. `richtlijn/`, `sjablonen/` en `scripts/` staan in de hoofdmap. De voorbeelden gebruiken Lukas (`boeken/lukas/`, prefix `lukas`).

Rollen:
- **Claude** maakt het concept, het wijzigingslog en voert de controles uit.
- **Redactie** beslist: beoordeelt in Word, beantwoordt vragen, keurt goed.

---

## A. Per nieuw boek, vóór het eerste hoofdstuk

Deze stappen gebeuren één keer per boek. Zolang ze niet af zijn, begint geen enkel hoofdstuk van dat boek. Voor Lukas zijn ze gedaan; het gereedschap (omzet-, export- en controlescript) en de richtlijn bestaan al en worden gedeeld.

| # | Stap | Resultaat | Klaar als |
|---|---|---|---|
| A1 | Boek aanmaken: `boek.json` + aangeleverd Word-bestand in `origineel/` (zie `README.md`, "Een nieuw boek toevoegen") | `boeken/<boek>/` | stijlnamen in het Word-bestand passen bij `FORMAAT.md` |
| A2 | Omzetten Word → Markdown (`scripts/docx_naar_md.py`) | `bron/<prefix>-01.md` … | alle hoofdstukken, versnummers doorlopend; `scripts/controleer_docx_md.py` zonder onverklaarde afwijkingen |
| A3 | Heen-en-terugtest: origineel → md → docx zonder wijzigingen | `export/heen-en-terug.docx` | redactie ziet geen verschil met het origineel (tekst, kleuren, stijlen) |
| A4 | Eventuele al goedgekeurde hoofdstukken omzetten (bij Lukas: 1–3) | `vereenvoudigd/<prefix>-NN.md` | tags per vers gelijk aan de bron |
| A5 | Referentiehoofdstukken en precedenten vaststellen (richtlijn §25A, §26) | `referentie/precedenten.md` | redactie heeft beslist welke hoofdstukken en precedenten gelden |
| A6 | Controlescript draaien (zie stap 3) | — | slaagt op de goedgekeurde hoofdstukken (of meldt bekende afwijkingen) |
| A7 | Openstaande punten van het boek beslissen | `TAKEN.md` van het boek | — |

---

## B. Per hoofdstuk

Voorbeeld: Lukas 4 (`boeken/lukas/`).

### Stap 1 – Voorbereiden (Claude)

1. Lees `richtlijn/redactierichtlijn.md`, `referentie/precedenten.md` en `bron/lukas-04.md`.
2. Maak een **aandachtspuntenlijst** voor dit hoofdstuk, bovenaan `wijzigingslog/lukas-04.md`:
   - alle begrippen met een domein-tag (`{genade}`, `{zonde}` …) en de bijbehorende regel uit §15–17;
   - oude vormen die waarschijnlijk vervangen moeten worden (Heere, zie, bevreesd, geschiedde …);
   - **begrippen die niet in de richtlijn of precedenten staan.** Die worden niet zelf beslist, maar voorgelegd.
3. Stuur de nieuwe begrippen vóór het concept naar de redactie als er veel van zijn of als ze vaak terugkomen in het boek. Zo kan de redactie de keuze één keer maken en geldt die voor alle volgende hoofdstukken.

> Lukas 4 bevat bijvoorbeeld: duivel (5×), demonen (3×), onreine geest, melaats, synagoge (7×), Evangelie (§22), prediken/verkondigen (§13A), Heere (4×).
> Begrippen die later veel terugkomen en nog niet in de richtlijn staan: *Zoon des mensen* (26×), *discipel* (42×), *schriftgeleerden* (15×), *tollenaar*, *Farizeeën*, *demon*. Het loont om die vroeg te beslissen.

### Stap 2 – Concept maken (Claude)

1. Werk in **blokken van één perikoop** (een verhaal of gedeelte, ongeveer 5–15 verzen). Zo blijft de samenhang zichtbaar.
2. Per vers de **beslisboom** (§3): kan een kind van 8–10 dit begrijpen? → zo niet: kan het zonder betekenisverlies eenvoudiger? Bij twijfel: niet veranderen.
3. Tags uit de bron blijven in hetzelfde vers staan. Alleen de woorden ertussen mogen veranderen.
4. **Woorden van Jezus** (`@jezus`) en **citaten uit het OT** (`@citaat-ot`) zijn extra terughoudend: alleen zinsbouw en ouderwetse woorden aanpassen.
5. Terugkerende formules altijd hetzelfde oplossen (bijv. "En zie", "En het geschiedde", "antwoordde en zei"). De eerste keuze gaat als precedent in het log.
6. Elk gewijzigd vers komt in `wijzigingslog/lukas-04.md` (sjabloon: `sjablonen/wijzigingslog.md`): bron, nieuw, elke wijziging met regelnummer.
7. Twijfel wordt niet weggestopt: zet een **Vraag aan redactie** bij het vers en kies in de tekst de veilige optie (dichter bij de bron).

Resultaat: `vereenvoudigd/lukas-04.md` + `wijzigingslog/lukas-04.md`. Status in `STATUS.md`: `concept`.

### Stap 3 – Controleren (script + Claude)

**Automatisch (controlescript):**
- zelfde versnummers, zelfde volgorde, geen vers kwijt of dubbel;
- per vers dezelfde alineastijlen en domein-tags als in de bron;
- geen verboden oude vormen meer: Heere, geschiedde, bevreesd, ondertrouwd, aangezien, gereed …;
- vaste begrippen uit §15 niet verdwenen (Christus, Messias, Zoon van God, Heilige Geest, Allerhoogste, Koninkrijk van God …);
- "Evangelie" → "het Goede Nieuws" (§22).

**Inhoudelijk (eindcontrole §24):**
- Een **tweede, onafhankelijke controle** door een aparte Claude-sessie. Die krijgt alleen de bron, het concept en de richtlijn, niet het log. Per vers controleert die: iets toegevoegd? iets weggelaten? kernbegrip beschadigd? betekenis verschoven? wijziging overbodig?
- Bevindingen worden verwerkt of als vraag in het log gezet.

### Stap 4 – Ter review aanbieden (Claude)

De vergelijking met het origineel is het belangrijkste werk van de redactie. Het reviewdocument is daarom gemaakt om **naast elkaar te lezen**:

1. Exporteer `export/lukas-04-review.docx`: een tabel met één rij per vers.
   - Links de bron, rechts de vereenvoudiging, allebei met de stijlen en kleuren van het origineel.
   - Een derde, smalle kolom met de wijzigingen uit het log ("Heere → Heer, §11").
   - Verzen zonder wijziging staan grijs, zodat de aandacht naar de gewijzigde verzen gaat.
2. Vragen aan de redactie staan bovenaan het document.
3. Commit in git. Status: `review`.

### Stap 5 – Review (redactie)

- Per vers bron en vereenvoudiging naast elkaar lezen.
- Bij een afgewezen wijziging: de bronvorm aanwijzen (of terugschrijven) in de rechterkolom of als opmerking. Terugvoeren naar het origineel is altijd mogelijk, omdat de bron er direct naast staat.
- Vragen bovenaan beantwoorden.
- Aangeven welke keuzes **precedent** moeten worden.

### Stap 6 – Verwerken (Claude)

1. Opmerkingen en teruggezette verzen uit het reviewdocument terugzetten naar `vereenvoudigd/lukas-04.md` en het log bijwerken.
2. Nieuwe keuzes → `referentie/precedenten.md`.
3. Keuzes die een **regel** raken (bijv. een nieuw begrip als "Zoon des mensen") → voorstel voor de richtlijn met een nieuw versienummer. De redactie beslist.
4. Controles (stap 3, het automatische deel) opnieuw draaien.
5. Bij veel wijzigingen: opnieuw naar stap 4.

### Stap 7 – Goedkeuren en vastleggen

1. Redactie keurt goed.
2. Status `goedgekeurd`, versie `v1.0` in `STATUS.md`; git-tag `lukas-04-v1.0` (`<prefix>-NN-v1.0`).
3. Exporteer de definitieve versie: `export/lukas-04-v1.0.docx` (zonder wijzigingen bijhouden).
4. Vanaf nu telt dit hoofdstuk als referentie (§25), net als hoofdstuk 1–3.

---

## Klaar als (checklist per hoofdstuk)

- [ ] `vereenvoudigd/<prefix>-NN.md` en `wijzigingslog/<prefix>-NN.md` bestaan
- [ ] controlescript slaagt
- [ ] onafhankelijke controle gedaan en verwerkt
- [ ] alle vragen aan de redactie beantwoord
- [ ] nieuwe precedenten vastgelegd
- [ ] eventuele richtlijnwijziging beslist
- [ ] `STATUS.md` bijgewerkt, git-tag gezet
- [ ] definitieve Word-export gemaakt

## Tempo

Eerst Lukas 4 als proefhoofdstuk (ongeveer 1.200 woorden). Daarna evalueren:
- Hoeveel vragen kwamen er en hoeveel wijzigingen draaide de redactie terug?
- Was de review in Word met wijzigingen bijhouden prettig?

Pas daarna het plan aan. Overweeg vervolgens om meerdere hoofdstukken tegelijk in concept te zetten.

---

## C. Autonome modus (zonder iemand achter de knoppen)

Voor als er een tijd niemand meekijkt. De **hoofdsessie** coördineert en neemt de beslissingen. Per hoofdstuk werkt een **vertaal-agent** (subagent) stap 1–3 van deel B af.

### Principe: vragen niet laten blokkeren

Een vertaal-agent wacht nooit op een antwoord. Komt hij een keuze tegen die niet in de richtlijn of de precedenten staat, dan:
1. kiest hij de **veilige optie**: dichtst bij de bron (§2, "bij twijfel niet veranderen");
2. zet hij in het wijzigingslog bij dat vers een **Vraag aan redactie** met de alternatieven;
3. zet hij de vraag ook in `## Vragen aan redactie` bovenaan zijn log. De hoofdsessie neemt de vragen over in `referentie/open-vragen.md`; vertaal-agents schrijven daar zelf niet in, omdat er meerdere tegelijk werken.

Zo blijft elke keuze terug te vinden en terug te draaien (§2), en kan de redactie later naast elkaar beslissen.

### Volgorde

1. **Begrippen vooraf (hoofdsessie).** Scan de hoofdstukken die aan de beurt zijn op begrippen die niet in de richtlijn staan (bijv. Zoon des mensen, discipel, demon, schriftgeleerden, Farizeeën, tollenaar). De hoofdsessie neemt per begrip een **voorlopig besluit** en zet het in `referentie/precedenten.md` met de status `voorlopig`. Hoe meer hier vooraf beslist wordt, hoe minder vragen er onderweg ontstaan.
2. **Eerste hoofdstuk alleen.** Eén vertaal-agent doet het volgende hoofdstuk. De hoofdsessie verwerkt daarna de open vragen:
   - Kan de vraag beantwoord worden in de geest van de richtlijn? Dan neemt de hoofdsessie een voorlopig besluit, zet het in de precedenten en past het hoofdstuk aan.
   - Raakt de vraag een principe (betekenis, theologie)? Dan blijft hij open voor de redactie.
3. **Daarna in kleine groepen** van 2–3 hoofdstukken tegelijk. Niet allemaal tegelijk: besluiten uit hoofdstuk N moeten in N+1 meegenomen kunnen worden. Na elke groep verwerkt de hoofdsessie de vragen opnieuw (stap 2).
4. Na elk hoofdstuk een **onafhankelijke controle** door een aparte agent (zonder het log te lezen) → `wijzigingslog/<prefix>-NN-controle.md`; de vertaal-agent verwerkt de bevindingen.
5. Per hoofdstuk eindigt de status op `review`, met een reviewdocument in `export/`. Goedkeuren (stap 7) gebeurt nooit in de autonome modus.

### Opdracht aan een vertaal-agent (sjabloon)

> Vereenvoudig Lukas NN volgens `WERKPLAN.md` deel B, stap 1–3. Lees `CLAUDE.md`, `README.md`, `FORMAAT.md`, `richtlijn/redactierichtlijn.md`, `boeken/lukas/CLAUDE.md`, `boeken/lukas/referentie/precedenten.md` en `boeken/lukas/referentie/open-vragen.md` (eerdere voorlopige besluiten gelden als precedent). Werk alleen vanuit `boeken/lukas/bron/lukas-NN.md`. Lever `boeken/lukas/vereenvoudigd/lukas-NN.md` en `boeken/lukas/wijzigingslog/lukas-NN.md`. Kies bij twijfel de optie die het dichtst bij de bron blijft en registreer de vraag in het log (niet in `referentie/open-vragen.md`). Wacht niet op antwoorden. Draai het controlescript en het exportscript (review). Wijzig de richtlijn, precedenten en andere hoofdstukken niet. Rapporteer: aantal gewijzigde verzen, open vragen, en controleresultaat.

### Wat de hoofdsessie bijhoudt
- `referentie/open-vragen.md`: alle vragen, met status `open` / `voorlopig besloten` / `besloten door redactie`.
- `referentie/precedenten.md`: besluiten, met status `voorlopig` of `vast`.
- `STATUS.md`: per hoofdstuk.
