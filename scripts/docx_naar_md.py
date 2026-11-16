#!/usr/bin/env python3
"""Zet het Word-document van een boek om naar Markdown met opmaak-tags (FORMAAT.md).

Gebruik:
    python3 -I scripts/docx_naar_md.py [--boek lukas] [<docx> <uitvoermap>] [--max-hoofdstuk N]

Zonder <docx> en <uitvoermap>: het sjabloon uit boek.json naar bijbel/<boek>/bron/.
Schrijft <uitvoermap>/<prefix>-NN.md per hoofdstuk (bv. lukas-01.md). Alleen standaardbibliotheek.

Hoe de Word-opmaak wordt gelezen (zie ook FORMAAT.md):
  * Hoofdstuktitel: tekenstijl `Bblhfdstk` (of `HoofdsukChar`), tekst "<Naam> N" (naam uit
    boek.json, bv. "Lukas 1"), inline aan het begin van de eerste alinea van het hoofdstuk.
    Wordt `# Lukas N`.
  * Versnummer: eigen run met `<w:vertAlign w:val="superscript"/>` en alleen cijfers, zonder
    rStyle. Soms met een nbsp erachter, soms over twee runs gesplitst ("5" + "1 Hij ...") of
    als gewone tekst ("... vader. 60 Maar"). Herkenning gaat daarom op volgorde: per hoofdstuk
    wordt steeds het volgende verwachte nummer (1, 2, 3, ...) gezocht.
  * Alineastijl (`w:pStyle`) -> voorvoegsel (@jezus, @god, @engel, @citaat-ot).
  * Tekenstijl (`w:rStyle`) -> {domein}...{/domein}.
  * Directe rode letterkleur FF0000 -> {onderwijs}; gele markering -> ==...==.
  * Directe vet / onderstreept / cursief (zonder tekenstijl) -> {vet} / {onderstreept} /
    {cursief}.
  * Opmaakreeksen worden op tekenniveau samengevoegd; witruimte tussen twee gelijk opgemaakte
    stukken telt mee in de opmaak, witruimte aan de rand van een reeks valt erbuiten.
  * Verzen staan altijd buiten tags: een tag die over een versnummer loopt wordt gesloten
    voor `[n]` en daarna opnieuw geopend.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402
import xml.etree.ElementTree as ET  # noqa: E402
from formaat import (  # noqa: E402
    BOLD_PSTYLES, HIGHLIGHT, HIGHLIGHT_TEKEN, ITALIC_PSTYLES, ORDER, RED, TAG_OF_PSTYLE, TAG_OF_RSTYLE,
    TITLE_STYLE, TITLE_STYLES_READ, MAX_BLANK_LINES,
)

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

RANK = {a: i for i, a in enumerate(ORDER)}

VERSE = 'VERSE'  # item-soort voor een versnummer


class Ctx:
    def __init__(self):
        self.warnings = []   # (hoofdstuk, vers, tekst)
        self.onbekende = {}    # soort -> teller
        self.notes = {}      # informatieve tellers

    def warn(self, ch, vs, msg):
        self.warnings.append((ch, vs, msg))

    def onbekend(self, what):
        self.onbekende[what] = self.onbekende.get(what, 0) + 1

    def note(self, what, n=1):
        self.notes[what] = self.notes.get(what, 0) + n


def is_on(rpr, name):
    el = rpr.find(W + name) if rpr is not None else None
    if el is None:
        return False
    return el.get(W + 'val') not in ('0', 'false', 'off', 'none')


def run_atoms(rpr, pstyle, ctx):
    """Opmaak-atomen van een run, als set van tagnamen."""
    atoms = set()
    rstyle = None
    if rpr is not None:
        rs = rpr.find(W + 'rStyle')
        if rs is not None:
            rstyle = rs.get(W + 'val')
    if rstyle in TAG_OF_RSTYLE:
        atoms.add(TAG_OF_RSTYLE[rstyle])
    elif rstyle is not None and rstyle not in TITLE_STYLES_READ:
        ctx.onbekend('rStyle ' + rstyle)
    if rpr is not None:
        col = rpr.find(W + 'color')
        if col is not None:
            v = (col.get(W + 'val') or '').upper()
            if v == 'FF0000':
                atoms.add(RED)
            elif v not in ('AUTO', '000000', ''):
                ctx.onbekend('kleur ' + v)
        hl = rpr.find(W + 'highlight')
        if hl is not None and hl.get(W + 'val') != 'none':
            if hl.get(W + 'val') == 'yellow':
                atoms.add(HIGHLIGHT)
            else:
                ctx.onbekend('markering ' + str(hl.get(W + 'val')))
        if is_on(rpr, 'u'):
            atoms.add('onderstreept')
        if rstyle is None:
            if is_on(rpr, 'b') and pstyle not in BOLD_PSTYLES:
                atoms.add('vet')
            if is_on(rpr, 'i') and pstyle not in ITALIC_PSTYLES:
                atoms.add('cursief')
            if (rpr.find(W + 'i') is not None and not is_on(rpr, 'i')
                    and pstyle in ITALIC_PSTYLES):
                ctx.onbekend('recht in cursieve alinea (niet gecodeerd)')
        for el in rpr:
            n = el.tag.replace(W, '')
            if n in ('strike', 'dstrike', 'smallCaps', 'caps', 'shd') and is_on(rpr, n):
                ctx.onbekend('run-eigenschap ' + n)
    return frozenset(atoms)


class Ch:
    """Een Word-teken met opmaak."""
    __slots__ = ('teken', 'atoms', 'sup', 'title')

    def __init__(self, teken, atoms, sup, title):
        self.teken = teken
        self.atoms = atoms
        self.sup = sup
        self.title = title


def read_paragraphs(path, ctx):
    try:
        root = ET.fromstring(boekmod.lees_docx_onderdeel(path, 'word/document.xml'))
    except ET.ParseError as fout:
        raise boekmod.BoekFout('%s: word/document.xml is niet welgevormd: %s' % (path, fout))
    for el in root.iter():
        n = el.tag.replace(W, '')
        if n in ('footnoteReference', 'endnoteReference'):
            ctx.onbekend(n)
        elif n in ('tbl', 'drawing', 'pict', 'object', 'ins', 'del', 'hyperlink', 'sdt'):
            ctx.onbekend('element ' + n)
    paras = []
    for p in root.iter(W + 'p'):
        ps_el = p.find(W + 'pPr/' + W + 'pStyle')
        pstyle = ps_el.get(W + 'val') if ps_el is not None else None
        if pstyle is not None and pstyle not in TAG_OF_PSTYLE:
            ctx.onbekend('pStyle ' + pstyle)
        chars = []
        for r in p.iter(W + 'r'):
            rpr = r.find(W + 'rPr')
            sup = False
            title = False
            if rpr is not None:
                va = rpr.find(W + 'vertAlign')
                sup = va is not None and va.get(W + 'val') == 'superscript'
                rs = rpr.find(W + 'rStyle')
                title = rs is not None and rs.get(W + 'val') in TITLE_STYLES_READ
            atoms = run_atoms(rpr, pstyle, ctx)
            for c in r:
                if c.tag == W + 't':
                    for ch in (c.text or ''):
                        chars.append(Ch(ch, atoms, sup, title))
                elif c.tag == W + 'br':
                    if c.get(W + 'type') in (None, 'textWrapping'):
                        ctx.note('regeleinde (w:br) als spatie')
                        chars.append(Ch(' ', atoms, sup, title))
                    else:
                        ctx.note('paginaeinde genegeerd')
                elif c.tag == W + 'tab':
                    chars.append(Ch(' ', atoms, sup, title))
                elif c.tag in (W + 'rPr', W + 'lastRenderedPageBreak', W + 'proofErr'):
                    pass
                else:
                    ctx.onbekend('run-kind ' + c.tag.replace(W, ''))
        paras.append((pstyle, chars))
    return paras


def split_chapters(paras, ctx, titel_re):
    """-> lijst van (hoofdstuknr, [(pstyle, chars)])"""
    chapters = []
    cur = None
    for pstyle, chars in paras:
        tchars = [i for i, c in enumerate(chars) if c.title]
        if tchars:
            title = ''.join(chars[i].teken for i in tchars)
            m = titel_re.match(title)
            first_non_ws = next((i for i, c in enumerate(chars) if not c.teken.isspace()), None)
            if not m or first_non_ws != tchars[0]:
                ctx.warn(None, None, 'hoofdstuktitel niet aan het begin van de alinea of onleesbaar: %r' % title)
                chars = [c for c in chars if not c.title]
            else:
                num = int(m.group(1))
                chars = [c for i, c in enumerate(chars) if i not in set(tchars)]
                cur = (num, [])
                chapters.append(cur)
                if len(chapters) > 1 and num != chapters[-2][0] + 1:
                    ctx.warn(num, None, 'hoofdstuk volgt niet op %d' % chapters[-2][0])
        if cur is None:
            if any(not c.teken.isspace() for c in chars):
                ctx.warn(None, None, 'tekst voor het eerste hoofdstuktitel genegeerd')
            continue
        cur[1].append((pstyle, chars))
    return chapters


def tokenize_verses(chapter_no, paras, ctx):
    """Vervangt versnummers door VERSE-items. -> lijst van (pstyle, items); items zijn Ch of (VERSE, n)."""
    expected = 1
    out = []
    for pstyle, chars in paras:
        items = []
        i = 0
        n = len(chars)
        while i < n:
            ch = chars[i]
            if ch.sup and (ch.teken.isdigit() or ch.teken.isspace()):
                j = i
                while j < n and chars[j].sup and (chars[j].teken.isdigit() or chars[j].teken.isspace()):
                    j += 1
                digits = ''.join(c.teken for c in chars[i:j] if c.teken.isdigit())
                if digits == '':
                    for c in chars[i:j]:
                        items.append(Ch(' ', frozenset(), False, False))
                    i = j
                    continue
                val = int(digits)
                if val == expected:
                    items.append((VERSE, val))
                    expected += 1
                    i = j
                    continue
                es = str(expected)
                if es.startswith(digits) and len(es) > len(digits):
                    rest = es[len(digits):]
                    tail = ''.join(c.teken for c in chars[j:j + len(rest)])
                    nxt = chars[j + len(rest)] if j + len(rest) < n else None
                    if tail == rest and (nxt is None or not nxt.teken.isdigit()):
                        items.append((VERSE, expected))
                        ctx.note('versnummer over twee runs (superscript + gewone tekst)')
                        ctx.warn(chapter_no, expected, 'versnummer gesplitst %r + %r samengevoegd' % (digits, rest))
                        expected += 1
                        i = j + len(rest)
                        continue
                ctx.warn(chapter_no, expected - 1,
                         'superscript %r gevonden, verwacht %d: als gewone tekst behouden' % (digits, expected))
                for c in chars[i:j]:
                    items.append(Ch(c.teken, c.atoms, False, False))
                i = j
                continue
            # gewone tekst: verwacht versnummer als platte cijfers?
            if ch.teken.isdigit() and (i == 0 or not chars[i - 1].teken.isdigit()):
                j = i
                while j < n and chars[j].teken.isdigit():
                    j += 1
                if int(''.join(c.teken for c in chars[i:j])) == expected and (i == 0 or not chars[i - 1].teken.isalnum()):
                    items.append((VERSE, expected))
                    ctx.note('versnummer als gewone tekst (niet superscript)')
                    ctx.warn(chapter_no, expected, 'versnummer als gewone tekst herkend (niet superscript)')
                    expected += 1
                    i = j
                    continue
            items.append(Ch(ch.teken, ch.atoms, False, False))
            i += 1
        out.append((pstyle, items))
    return out, expected - 1


OPEN_QUOTES = '“‘(["\''


def normalize_items(items):
    """Witruimte normaliseren en opmaak van witruimte afleiden uit de buren."""
    # 1. witruimte -> spatie, verzamel
    seq = []
    for it in items:
        if isinstance(it, Ch):
            if it.teken.isspace() or it.teken == '​':
                seq.append(Ch(' ', None, False, False))   # atoms nog onbekend
            else:
                seq.append(it)
        else:
            seq.append(it)
    # 2. spatie voor/na versnummer garanderen
    spaced = []
    for k, it in enumerate(seq):
        if not isinstance(it, Ch):
            if spaced:
                prev = spaced[-1]
                if isinstance(prev, Ch) and prev.teken != ' ':
                    last_is_open = prev.teken in OPEN_QUOTES and (len(spaced) < 2 or (isinstance(spaced[-2], Ch) and spaced[-2].teken == ' ') or not isinstance(spaced[-2], Ch))
                    if not last_is_open:
                        spaced.append(Ch(' ', None, False, False))
                elif not isinstance(prev, Ch):
                    spaced.append(Ch(' ', None, False, False))
            spaced.append(it)
            nxt = seq[k + 1] if k + 1 < len(seq) else None
            if isinstance(nxt, Ch) and nxt.teken != ' ':
                spaced.append(Ch(' ', None, False, False))
        else:
            spaced.append(it)
    # 3. spaties samenvouwen, kop/staart weg
    folded = []
    for it in spaced:
        if isinstance(it, Ch) and it.teken == ' ' and folded and isinstance(folded[-1], Ch) and folded[-1].teken == ' ':
            continue
        folded.append(it)
    while folded and isinstance(folded[0], Ch) and folded[0].teken == ' ':
        folded.pop(0)
    while folded and isinstance(folded[-1], Ch) and folded[-1].teken == ' ':
        folded.pop()
    # 4. atomen van spaties = doorsnede van de dichtstbijzijnde niet-spatie-buren
    n = len(folded)
    left = [None] * n
    cur = frozenset()
    have = False
    for k, it in enumerate(folded):
        if isinstance(it, Ch) and it.teken == ' ':
            left[k] = cur if have else frozenset()
        else:
            cur = it.atoms if isinstance(it, Ch) else frozenset()
            have = True
            left[k] = cur
    right = [None] * n
    cur = frozenset()
    have = False
    for k in range(n - 1, -1, -1):
        it = folded[k]
        if isinstance(it, Ch) and it.teken == ' ':
            right[k] = cur if have else frozenset()
        else:
            cur = it.atoms if isinstance(it, Ch) else frozenset()
            have = True
            right[k] = cur
    result = []
    for k, it in enumerate(folded):
        if isinstance(it, Ch):
            if it.teken == ' ':
                result.append((' ', left[k] & right[k]))
            else:
                result.append((it.teken, it.atoms))
        else:
            result.append((VERSE, it[1]))
    return result


def render_items(items, chapter_no, ctx, verse_start):
    """items: lijst van (teken, atoms) of (VERSE, n). -> (tekst, laatste vers)"""
    out = []
    stack = []
    verse = verse_start
    prev_char = None

    def mark(a, opening):
        if a == HIGHLIGHT:
            return HIGHLIGHT_TEKEN
        return '{%s}' % a if opening else '{/%s}' % a

    for k, (c, atoms) in enumerate(items):
        if c == VERSE:
            while stack:
                out.append(mark(stack.pop(), False))
            out.append('[%d]' % atoms)
            verse = atoms
            prev_char = None
            continue
        # sluiten wat niet meer geldt (en alles wat daarbinnen openstaat)
        cut = None
        for pos, a in enumerate(stack):
            if a not in atoms:
                cut = pos
                break
        boundary = False
        if cut is not None:
            while len(stack) > cut:
                out.append(mark(stack.pop(), False))
            boundary = True
        new = sorted((a for a in atoms if a not in stack), key=lambda a: RANK[a])
        for a in new:
            out.append(mark(a, True))
            stack.append(a)
            boundary = True
        if boundary and prev_char is not None and prev_char.isalpha() and c.isalpha():
            ctx.warn(chapter_no, verse, 'opmaakgrens midden in een woord bij %r (halve-woordmarkering behouden)' %
                     (''.join(x[0] for x in items[max(0, k - 12):k + 12] if x[0] != VERSE)))
        out.append(c)
        prev_char = c
    while stack:
        out.append(mark(stack.pop(), False))
    return ''.join(out), verse


def convert_chapter(naam, num, paras, ctx):
    tokens, last_verse = tokenize_verses(num, paras, ctx)
    lines = []     # str; '' = lege regel
    verse = 0
    for pstyle, items in tokens:
        norm = normalize_items(items)
        if not norm:
            lines.append('')
            continue
        text, verse = render_items(norm, num, ctx, verse)
        tag = TAG_OF_PSTYLE.get(pstyle)
        lines.append(('@' + tag + ' ' if tag else '') + text)
    # lege regels: kop/staart weg, maximaal twee op rij
    out = []
    blanks = 0
    for ln in lines:
        if ln == '':
            blanks += 1
            continue
        if out:
            out.extend([''] * min(blanks, MAX_BLANK_LINES))
        blanks = 0
        out.append(ln)
    md = '# %s %d\n\n%s\n' % (naam, num, '\n'.join(out))
    return md, last_verse


def schrijf_hoofdstukken(boek, chapters, ctx, args):
    try:
        os.makedirs(args.uitvoermap, exist_ok=True)
        for num, cp in chapters:
            if args.max_hoofdstuk is not None and num > args.max_hoofdstuk:
                continue
            md, last = convert_chapter(boek.naam, num, cp, ctx)
            path = os.path.join(args.uitvoermap, boek.bestandsnaam(num))
            with open(path, 'w', encoding='utf-8') as f:
                f.write(md)
            print('%s: %d verzen' % (boek.bestandsnaam(num), last))
    except OSError as fout:
        raise boekmod.BoekFout('kan niet schrijven: %s' % fout)


def main(argv=None):
    ap = argparse.ArgumentParser(description='Word (.docx) -> Markdown met opmaak-tags')
    ap.add_argument('docx', nargs='?', help='standaard: het sjabloon uit boek.json')
    ap.add_argument('uitvoermap', nargs='?', help='standaard: bijbel/<boek>/bron')
    ap.add_argument('--boek', help='map in bijbel/ (mag weg als er maar één boek is)')
    ap.add_argument('--max-hoofdstuk', type=int, default=None,
                    help='schrijf alleen hoofdstukken t/m dit nummer')
    args = ap.parse_args(argv)
    if (args.docx is None) != (args.uitvoermap is None):
        ap.error('geef <docx> en <uitvoermap> allebei op, of geen van beide')
    try:
        boek = boekmod.laad(args.boek)
        if args.docx is None:
            args.docx = boek.sjabloon
            args.uitvoermap = os.path.join(boek.map, 'bron')
        ctx = Ctx()
        paras = read_paragraphs(args.docx, ctx)
        chapters = split_chapters(paras, ctx, boek.titel_re)
        if not chapters:
            raise boekmod.BoekFout('geen hoofdstuktitels ("%s N" in tekenstijl %s) gevonden in %s' % (boek.naam, TITLE_STYLE, args.docx))
        schrijf_hoofdstukken(boek, chapters, ctx, args)
    except boekmod.BoekFout as fout:
        print('FOUT: %s' % fout, file=sys.stderr)
        return 2
    for k in sorted(ctx.onbekende):
        print('ONBEKENDE OPMAAK (genegeerd): %s x%d' % (k, ctx.onbekende[k]), file=sys.stderr)
    for k in sorted(ctx.notes):
        print('NOTITIE: %s x%d' % (k, ctx.notes[k]), file=sys.stderr)
    for ch, vs, msg in ctx.warnings:
        if args.max_hoofdstuk is not None and ch is not None and ch > args.max_hoofdstuk:
            continue
        loc = ('%s:%s' % (ch, vs)) if ch is not None else '?'
        print('WAARSCHUWING %s: %s' % (loc, msg), file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
