#!/usr/bin/env python3
"""Controle van docx_naar_md.py: vergelijkt de Markdown-uitvoer met het Word-bestand.

Gebruik:
    python3 -I scripts/controleer_docx_md.py [--boek lukas] [<docx> <mdmap>] [--vergelijk-met <andere mdmap>]

Zonder <docx> en <mdmap>: het sjabloon uit boek.json tegen boeken/<boek>/bron/.

Controles:
  1. tekst: md zonder tags (met [n] -> n) tegenover platte tekst uit het docx (textutil indien
     beschikbaar, anders eigen XML-extractie); eerst zonder witruimte, daarna per woord;
  2. tags: per hoofdstuk en stijl het aantal tags in md tegenover het aantal opmaakreeksen in het
     docx (aaneengesloten tekstdragende runs met dezelfde opmaak; witruimte-runs tellen niet
     mee, versnummers en alineagrenzen breken een reeks);
  3. verzen: aantal en volgorde per hoofdstuk, tegenover de versindeling in boek.json;
  4. structuur: nesting van tags, geen tag over een versgrens, hoogstens twee lege regels.
"""
import argparse
import difflib
import glob
import os
import re
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
RSTYLE_TAG = {'eeuwigleven': 'eeuwigleven', 'genade': 'genade', 'geloof': 'geloof', 'oordeel': 'oordeel',
              'rechtvaardig': 'rechtvaardig', 'zonde': 'zonde', 'Torah': 'torah', 'dag': 'dag'}
TAGS = ['onderwijs', 'highlight', 'onderstreept', 'vet', 'cursief'] + sorted(set(RSTYLE_TAG.values()))
ITALIC_P = {'engelenwoord', 'citaatOT', 'GodsStem'}
TITLE_R = {'Bblhfdstk', 'HoofdsukChar'}


def on(rpr, n):
    el = rpr.find(W + n) if rpr is not None else None
    return el is not None and el.get(W + 'val') not in ('0', 'false', 'off', 'none')


def docx_runs(path, titel_re):
    """-> lijst per hoofdstuk: lijst van reeksen; reeks-element = ('P',) barriere of (tekst, atoms)."""
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    chapters = {}
    cur = None
    for p in root.iter(W + 'p'):
        ps = p.find(W + 'pPr/' + W + 'pStyle')
        ps = ps.get(W + 'val') if ps is not None else None
        entries = []
        for r in p.iter(W + 'r'):
            t = ''.join((c.text or '') for c in r if c.tag == W + 't')
            if not t:
                continue
            rpr = r.find(W + 'rPr')
            rs = rpr.find(W + 'rStyle') if rpr is not None else None
            rs = rs.get(W + 'val') if rs is not None else None
            va = rpr.find(W + 'vertAlign') if rpr is not None else None
            sup = va is not None and va.get(W + 'val') == 'superscript'
            atoms = set()
            if rs in RSTYLE_TAG:
                atoms.add(RSTYLE_TAG[rs])
            col = rpr.find(W + 'color') if rpr is not None else None
            if col is not None and (col.get(W + 'val') or '').upper() == 'FF0000':
                atoms.add('onderwijs')
            hl = rpr.find(W + 'highlight') if rpr is not None else None
            if hl is not None and hl.get(W + 'val') == 'yellow':
                atoms.add('highlight')
            if on(rpr, 'u'):
                atoms.add('onderstreept')
            if rs is None and on(rpr, 'b') and ps != 'GodsStem':
                atoms.add('vet')
            if rs is None and on(rpr, 'i') and ps not in ITALIC_P:
                atoms.add('cursief')
            entries.append((t, atoms, sup, rs in TITLE_R))
        # titel?
        title = ''.join(e[0] for e in entries if e[3])
        m = titel_re.match(title)
        if m:
            cur = int(m.group(1))
            chapters[cur] = []
            entries = [e for e in entries if not e[3]]
        if cur is None:
            continue
        chapters[cur].append(('P',))
        for t, atoms, sup, _ in entries:
            if not t.strip():
                continue
            if sup and re.fullmatch(r'\s*\d+\s*', t):
                chapters[cur].append(('V',))
                continue
            chapters[cur].append((t, atoms))
    return chapters


def count_runs(seq):
    c = {a: 0 for a in TAGS}
    prev = set()
    for e in seq:
        if len(e) == 1:
            prev = set()
            continue
        for a in e[1]:
            if a not in prev:
                c[a] += 1
        prev = e[1]
    return c


def md_tags(text):
    c = {a: 0 for a in TAGS}
    for m in re.finditer(r'\{(\w+)\}', text):
        if m.group(1) in c:
            c[m.group(1)] += 1
    c['highlight'] = text.count('==') // 2
    return c


def strip_md(text):
    out = []
    for ln in text.split('\n'):
        ln = re.sub(r'^# ', '', ln)
        ln = re.sub(r'^@(jezus|god|engel|citaat-ot) ', '', ln)
        ln = re.sub(r'\{/?\w+\}', '', ln)
        ln = ln.replace('==', '')
        ln = re.sub(r'\[(\d+)\]', r'\1', ln)
        out.append(ln)
    return '\n'.join(out)


def docx_plain(path):
    try:
        r = subprocess.run(['textutil', '-convert', 'txt', '-stdout', path], capture_output=True, check=True)
        return r.stdout.decode('utf-8'), 'textutil'
    except Exception:
        root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
        paras = []
        for p in root.iter(W + 'p'):
            paras.append(''.join((c.text or '') for t in p.iter(W + 'r') for c in t if c.tag == W + 't'))
        return '\n'.join(paras), 'eigen XML'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('docx', nargs='?', help='standaard: het sjabloon uit boek.json')
    ap.add_argument('mdmap', nargs='?', help='standaard: boeken/<boek>/bron')
    ap.add_argument('--vergelijk-met')
    ap.add_argument('--boek', help='map in boeken/ (mag weg als er maar één boek is)')
    a = ap.parse_args()
    try:
        boek = boekmod.laad(a.boek)
    except boekmod.BoekFout as e:
        print('FOUT: %s' % e, file=sys.stderr)
        return 2
    if (a.docx is None) != (a.mdmap is None):
        ap.error('geef <docx> en <mdmap> allebei op, of geen van beide')
    if a.docx is None:
        a.docx, a.mdmap = boek.sjabloon, os.path.join(boek.map, 'bron')
    VERZEN = boek.verzen
    naam = re.escape(boek.naam)
    problems = 0

    files = sorted(glob.glob(os.path.join(a.mdmap, boek.prefix + '-*.md')))
    md = {int(re.search(r'(\d+)', os.path.basename(f)).group(1)): open(f, encoding='utf-8').read() for f in files}

    # 1. tekst
    plain, bron = docx_plain(a.docx)
    mdtext = '\n'.join(strip_md(md[k]) for k in sorted(md))
    if len(md) < len(VERZEN):
        # docx kan meer hoofdstukken hebben dan md (--max-hoofdstuk): knip bij het eerste ontbrekende hoofdstuk
        nxt = max(md) + 1
        m = re.search(r'^%s %d\b' % (naam, nxt), plain, re.M)
        if m:
            plain = plain[:m.start()]
    sq = lambda s: re.sub(r'\s+', '', s.replace('​', ''))
    same = sq(plain) == sq(mdtext)
    print('TEKST (zonder witruimte, %s): %s' % (bron, 'GELIJK' if same else 'VERSCHIL'))
    if not same:
        problems += 1
    wp, wm = plain.split(), mdtext.split()
    print('  woorden docx %d, md %d' % (len(wp), len(wm)))
    sm = difflib.SequenceMatcher(None, wp, wm, autojunk=False)
    diffs = [o for o in sm.get_opcodes() if o[0] != 'equal']
    print('  woordverschillen: %d' % len(diffs))
    for tag, i1, i2, j1, j2 in diffs[:40]:
        print('   ', tag, ' '.join(wp[i1:i2]), '=>', ' '.join(wm[j1:j2]))

    # 2. tags
    dr = docx_runs(a.docx, boek.titel_re)
    print('\nTAGS per hoofdstuk (md / docx), alleen afwijkingen en totaal:')
    tot_md = {t: 0 for t in TAGS}
    tot_dx = {t: 0 for t in TAGS}
    for k in sorted(md):
        cm = md_tags(md[k])
        cd = count_runs(dr.get(k, []))
        for t in TAGS:
            tot_md[t] += cm[t]
            tot_dx[t] += cd[t]
            if cm[t] != cd[t]:
                problems += 1
                print('  AFWIJKING H%d %s: md %d, docx %d' % (k, t, cm[t], cd[t]))
    print('  totaal: ' + ', '.join('%s %d/%d' % (t, tot_md[t], tot_dx[t]) for t in TAGS))

    # 3. verzen
    print('\nVERZEN:')
    verses = {}
    for k in sorted(md):
        nums = [int(x) for x in re.findall(r'\[(\d+)\]', md[k])]
        verses[k] = nums
        ok_seq = nums == list(range(1, len(nums) + 1))
        ref = VERZEN[k - 1] if k <= len(VERZEN) else None
        flag = '' if ok_seq and ref == len(nums) else '  <-- AFWIJKING'
        if flag:
            problems += 1
        print('  %s %d: %d verzen (verwacht %s), oplopend 1..n: %s%s' % (boek.naam, k, len(nums), ref, ok_seq, flag))
    print('  totaal: %d' % sum(len(v) for v in verses.values()))
    if a.vergelijk_met:
        o = {int(re.search(r'(\d+)', os.path.basename(f)).group(1)): open(f, encoding='utf-8').read()
             for f in sorted(glob.glob(os.path.join(a.vergelijk_met, boek.prefix + '-*.md')))}
        for k in sorted(set(o) & set(md)):
            on_ = [int(x) for x in re.findall(r'\[(\d+)\]', o[k])]
            print('  vergelijk %s %d: %s' % (boek.naam, k, 'zelfde versnummers' if on_ == verses[k] else 'VERSCHIL'))
            if on_ != verses[k]:
                problems += 1

    # 4. structuur
    print('\nSTRUCTUUR:')
    for k in sorted(md):
        t = md[k]
        if not t.startswith('# %s %d\n\n' % (boek.naam, k)):
            print('  H%d: kop ontbreekt/onjuist' % k); problems += 1
        if '\n\n\n\n' in t:
            print('  H%d: meer dan twee lege regels op rij' % k); problems += 1
        if not t.endswith('\n') or t.endswith('\n\n'):
            print('  H%d: einde van bestand' % k); problems += 1
        for n, ln in enumerate(t.split('\n'), 1):
            stack = []
            body = re.sub(r'^@\S+ ', '', ln)
            for m in re.finditer(r'\{(/?)(\w+)\}|(==)|\[(\d+)\]', body):
                if m.group(4):
                    if stack:
                        print('  H%d regel %d: tag %s open over versnummer %s' % (k, n, stack, m.group(4))); problems += 1
                        stack = []
                elif m.group(3):
                    if stack and stack[-1] == '==':
                        stack.pop()
                    else:
                        stack.append('==')
                elif m.group(1) == '':
                    stack.append(m.group(2))
                else:
                    if stack and stack[-1] == m.group(2):
                        stack.pop()
                    else:
                        print('  H%d regel %d: tag {/%s} sluit niet netjes (stapel %s)' % (k, n, m.group(2), stack)); problems += 1
                        break
            else:
                if stack:
                    print('  H%d regel %d: tags niet gesloten %s' % (k, n, stack)); problems += 1
    print('\nTOTAAL AANTAL PROBLEMEN: %d' % problems)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
