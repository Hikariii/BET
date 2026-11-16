#!/usr/bin/env python3
"""Controle van docx_naar_md.py: vergelijkt de Markdown-uitvoer met het Word-bestand.

Gebruik:
    python3 -I scripts/controleer_docx_md.py [--boek lukas] [<docx> <mdmap>] [--vergelijk-met <andere mdmap>]

Zonder <docx> en <mdmap>: het sjabloon uit boek.json tegen bijbel/<boek>/bron/.

Controles:
  1. tekst: md zonder tags (met [n] -> n) tegenover platte tekst uit het docx (textutil indien
     beschikbaar, anders eigen XML-extractie); eerst zonder witruimte, daarna per woord;
  2. tags: per hoofdstuk en stijl het aantal tags in md tegenover het aantal opmaakreeksen in het
     docx (aaneengesloten tekstdragende runs met dezelfde opmaak; witruimte-runs tellen niet
     mee, versnummers en alineagrenzen breken een reeks);
  3. verzen: aantal en volgorde per hoofdstuk, tegenover de versindeling in boek.json;
  4. structuur: elk md-bestand volgens FORMAAT.md (parse_md), de kop en het einde van het bestand.

Een afwijking in controle 2 die in controle.json onder `docx_geaccepteerd` staat (hoofdstuk, opmaak,
reden) telt als GEACCEPTEERD en niet als probleem.
Exitcode 0 zonder problemen, 1 met problemen, 2 bij een fout in de invoer.
"""
import argparse
import difflib
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402
from formaat import (  # noqa: E402
    BOLD_PSTYLES, HIGHLIGHT, ITALIC_PSTYLES, ORDER, RED, TAG_OF_RSTYLE, TITLE_STYLES_READ, parse_md_text,
)

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def is_aan(eigenschappen, naam):
    element = eigenschappen.find(W + naam) if eigenschappen is not None else None
    return element is not None and element.get(W + 'val') not in ('0', 'false', 'off', 'none')


def docx_runs(pad, titel_re):
    """-> {hoofdstuk: lijst}; element = ('P',) alineagrens, ('V',) versnummer of (tekst, opmaak)."""
    root = ET.fromstring(boekmod.lees_docx_onderdeel(pad, 'word/document.xml'))
    hoofdstukken = {}
    huidig = None
    for alinea in root.iter(W + 'p'):
        alineastijl = alinea.find(W + 'pPr/' + W + 'pStyle')
        alineastijl = alineastijl.get(W + 'val') if alineastijl is not None else None
        stukken = []
        for run in alinea.iter(W + 'r'):
            tekst = ''.join((c.text or '') for c in run if c.tag == W + 't')
            if not tekst:
                continue
            eigenschappen = run.find(W + 'rPr')
            tekenstijl = eigenschappen.find(W + 'rStyle') if eigenschappen is not None else None
            tekenstijl = tekenstijl.get(W + 'val') if tekenstijl is not None else None
            hoogte = eigenschappen.find(W + 'vertAlign') if eigenschappen is not None else None
            superscript = hoogte is not None and hoogte.get(W + 'val') == 'superscript'
            opmaak = set()
            if tekenstijl in TAG_OF_RSTYLE:
                opmaak.add(TAG_OF_RSTYLE[tekenstijl])
            kleur = eigenschappen.find(W + 'color') if eigenschappen is not None else None
            if kleur is not None and (kleur.get(W + 'val') or '').upper() == 'FF0000':
                opmaak.add(RED)
            markering = eigenschappen.find(W + 'highlight') if eigenschappen is not None else None
            if markering is not None and markering.get(W + 'val') == 'yellow':
                opmaak.add(HIGHLIGHT)
            if is_aan(eigenschappen, 'u'):
                opmaak.add('onderstreept')
            if tekenstijl is None and is_aan(eigenschappen, 'b') and alineastijl not in BOLD_PSTYLES:
                opmaak.add('vet')
            if tekenstijl is None and is_aan(eigenschappen, 'i') and alineastijl not in ITALIC_PSTYLES:
                opmaak.add('cursief')
            stukken.append((tekst, opmaak, superscript, tekenstijl in TITLE_STYLES_READ))
        titel = ''.join(s[0] for s in stukken if s[3])
        gevonden = titel_re.match(titel)
        if gevonden:
            huidig = int(gevonden.group(1))
            hoofdstukken[huidig] = []
            stukken = [s for s in stukken if not s[3]]
        if huidig is None:
            continue
        hoofdstukken[huidig].append(('P',))
        for tekst, opmaak, superscript, _ in stukken:
            if not tekst.strip():
                continue
            if superscript and re.fullmatch(r'\s*\d+\s*', tekst):
                hoofdstukken[huidig].append(('V',))
                continue
            hoofdstukken[huidig].append((tekst, opmaak))
    return hoofdstukken


def tel_reeksen(reeks):
    """Aantal opmaakreeksen per opmaak in de runs van een hoofdstuk."""
    aantallen = {opmaak: 0 for opmaak in ORDER}
    vorige = set()
    for element in reeks:
        if len(element) == 1:
            vorige = set()
            continue
        for opmaak in element[1]:
            if opmaak not in vorige:
                aantallen[opmaak] += 1
        vorige = element[1]
    return aantallen


def md_aantallen(alineas):
    aantallen = {opmaak: 0 for opmaak in ORDER}
    for alinea in alineas:
        for _positie, opmaak in alinea['openingen']:
            aantallen[opmaak] += 1
    return aantallen


def md_platte_tekst(alineas):
    """De tekst van een hoofdstuk zonder tags, met [n] als n."""
    regels = []
    for alinea in alineas:
        if alinea['soort'] == 'titel':
            regels.append(alinea['titel'])
        else:
            regels.append(''.join(str(seg[1]) for seg in alinea['segs']))
    return '\n'.join(regels)


def docx_platte_tekst(pad):
    try:
        resultaat = subprocess.run(['textutil', '-convert', 'txt', '-stdout', pad], capture_output=True, check=True)
        return resultaat.stdout.decode('utf-8'), 'textutil'
    except (OSError, subprocess.CalledProcessError):
        root = ET.fromstring(boekmod.lees_docx_onderdeel(pad, 'word/document.xml'))
        alineas = [''.join((c.text or '') for t in p.iter(W + 'r') for c in t if c.tag == W + 't')
                   for p in root.iter(W + 'p')]
        return '\n'.join(alineas), 'eigen XML'


def lees_hoofdstukken(boek, mdmap):
    """{hoofdstuk: (ruwe tekst, alinea's of None bij een formaatfout, foutmelding)} voor de md-bestanden in mdmap."""
    hoofdstukken = {}
    for naam in sorted(os.listdir(mdmap)):
        nummer = boek.nummer_uit_bestandsnaam(naam)
        if nummer is None:
            continue
        tekst = boekmod.lees_tekst(os.path.join(mdmap, naam))
        try:
            hoofdstukken[nummer] = (tekst, parse_md_text(tekst, naam), None)
        except boekmod.BoekFout as fout:
            hoofdstukken[nummer] = (tekst, None, str(fout))
    if not hoofdstukken:
        raise boekmod.BoekFout(f"{mdmap} bevat geen {boek.prefix}-NN.md")
    return hoofdstukken


def zonder_witruimte(tekst):
    return re.sub(r'\s+', '', tekst.replace('​', ''))


def controleer_tekst(boek, docx, hoofdstukken):
    """Controle 1; geeft het aantal problemen."""
    platte_tekst, bron = docx_platte_tekst(docx)
    md_tekst = '\n'.join(md_platte_tekst(alineas) for _, alineas, _ in
                         (hoofdstukken[k] for k in sorted(hoofdstukken)) if alineas is not None)
    if len(hoofdstukken) < boek.aantal_hoofdstukken:
        # het docx kan meer hoofdstukken hebben dan md (--max-hoofdstuk): knip bij het eerste ontbrekende hoofdstuk
        volgende = max(hoofdstukken) + 1
        gevonden = re.search(r'^%s %d\b' % (re.escape(boek.naam), volgende), platte_tekst, re.M)
        if gevonden:
            platte_tekst = platte_tekst[:gevonden.start()]
    gelijk = zonder_witruimte(platte_tekst) == zonder_witruimte(md_tekst)
    print('TEKST (zonder witruimte, %s): %s' % (bron, 'GELIJK' if gelijk else 'VERSCHIL'))
    woorden_docx, woorden_md = platte_tekst.split(), md_tekst.split()
    print('  woorden docx %d, md %d' % (len(woorden_docx), len(woorden_md)))
    vergelijking = difflib.SequenceMatcher(None, woorden_docx, woorden_md, autojunk=False)
    verschillen = [o for o in vergelijking.get_opcodes() if o[0] != 'equal']
    print('  woordverschillen: %d' % len(verschillen))
    for soort, van1, van2, naar1, naar2 in verschillen[:40]:
        print('   ', soort, ' '.join(woorden_docx[van1:van2]), '=>', ' '.join(woorden_md[naar1:naar2]))
    return 0 if gelijk else 1


def controleer_opmaak(boek, docx, hoofdstukken):
    """Controle 2; geeft het aantal problemen."""
    geaccepteerd = {(hoofdstuk, opmaak): reden for hoofdstuk, opmaak, reden in boek.docx_geaccepteerd}
    docx_reeksen = docx_runs(docx, boek.titel_re)
    print('\nTAGS per hoofdstuk (md / docx), alleen afwijkingen en totaal:')
    totaal_md = {opmaak: 0 for opmaak in ORDER}
    totaal_docx = {opmaak: 0 for opmaak in ORDER}
    problemen = 0
    for k in sorted(hoofdstukken):
        alineas = hoofdstukken[k][1]
        if alineas is None:
            continue
        in_md = md_aantallen(alineas)
        in_docx = tel_reeksen(docx_reeksen.get(k, []))
        for opmaak in ORDER:
            totaal_md[opmaak] += in_md[opmaak]
            totaal_docx[opmaak] += in_docx[opmaak]
            if in_md[opmaak] == in_docx[opmaak]:
                continue
            verschil = 'H%d %s: md %d, docx %d' % (k, opmaak, in_md[opmaak], in_docx[opmaak])
            reden = geaccepteerd.get((k, opmaak))
            if reden is None:
                problemen += 1
                print('  AFWIJKING', verschil)
            else:
                print('  GEACCEPTEERD', verschil, '(%s)' % reden)
    print('  totaal: ' + ', '.join('%s %d/%d' % (o, totaal_md[o], totaal_docx[o]) for o in ORDER))
    return problemen


def controleer_verzen(boek, hoofdstukken, vergelijk_map):
    """Controle 3; geeft het aantal problemen."""
    print('\nVERZEN:')
    problemen = 0
    versnummers = {}
    for k in sorted(hoofdstukken):
        nummers = [int(x) for x in re.findall(r'\[(\d+)\]', hoofdstukken[k][0])]
        versnummers[k] = nummers
        oplopend = nummers == list(range(1, len(nummers) + 1))
        verwacht = boek.verzen[k - 1] if k <= boek.aantal_hoofdstukken else None
        afwijking = not (oplopend and verwacht == len(nummers))
        problemen += afwijking
        print('  %s %d: %d verzen (verwacht %s), oplopend 1..n: %s%s'
              % (boek.naam, k, len(nummers), verwacht, oplopend, '  <-- AFWIJKING' if afwijking else ''))
    print('  totaal: %d' % sum(len(v) for v in versnummers.values()))
    if vergelijk_map:
        andere = lees_hoofdstukken(boek, vergelijk_map)
        for k in sorted(set(andere) & set(hoofdstukken)):
            andere_nummers = [int(x) for x in re.findall(r'\[(\d+)\]', andere[k][0])]
            gelijk = andere_nummers == versnummers[k]
            print('  vergelijk %s %d: %s' % (boek.naam, k, 'zelfde versnummers' if gelijk else 'VERSCHIL'))
            problemen += not gelijk
    return problemen


def controleer_structuur(boek, hoofdstukken):
    """Controle 4; geeft het aantal problemen."""
    print('\nSTRUCTUUR:')
    problemen = 0
    for k in sorted(hoofdstukken):
        tekst, _alineas, formaatfout = hoofdstukken[k]
        if formaatfout:
            print('  H%d: %s' % (k, formaatfout))
            problemen += 1
        if not tekst.startswith('# %s %d\n\n' % (boek.naam, k)):
            print('  H%d: kop ontbreekt/onjuist' % k)
            problemen += 1
        if not tekst.endswith('\n') or tekst.endswith('\n\n'):
            print('  H%d: einde van bestand' % k)
            problemen += 1
    return problemen


def main(argv=None):
    parser = argparse.ArgumentParser(description='Controleert de Markdown-uitvoer van docx_naar_md.py tegen het Word-bestand.')
    parser.add_argument('docx', nargs='?', help='standaard: het sjabloon uit boek.json')
    parser.add_argument('mdmap', nargs='?', help='standaard: bijbel/<boek>/bron')
    parser.add_argument('--vergelijk-met')
    parser.add_argument('--boek', help='map in bijbel/ (mag weg als er maar één boek is)')
    argumenten = parser.parse_args(argv)
    if (argumenten.docx is None) != (argumenten.mdmap is None):
        parser.error('geef <docx> en <mdmap> allebei op, of geen van beide')
    try:
        boek = boekmod.laad(argumenten.boek)
        if argumenten.docx is None:
            argumenten.docx, argumenten.mdmap = boek.sjabloon, os.path.join(boek.map, 'bron')
        hoofdstukken = lees_hoofdstukken(boek, argumenten.mdmap)
        problemen = controleer_tekst(boek, argumenten.docx, hoofdstukken)
        problemen += controleer_opmaak(boek, argumenten.docx, hoofdstukken)
        problemen += controleer_verzen(boek, hoofdstukken, argumenten.vergelijk_met)
        problemen += controleer_structuur(boek, hoofdstukken)
    except (boekmod.BoekFout, ET.ParseError) as fout:
        print('FOUT: %s' % fout, file=sys.stderr)
        return 2
    print('\nTOTAAL AANTAL PROBLEMEN: %d' % problemen)
    return 1 if problemen else 0


if __name__ == '__main__':
    sys.exit(main())
