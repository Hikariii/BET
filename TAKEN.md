# Takenlijst: gereedschap en repository

Taken per boek staan in `bijbel/<boek>/TAKEN.md`. `[ ]` = open. Gedane punten staan hier niet meer; git bewaart ze. Het plan voor de tool staat in `redactietool/stap2-plan.md`.

## Volgende stappen
- [ ] Proef 6a: de eigenaar bewerkt drie tot vijf verzen van Lukas 4 in de tool, beantwoordt "Gezegend", kopieert naar Word en exporteert; Claude doorloopt `WERKPLAN.md` D1 tot D3 op een kopie (stap2-plan, fase 6).
- [ ] Proef 6b: de redacteur plakt Lukas 2 van de live site in het sjabloon op Windows (welke Word?); `docx_naar_md.py` erover. Mislukt het: Download als Word.
- [ ] Inhoud: Lukas 4 door de redacteur, de negen open vragen, voorlopig naar `vast`, richtlijn v1.5 (stap2-plan, spoor Inhoud).
- [ ] Fase 9a: waarschuwingen uit één lijst, daarna de opmaakwerkbalk.
- [ ] Fase 9b: verschil, terug per hoofdstuk, stip in de hoofdstukstrip; alleen als de proef laat zien dat het gemist wordt.
- [ ] Conflicten bij back-up inladen tonen en per vers kiezen (eerst `besluitPerVers` en de diff, zie stap2-plan).
- [ ] Fase 10: menu bij een woord, na 9a en na open vraag 3.
- [ ] Besluiten van de eigenaar: zie "Wacht op de eigenaar".

## Wacht op de eigenaar
Dit beslist de eigenaar; Claude voert daarna uit. Inhoud van `bijbel/`, `richtlijn/` en git-tags raakt Claude niet aan zonder besluit.
- [ ] Proef 6a nu doen, en wanneer de redacteur meedoet (6b); welk hoofdstuk (voorstel Lukas 4); welke Word de redacteur gebruikt (desktop of web); welk kanaal de redacteur gebruikt voor Lukas 4 tot 24 (de tool of het reviewdocument in Word).
- [ ] Alinea ▾ in de werkbalk: bouwen met "geldt voor de hele alinea", of de alineastijl aan Word laten.
- [ ] Kiezen bij een vertaalvraag: alleen tonen waar de tool kan invullen, of altijd tonen met "Zoek de plekken".
- [ ] Sneltoetsen: welke toetsen voor van vers naar vers (Alt+Pijl in de editor, `j` en `k` op de pagina)?
- [ ] Rangorde in `CLAUDE.md` tegenover richtlijn §26 (precedenten boven de richtlijn, of andersom); daarna past Claude `CLAUDE.md` aan, of de redactie §26.
- [ ] Open vragen in `bijbel/lukas/referentie/open-vragen.md`: 4:2, 4:6 en 4:27 staan op "Gekozen in tekst" maar de tekst zegt iets anders; `open-vragen.md` de enige bron voor "open" maken (STATUS en de takenlijst van het boek verwijzen ernaar); 12:8-9 schrappen of als rij toevoegen.
- [ ] Lukas 1 tot 3: v1.0 taggen of de status terugzetten tot de vraag 0.9 of 1.0 beslist is; `export/lukas-01-03-review.docx` opnieuw maken. Er zijn nu geen git-tags.
- [ ] Vaste sleutels in `bijbel/*/referentie/`: een kolom Id in `precedenten.md` en `open-vragen.md`, een kolom Opties voor open vragen, een kolom Controle voor oude vormen (vorm en of je het wilt). Dit vervangt het raden in `redactietool/src/app/precedentenBijRegel.ts`: 294 van de 599 logregels die "precedent" noemen, geven meer dan één kandidaat; 97 geen. Het logformaat verwijst dan met `precedent: <id>`, en de logs, `sjablonen/wijzigingslog.md`, `parse_log` en `leesLog.ts` veranderen mee.
- [ ] Deel E van `WERKPLAN.md` (voorstel): wie loopt de 477 voorlopige vertaalkeuzes door, en mag een hoofdstuk goedgekeurd worden zolang ze voorlopig zijn?
- [ ] Het voorstel in `WERKPLAN.md` (rollen, reviewdocument als leesdocument, eindproduct, overdracht, `bij editor`): akkoord?
- [ ] Tweede boek: welk boek en wanneer, of "niet binnen dit jaar".
- [ ] Git-tag voor de oude ontwerpmap (`redactietool/ontwerp/`): de eigenaar tagt zelf als hij wil. De laatste commit met de schermafbeeldingen is `15ef416`.

## Toetsenbord
Alleen wat het werk sneller maakt.
- [ ] Alt+Pijl omlaag of omhoog in de editor: sluit de editor en opent die van het volgende of vorige vers (toets na keuze eigenaar).
- [ ] Op de pagina `j` en `k` (of Alt+Pijl) naar het volgende of vorige vers; zet de toetsen in de Help.
- [ ] Na een paginawissel de focus op de `h1` van de nieuwe pagina.
- [ ] Zichtbare focusrand en focus op de goede plek na Kiezen, Toepassen, Vers terugzetten, het openen van een hoofdstukactie (tekstveld) en een naslagkaart; focus bij een verdwijnende strippijl.
- [ ] Skip-link "Naar de verzen" langs de hoofdstukstrip; de strip als één tabstop met pijltjes.
- [ ] Punaise: na vastzetten via een open naslagkaart in een vak dat nooit overliep, verdwijnt de punaise bij losmaken en valt de focus weg.
- [ ] Begrippenschermen: te veel tabstops (eigen voorbehoud, alleen doen als het vers-naar-vers werk erdoor sneller wordt).

## Tests
Aanpak en volgorde: verbeterplan tests (stap 1 tot 4).
- [ ] Rooktest op de gebouwde app (Playwright als devDependency, in de workflow): `/BET/#/lukas/1` zonder console- en paginafouten, een vers bewerken en herladen, Vertaalvragen en de galerij openen, Export voor Claude downloaden. De opmaakcontrole (`redactietool/ontwerp/opmaakcontrole.mjs`) krijgt een exitcode, faalt bij 0 stukken en neemt de hoofdstukken uit `boek.json`; breid hem uit met vet, cursief, onderstreept en de vers-editor, naslagkaart, versvoorproef en Zoeken en vervangen. Schermafbeeldingen die ongewenste veranderingen vangen, horen hier ook.
- [ ] Klembord in die rooktest: de echte knop Hoofdstuktekst kopiëren, `text/html` lezen en de `mso-style-name`-regels controleren; daarna kan `src/klembord/chromiumKlembord.mjs` (alleen macOS) weg.
- [ ] Python in de workflow: `controleer_heen_en_terug.py`, `controleer_docx_md.py` en `controleer_hoofdstuk.py` voor Lukas.
- [ ] Componenttests (happy-dom met `@testing-library/preact`) voor `BackupInladen` en `BewerkbaarVers` en de editor (typen, Enter, Escape, bewaren); `useAanwijzen` (wachttijd na verlaten, terugkomen binnen die tijd); Escape en focus in het back-upvenster; de vaste vertaalregels bij een open naslagkaart.
- [ ] Eerst de logica uit de schermen halen: `maakAntwoordacties` (Vertaalvragen) en `toepassen` (Vervangen) als pure functies met de opslag als parameter, dan tests; `Vervangen.tsx` (ongeveer 470 regels) opsplitsen.
- [ ] Zwakke tests: exacte aantallen in `wijziging.test.ts`; een weggevallen markering in het tweede deel van een vers in `waarschuwingen.test.ts`; vaste verwachtingen in plaats van tellingen die met de data meebewegen (`opties.test.ts` telt alle 36 vragen; de test van Vervangen op echte data telt met bijna dezelfde regex als de code, liever 26 plekken voor "de Mensenzoon"). Elke reparatie met een breekproef.
- [ ] Foutpaden van de back-up (terugzetten mislukt, keuzes niet bewaard); `toegepast` als datum controleren in `alsKeuze`.
- [ ] Help: de knopteksten toetsen door de tekst van het element met die `data-help` te lezen; een test dat elk algemeen onderdeel in het menu van het venster staat (nu met de hand opgesomd naast `ALGEMENE_ONDERDELEN`); titels van onderdelen in verwijzingen invullen (`{{onderdeel:...}}`) in plaats van overtypen.
- [ ] Naar Word: in een echte Safari controleren dat de waarschuwing verschijnt; nagaan of `navigator.clipboard.write` de `mso-`stijlen behoudt (dan kan `execCommand` weg).
- [ ] Later: een plakresultaat uit Word als vaste test (na proef 6b); dekkingsmeting zonder drempel; pariteitstests per boek (bij het tweede boek).

## Opruimen
Ook kleine punten.
- [ ] Bewerken: de opmaakwaarschuwing alleen bij opmaak die de tekst van Claude nog had (nu tegen de bron, dus een bewust ontbrekende tag geeft steeds een waarschuwing); hoort bij fase 9a.
- [ ] Bewerken: `wisVers` vangt opslagfouten niet af (anders dan `bewaarVers`); onleesbare verzen in de opslag verdwijnen stil bij de volgende bewaring; dubbele samenvoeglogica in `tussenstand.ts` en `versknip.ts`.
- [ ] `draaiKeuzeTerug` (alles terugdraaien) registreert bij een gedeeltelijke terugdraai de echt teruggedraaide verzen niet als `teruggedraaid`, anders dan `draaiVersTerug`.
- [ ] Vertaalvragen: de kolom Plaats van het register tonen (`Vertaalvraag` heeft er nog geen veld voor); een vast statusveld in plaats van "onbeslist" als "geen statuswoord in de tekst" (hangt samen met de vaste sleutels bij "Wacht op de eigenaar").
- [ ] Vervangen: een vondst over een opmaakgrens kan alleen met de hand; overwegen of de tool die ook kan vervangen (met keuze welke opmaak blijft). Woordgrenzen bij een apostrof ("zo" in "zo'n", "m" in "m'n"); aansluitende stukken met gelijke opmaak samenvoegen voordat een vondst "met de hand" wordt (alleen als dat in de data voorkomt).
- [ ] Zoeken en vervangen: bereik in de keuze bewaren; Annuleren in het voorbeeldvenster; uitleg bij "0 plekken aangepast"; lidwoordenlijst voor varianten zonder dubbelzinnige woorden (zijn, ons, hun, haar, je) of met waarschuwing; comments in `opties.ts` die de code beschrijven.
- [ ] Back-up inladen: bij antwoorden tonen welke een lokaal antwoord overschrijven (en dat een toelichting verloren gaat); in het voorbeeld ook verouderde verzen tonen. Eerst automatisch een back-up van de huidige stand downloaden bij Vervangen.
- [ ] Opgeslagen: "verouderd nog niet gecontroleerd" tonen zolang de hoofdstukken laden (`verouderdBekend`); terug naar de tekst van Claude per vers vanuit het overzicht; een mislukte schrijfactie (opslag vol) ook bovenin melden.
- [ ] Export: veld `basis` (de tekst van Claude waarop de vertaler begon) bij verouderde verzen; de melding "voordat je kopieert" verduidelijken voor bewerkingen die niet toegepast worden; een antwoord met keuzes ook opnemen in de hoofdstukken van de vraagverzen (unie van de hoofdstukken van de keuzes en van de verzen).
- [ ] Help: tekst slepen die in de achtergrond eindigt, sluit het venster. Versvoorproef in Keuzes en vragen: meeschuiven bij scrollen.
- [ ] Naslagkaart: Bijbeltekst-kolommen in richtlijntabellen herkenbaar maken in de markdown in plaats van op kolompositie.
- [ ] `document.title` per hoofdstuk zetten; de Node-versie op één plek (nu `mise.toml` 26.13.1 en de workflow `26`).
- [ ] De zijbalk is weg uit de app. Besluiten of `Zijbalk.tsx`, `Zijbalk.css`, `Zijbalk.test.ts`, de galerijonderdelen en `--zijbalk-breedte` (staat in `app.css` en `vormgeving.css`) weg kunnen; `statusKlasse` verhuist dan naar een neutrale plek.
- [ ] Kleine opruimpunten: `laadHoofdstukkenEenmalig` naar `gegevens.ts`; `ZICHTBARE_REGELS` exporteren; `aantal.tekst` in `boekplekken.ts`; `--schaal` vóór de eerste render zetten; één telling voor open vragen (strip en tabblad).
- [ ] Oude namen: de bestandsnamen blijven (Besloten.tsx, Gevonden.tsx, Vervangen.tsx, Bewaard; de adressen en sleutels veranderen niet). Alleen comments en README's gaan naar Opgeslagen en Vertaalkeuzes.
- [ ] De OFL-licentie van de letters (Atkinson Hyperlegible Next, Inter) vermelden in de README of met de site meeleveren.

## Tweede boek
Trigger en voorwaarden: zie `redactietool/stap2-plan.md`, "Alleen op een trigger".
- [ ] Begrippen: de heuristieken voor werkregels en verschijnselen (`src/begrippen/precedentVormen.ts`) en de statuswoorden (`verzamelVragen.ts`) uit `boek.json` halen.
- [ ] Opties: een domeinnaam als gewoon woord (dag, geloof, oordeel, zonde) maakt nu een markeringsvoorstel; bij een tweede boek nalopen of de optie markeringstaal gebruikt.
- [ ] Galerij: boek en verzen uit de data halen in plaats van vast `lukas`; unieke ids per hoofdstuk.
- [ ] Gedeelde begrippenlijst voor alle boeken, zodra de redactie vertaalkeuzes `vast` maakt: de boekoverstijgende begrippen (Mensenzoon, discipel, Farizeeën, enzovoort) verhuizen naar een gedeelde lijst.
