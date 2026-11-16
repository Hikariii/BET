# Werkplan: een hoofdstuk omzetten

Dit plan beschrijft hoe één hoofdstuk van de brontekst naar een goedgekeurde vereenvoudigde versie gaat.
Inhoudelijke regels: de redactierichtlijn. Mappen: `README.md`. Tags: `FORMAAT.md`.

**Paden.** Het plan geldt voor elk boek. Paden als `bron/`, `vereenvoudigd/`, `wijzigingslog/`, `referentie/`, `export/` en `STATUS.md` zijn relatief aan de boekmap `bijbel/<boek>/`. `richtlijn/`, `sjablonen/` en `scripts/` staan in de hoofdmap. De voorbeelden gebruiken Lukas (`bijbel/lukas/`, prefix `lukas`).

**Voorstel (2026-11-16), wacht op akkoord eigenaar.** Rollen, met één woord per rol (overal in dit plan, in `open-vragen.md` en in de tool):

| Rol | Wie | Doet en beslist |
|---|---|---|
| **Eigenaar** | de eigenaar van de repo (in `CLAUDE.md`: de gebruiker) | Kiest wat er gebouwd en gedaan wordt; beslist over de voorstellen uit deel D (precedent, regel, opmaak); zegt wanneer een hoofdstuk naar de redacteur gaat; pusht; geeft Word-bestanden door en zet aangeleverd Word in `origineel/` |
| **Redactie** | de mensen die de richtlijn bewaken | Beslist over de inhoud: beantwoordt vragen, keurt een hoofdstuk goed, beslist over richtlijnwijzigingen (B6) |
| **Redacteur** | de vertaler die de definitieve tekst maakt, in de tool of in Word | Bewerkt een hoofdstuk en levert het Word-bestand aan bij de eigenaar |
| **Claude** | de hoofdsessie en de agents die zij start | Maakt concept en log, voert de controles uit, committet (nooit pushen), houdt `STATUS.md`, `referentie/` en de statuswissels bij, neemt voorlopige besluiten (status `voorlopig`) en doet voorstellen |

Tot de eigenaar akkoord geeft, geldt de korte indeling:
- **Claude** maakt het concept, het wijzigingslog en voert de controles uit.
- **Redactie** beslist: beoordeelt in Word, beantwoordt vragen, keurt goed.

---

## A. Per nieuw boek, vóór het eerste hoofdstuk

Deze stappen gebeuren één keer per boek. Zolang ze niet af zijn, begint geen enkel hoofdstuk van dat boek. Voor Lukas zijn ze gedaan; het gereedschap (omzet-, export- en controlescript) en de richtlijn bestaan al en worden gedeeld.

| # | Stap | Resultaat | Klaar als |
|---|---|---|---|
| A1 | Boek aanmaken: `boek.json` + aangeleverd Word-bestand in `origineel/` (zie `README.md`, "Een nieuw boek toevoegen") | `bijbel/<boek>/` | stijlnamen in het Word-bestand passen bij `FORMAAT.md` |
| A2 | Omzetten Word → Markdown (`scripts/docx_naar_md.py`) | `bron/<prefix>-01.md` … | alle hoofdstukken, versnummers doorlopend; `scripts/controleer_docx_md.py` zonder onverklaarde afwijkingen |
| A3 | Heen-en-terugtest: origineel → md → docx zonder wijzigingen | `export/heen-en-terug.docx` | redactie ziet geen verschil met het origineel (tekst, kleuren, stijlen) |
| A4 | Eventuele al goedgekeurde hoofdstukken omzetten (bij Lukas: 1–3) | `vereenvoudigd/<prefix>-NN.md` | tags per vers gelijk aan de bron |
| A5 | Referentiehoofdstukken en precedenten vaststellen (richtlijn §25A, §26) | `referentie/precedenten.md` | redactie heeft beslist welke hoofdstukken en precedenten gelden |
| A6 | Controlescript draaien (zie stap 3) | - | slaagt op de goedgekeurde hoofdstukken (of meldt bekende afwijkingen) |
| A7 | Openstaande punten van het boek beslissen | `TAKEN.md` van het boek | - |

---

## B. Per hoofdstuk

Voorbeeld: Lukas 4 (`bijbel/lukas/`).

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

Een vers heet **gewijzigd** als de tekst van de vereenvoudiging (zonder opmaak-tags) verschilt van de bron. Alleen die verzen staan in het wijzigingslog en tellen mee in "41/44 gewijzigd" in `STATUS.md`.

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
- De bevindingen staan in `wijzigingslog/lukas-04-controle.md` (`<prefix>-NN-controle.md`). Dat bestand is geen wijzigingslog en wordt door de scripts en de tool niet als log gelezen. Ze worden verwerkt of als vraag in het log gezet.

### Stap 4 – Ter review aanbieden (Claude)

De vergelijking met het origineel is het belangrijkste werk van de redactie. Het reviewdocument is daarom gemaakt om **naast elkaar te lezen**:

1. Exporteer `export/lukas-04-review.docx`: een tabel met één rij per vers.
   - Links de bron, rechts de vereenvoudiging, allebei met de stijlen en kleuren van het origineel.
   - Een derde, smalle kolom met de wijzigingen uit het log ("Heere → Heer, §11").
   - Verzen zonder wijziging staan grijs, zodat de aandacht naar de gewijzigde verzen gaat.
2. Vragen aan de redactie staan bovenaan het document.
3. Commit de md-bestanden in git (de export staat niet in git, zie stap 4b). Status: `review`.

**Voorstel (2026-11-16), wacht op akkoord eigenaar.** Het reviewdocument is een **leesdocument**: de redactie leest en markeert op papier of in Word, maar reageert niet in het bestand, want niets leest die reacties terug. Reacties lopen via deel D (de tool, of een Word-bestand in hoofdstukvorm).

### Stap 4b – Overdragen aan de redacteur (voorstel)

**Voorstel (2026-11-16), wacht op akkoord eigenaar.**
1. De eigenaar zegt dat de redacteur aan hoofdstuk N begint.
2. Claude zet de status op `bij editor` (met datum in de kolom Herkomst van `STATUS.md`) en committet. Vanaf nu raakt Claude dit hoofdstuk niet meer aan: ook geen regel uit D2 erop toepassen.
3. De eigenaar pusht (de tool op Pages toont dan de nieuwste tekst van Claude) en geeft de redacteur het kanaal door: de tool, het reviewdocument of beide. Het kanaal staat in de kolom Herkomst. Liever één kanaal per hoofdstuk, anders ontstaan er twee versies.
4. De redacteur levert het Word-bestand aan bij de eigenaar. De eigenaar zet het in `origineel/` (naast de andere aanleveringen, nooit een bestand overschrijven).
5. Op verzoek van de eigenaar voert Claude het terug volgens deel D. Claude zet de status op `verwerkt` (D1). Stopt de redacteur zonder aan te leveren, dan zegt de eigenaar dat en zet Claude de status terug op `review`.

### Stap 5 – Review (redactie)

- Per vers bron en vereenvoudiging naast elkaar lezen.
- Bij een afgewezen wijziging: de bronvorm aanwijzen (of terugschrijven) in de rechterkolom of als opmerking. Terugvoeren naar het origineel is altijd mogelijk, omdat de bron er direct naast staat.
- Vragen bovenaan beantwoorden.
- Aangeven welke keuzes **precedent** moeten worden.

**Voorstel (2026-11-16), wacht op akkoord eigenaar.** Opmerkingen in de tabel van het reviewdocument kan niemand terugvoeren (`docx_naar_md.py` leest dat bestand niet: "Geen hoofdstuktitels gevonden"). Daarom: de redactie leest in het reviewdocument, en een afgewezen wijziging gaat via de redacteur in de tool of in een Word-bestand in hoofdstukvorm (deel D). Antwoorden op vragen gaan via de tool (Vertaalvragen), of via de eigenaar naar Claude.

### Stap 6 – Verwerken (Claude)

1. Opmerkingen en teruggezette verzen uit het reviewdocument terugzetten naar `vereenvoudigd/lukas-04.md` en het log bijwerken. (**Voorstel (2026-11-16), wacht op akkoord eigenaar.** Voor aangeleverd werk geldt deel D in plaats van deze stap.)
2. Nieuwe keuzes → `referentie/precedenten.md`.
3. Keuzes die een **regel** raken (bijv. een nieuw begrip als "Zoon des mensen") → voorstel voor de richtlijn met een nieuw versienummer. De redactie beslist.
4. Controles (stap 3, het automatische deel) opnieuw draaien.
5. Bij veel wijzigingen: opnieuw naar stap 4.

### Stap 7 – Goedkeuren en vastleggen

1. Redactie keurt goed.
2. Status `goedgekeurd`, versie `v1.0` in `STATUS.md`; git-tag `lukas-04-v1.0` (`<prefix>-NN-v1.0`).
3. Exporteer de definitieve versie: `export/lukas-04-v1.0.docx` (zonder wijzigingen bijhouden).
   **Voorstel (2026-11-16), wacht op akkoord eigenaar.** Dit geldt voor hoofdstukken die niet via deel D zijn teruggevoerd. Wanneer de redacteur het hoofdstuk heeft aangeleverd, is **het aangeleverde Word-bestand het eindproduct** (stap1-plan U2: Word is leidend) en vervalt deze export als eindproduct. Dan is de export uit de md alleen de controle: leg hem naast het aangeleverde bestand (heen-en-terug) en meld elk verschil.
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

Lukas 4 tot 24 zijn in de autonome modus (deel C) gemaakt en staan op `review`. Wat ontbreekt is de proef met een echt hoofdstuk door de hele cyclus: bewerken, naar Word, aanleveren, terugvoeren (zie `redactietool/stap2-plan.md`, fase 6). Daarna evalueren:
- Hoeveel vragen kwamen er en hoeveel wijzigingen draaide de redactie terug?
- Was de review in Word met wijzigingen bijhouden prettig? (Zie D1 over bijgehouden wijzigingen.)

Pas daarna het plan aan. Overweeg vervolgens om meerdere hoofdstukken tegelijk door de redacteur te laten bewerken.

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

> Vereenvoudig Lukas NN volgens `WERKPLAN.md` deel B, stap 1–3. Lees `CLAUDE.md`, `README.md`, `FORMAAT.md`, `richtlijn/redactierichtlijn.md`, `bijbel/lukas/CLAUDE.md`, `bijbel/lukas/referentie/precedenten.md` en `bijbel/lukas/referentie/open-vragen.md` (eerdere voorlopige besluiten gelden als precedent). Werk alleen vanuit `bijbel/lukas/bron/lukas-NN.md`. Lever `bijbel/lukas/vereenvoudigd/lukas-NN.md` en `bijbel/lukas/wijzigingslog/lukas-NN.md`. Kies bij twijfel de optie die het dichtst bij de bron blijft en registreer de vraag in het log (niet in `referentie/open-vragen.md`). Wacht niet op antwoorden. Draai het controlescript en het exportscript (review). Wijzig de richtlijn, precedenten en andere hoofdstukken niet. Rapporteer: aantal gewijzigde verzen, open vragen, en controleresultaat.

### Wat de hoofdsessie bijhoudt
- `referentie/open-vragen.md`: alle vragen, met status `open` / `voorlopig besloten` / `besloten door redactie`.
- `referentie/precedenten.md`: besluiten, met status `voorlopig` of `vast`.
- `STATUS.md`: per hoofdstuk.

---

## D. Aangeleverd Word terugvoeren

De vertaler levert de definitieve tekst van een hoofdstuk aan als Word-bestand (zie `redactietool/stap1-plan.md`: Word is leidend). Het maakt niet uit of het bestand uit de redactietool komt of rechtstreeks in Word gemaakt is. Soms komt er een export voor Claude bij (`<prefix>-NN.redactie.json`); die is een toelichting, nooit een bron van tekst.

De export heeft `versie: 3` (exports met een andere versie worden niet meer gelezen). De velden:

| Veld | Betekenis |
|---|---|
| `structureleKeuzes` | de hele keuze met de plekken van dit hoofdstuk, toegepast en overgeslagen (met reden) |
| `reactiesOpOpmerkingen` | per reactie op een opmerking van Claude uit dit hoofdstuk: `nr` (het O-nummer), `kwestie` (de korte tekst van de opmerking), `tekst` (de reactie van de vertaler; mag leeg), `wordtVraag` (de vertaler wil er een vertaalvraag van) en `gegeven` (ISO-tijd), plus de `verzen` van de opmerking als `hoofdstuk:vers` |
| `reactiesOpRichtlijn` | alle reacties van de vertaler op de richtlijn en alle voorstellen voor een nieuwe regel, in elke export en niet alleen in die van het eigen hoofdstuk: `id` (`§17B` voor een reactie op een paragraaf, `nieuw-<tijd>` voor een voorstel voor een nieuwe regel), `paragraaf` (het nummer zonder §, of `null` bij een nieuwe regel), `titel` (van de paragraaf, leeg bij een nieuwe regel), `tekst` (mag leeg), `voorstel` (de vertaler stelt een nieuwe of andere regel voor) en `gegeven` (ISO-tijd) |
| `beantwoordeVragen` | per antwoord: `kwestie`, `optie` (de gekozen optietekst, of `eigen antwoord`), `toelichting` (de regel of uitleg van de vertaler; mag leeg), `keuzeIds` (de toegepaste keuzes onder het antwoord die dit hoofdstuk raken; geen, één of meer) en de `verzen` van de vraag |
| per vers | het `keuzeId` en de herkomst |

Een antwoord met keuzes staat in de export van elk hoofdstuk dat een van die keuzes raakt. Een antwoord zonder (bestaande) keuze staat alleen in de export van een hoofdstuk dat in de verzen van de vraag voorkomt, of van elk hoofdstuk als de vraag geen verzen heeft. Bij een keuze staat `vraag` alleen als het antwoord op die vraag die keuze nog noemt.

Een reactie op een opmerking staat in de export van het hoofdstuk waar de opmerking in het wijzigingslog staat. Het O-nummer is afgeleid van de plek in het log en kan verschuiven als het log verandert; controleer daarom eerst of `kwestie` nog bij de opmerking met dat nummer past, en zoek anders de opmerking op de kwestie.

Wat Claude met een reactie doet: lezen en verwerken in het wijzigingslog of in de tekst, in de volgende werkronde en na akkoord van de eigenaar (net als bij een toelichting). Een reactie is een mening of aanwijzing van de vertaler, nooit een bron van tekst. Is `wordtVraag` waar, dan zet Claude van de opmerking een nieuwe vraag in `bijbel/<boek>/referentie/open-vragen.md`, met het volgende vrije V-nummer en het O-nummer als herkomst (bijvoorbeeld in de kolom Plaats of in de besluittekst). Ook dat pas na akkoord van de eigenaar. De tool past `open-vragen.md` zelf nooit aan. Is `wordtVraag` waar en de tekst leeg, dan formuleert Claude de vraag uit de opmerking zelf.

De richtlijn geldt voor alle boeken, dus de reacties erop staan bij geen boek of hoofdstuk en gaan in elke export mee (keuze eigenaar). Dezelfde reactie staat daardoor in meer exports. Ontdubbel op `id` en `gegeven`: dezelfde `id` met dezelfde `gegeven` is dezelfde reactie; bij dezelfde `id` met een andere `gegeven` geldt de nieuwste.

Wat Claude met een reactie op de richtlijn doet: per reactie of voorstel een tekstvoorstel voor `richtlijn/redactierichtlijn.md` schrijven (bijvoorbeeld in `referentie/`), met de `id`, de `paragraaf` en de tekst van de vertaler erbij. Is `voorstel` onwaar, dan is de reactie een mening of vraag over de bestaande regel: lees ze en antwoord of pas het voorstel daarop aan. Pas na akkoord van de eigenaar gaat het voorstel in de richtlijn, met een nieuwe versie en een markering bij de regel (`[v1.4 nieuw]`, `[v1.4 gewijzigd]` of `[v1.4 open]`, met het nummer van de nieuwe versie). De tool past de richtlijn zelf nooit aan, en een reactie is nooit een bron van tekst.

De toelichting is input voor regels of precedentvoorstellen (stap D2), nooit een besluit: Claude neemt ze mee bij volgende hoofdstukken zodra de eigenaar ze heeft goedgekeurd, via `precedenten.md` of de richtlijn. Een toelichting die nog niet goedgekeurd is, geldt niet als regel. Een overgeslagen plek met reden `uitgevinkt`, `goedgekeurd` of `met de hand` is een bewust besluit; `variant niet toegepast` is dat niet (de vorm is niet gekozen) en `teruggedraaid` betekent dat het vers na het toepassen is teruggedraaid: ook dat is bewust anders en wordt niet gerepareerd.

Altijd op verzoek van de eigenaar, één hoofdstuk per keer. Status vooraf: meestal `bij editor` (zie stap 4b, voorstel).

### Stap D1: tekst (Claude)

0. **Voorstel (2026-11-16), wacht op akkoord eigenaar.** Controleer eerst of het bestand bijgehouden wijzigingen of opmerkingen bevat. `docx_naar_md.py` meldt alleen dat er `ins`/`del` staat en leest geen opmerkingen; tekst gaat dan stil verloren. Vraag de redacteur om een schone versie (alle wijzigingen aanvaard of afgewezen, opmerkingen apart), of lees de opmerkingen met de hand en meld in het log wat het script negeert.
1. Het Word-bestand komt naast de andere aanleveringen in `origineel/` (de eigenaar zet het daar, zie stap 4b). Nooit een bestaand bestand overschrijven.
2. Omzetten met `scripts/docx_naar_md.py` naar een tijdelijke map; het hoofdstuk daarna naar `vereenvoudigd/<prefix>-NN.md`.
3. Wijzigingslog bijwerken: per vers het verschil tussen Claudes concept en de aangeleverde tekst, met de herkomst uit de export als die er is.
4. Controlescript draaien.
5. Status `verwerkt`, met datum en bestandsnaam in de kolom Herkomst.

### Stap D2: lessen (Claude stelt voor, eigenaar beslist)

1. Elke keuze van de vertaler die afwijkt van de richtlijn of de precedenten wordt een voorstel: precedent naar `vast`, nieuw precedent, of richtlijn aanpassen. In een lijst in `referentie/` (zoals `afwijkingen-h1-3.md`).
2. Structurele keuzes uit de export worden direct precedentvoorstellen, en de toelichting bij een antwoord (`toelichting`, vooral bij een eigen antwoord) wordt een voorstel voor een regel, precedent of richtlijnwijziging. Overgeslagen plekken met een besluit (`uitgevinkt`, `goedgekeurd`, `met de hand`) zijn bewust anders en worden niet "gerepareerd"; `variant niet toegepast` is geen besluit en geeft geen voorstel.
3. Wijkt de tekst in de export af van Word: Word volgen en het verschil melden.
4. Pas na akkoord: in `precedenten.md` en `controle.json` zetten, en toepassen op hoofdstukken met status `review`. Nooit op hoofdstukken met `bij editor`.

### Stap D3: opmaak (Claude stelt voor, eigenaar beslist)

1. Markeringen uit de bron die in de aangeleverde tekst ontbreken (het controlescript meldt ze).
2. Woorden ongewijzigd: in één lijst voorstellen om de markering terug te zetten op dezelfde woorden; in één keer goed te keuren.
3. Woorden herschreven: per stuk een vraag, met bron en nieuwe tekst naast elkaar.

### Stap D4: afronden

Na akkoord op D2 en D3: status `goedgekeurd`, git-tag `<prefix>-NN-v1.0` (of een hogere versie bij een eerder goedgekeurd hoofdstuk), en het hoofdstuk telt als referentie (§25). **Voorstel (2026-11-16), wacht op akkoord eigenaar.** Het aangeleverde Word-bestand is het eindproduct; zie stap 7.

---

## E. Voorlopige precedenten vast maken (open vraag)

**Voorstel (2026-11-16), wacht op akkoord eigenaar.** Er is geen stap waarin een `voorlopig` precedent `vast` wordt: 477 van de 478 regels in `bijbel/lukas/referentie/precedenten.md` zijn voorlopig, en de richtlijn is v1.4 (concept). Open vragen aan de eigenaar: wie loopt ze door (de tool toont ze in Vertaalkeuzes), en mag een hoofdstuk `goedgekeurd` worden zolang ze voorlopig zijn? Tot dit beslist is, is er geen deel E en staat de vraag in `TAKEN.md`, "Wacht op de eigenaar".
