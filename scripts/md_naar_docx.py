#!/usr/bin/env python3
"""Markdown (met opmaak-tags) -> Word (.docx), alleen standaardbibliotheek.

Het originele Word-document is het stijlsjabloon: alle onderdelen van dat
.docx (styles, theme, header/footer, numbering, settings, ...) worden
ongewijzigd overgenomen; alleen word/document.xml wordt vervangen.

Gebruik (draai met `python3 -I`, vanuit de hoofdmap; B = bijbel/lukas):

  python3 -I scripts/md_naar_docx.py doc $B/bron/lukas-01.md [meer.md ...] -o $B/export/lukas-01.docx

  python3 -I scripts/md_naar_docx.py review \
      --bron $B/bron/lukas-01.md --nieuw $B/vereenvoudigd/lukas-01.md \
      [--log $B/wijzigingslog/lukas-01.md] -o $B/export/lukas-01-review.docx

  # meerdere hoofdstukken: herhaal --bron/--nieuw/--log, of gebruik een bereik
  python3 -I scripts/md_naar_docx.py review --hoofdstuk 1-3 -o $B/export/lukas-01-03-review.docx

Het boek (sjabloon, naam, mappen) komt uit bijbel/<boek>/boek.json. Geef `--boek lukas`
vóór het subcommando op; het mag weg zolang er maar één boek in bijbel/ staat.

Invoerformaat: zie FORMAAT.md.
"""

import argparse
import os
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree
from xml.sax.saxutils import escape

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402

BOEK = None  # wordt in main() gezet (boek.json): sjabloon, naam, mappen

# ---------------------------------------------------------------------------
# Tags -> Word
# ---------------------------------------------------------------------------

PARA_STYLES = {  # @tag -> pStyle
    "jezus": "Jezuswoorden",
    "god": "GodsStem",
    "engel": "engelenwoord",
    "citaat-ot": "citaatOT",
}
CHAR_STYLES = {  # {tag} -> rStyle
    "eeuwigleven": "eeuwigleven",
    "genade": "genade",
    "geloof": "geloof",
    "oordeel": "oordeel",
    "rechtvaardig": "rechtvaardig",
    "zonde": "zonde",
    "torah": "Torah",
    "dag": "dag",
}
DIRECT = {"vet", "cursief", "onderstreept"}  # directe Word-opmaak zonder eigen stijl (aanvulling van docx_naar_md.py)
RED = "onderwijs"  # {onderwijs} -> w:color FF0000
HIGHLIGHT = "=="  # ==...== -> w:highlight yellow

TAG_RE = re.compile(r"\{(/?)([^{}\s]*)\}|==|\[(\d+)\]")
INVALID_XML_RE = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f￾￿]")


class MdError(Exception):
    pass


def _fout(pad, regelnr, msg):
    return MdError(f"{pad}:{regelnr}: {msg}")


# ---------------------------------------------------------------------------
# Parsen van de Markdown
# ---------------------------------------------------------------------------
# Een alinea = {"soort": "leeg"|"tekst"|"titel", "pstyle": str|None,
#               "segs": [("tekst", tags) | ("vers", n, tags)], "regel": int}
# `tags` is een tuple van actieve tags in volgorde van openen ("==" = highlight).


def parse_inline(tekst, pad, regelnr):
    segs = []
    actief = []  # lijst van tags
    pos = 0
    for m in TAG_RE.finditer(tekst):
        if m.start() > pos:
            segs.append(("tekst", tekst[pos:m.start()], tuple(actief)))
        pos = m.end()
        if m.group(3) is not None:
            segs.append(("vers", int(m.group(3)), tuple(actief)))
        elif m.group(0) == HIGHLIGHT:
            if HIGHLIGHT in actief:
                actief.remove(HIGHLIGHT)
            else:
                actief.append(HIGHLIGHT)
        else:
            sluit, naam = m.group(1) == "/", m.group(2)
            if naam not in CHAR_STYLES and naam not in DIRECT and naam != RED:
                raise _fout(pad, regelnr, f"onbekende tag {m.group(0)!r}")
            if sluit:
                if naam not in actief:
                    raise _fout(pad, regelnr, f"{m.group(0)} sluit een tag die niet open staat")
                actief.remove(naam)
            else:
                if naam in actief:
                    raise _fout(pad, regelnr, f"{{{naam}}} staat al open (geneste dubbele tag)")
                actief.append(naam)
    if pos < len(tekst):
        segs.append(("tekst", tekst[pos:], tuple(actief)))
    if actief:
        open_ = ", ".join("==" if t == HIGHLIGHT else "{" + t + "}" for t in actief)
        raise _fout(pad, regelnr, f"tag(s) niet gesloten aan het eind van de alinea: {open_}")
    return segs


def parse_md(pad):
    """Geeft de lijst alinea's van een md-bestand."""
    pad = Path(pad)
    try:
        tekst = pad.read_text(encoding="utf-8-sig")
    except OSError as e:
        raise MdError(f"{pad}: kan niet lezen: {e}")
    regels = tekst.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    if regels and regels[-1] == "":
        regels.pop()  # slot-newline is geen lege alinea
    alineas = []
    for nr, regel in enumerate(regels, 1):
        if INVALID_XML_RE.search(regel):
            raise _fout(pad, nr, "bevat een ongeldig stuurteken")
        if regel.strip() == "":
            alineas.append({"soort": "leeg", "pstyle": None, "segs": [], "regel": nr})
            continue
        if regel.startswith("#"):
            m = re.match(r"^# (\S.*?)\s*$", regel)
            if not m:
                raise _fout(pad, nr, "alleen '# Titel' wordt ondersteund (bv. '# Lukas 1')")
            alineas.append({"soort": "titel", "pstyle": None, "titel": m.group(1),
                            "segs": [], "regel": nr})
            continue
        pstyle = None
        m = re.match(r"^@(\S+)(?:\s+|$)", regel)
        if m:
            if m.group(1) not in PARA_STYLES:
                raise _fout(pad, nr, f"onbekende alineatag '@{m.group(1)}'")
            pstyle = PARA_STYLES[m.group(1)]
            regel = regel[m.end():]
        alineas.append({"soort": "tekst", "pstyle": pstyle,
                        "segs": parse_inline(regel, pad, nr), "regel": nr})
    return alineas


# ---------------------------------------------------------------------------
# XML-bouwstenen
# ---------------------------------------------------------------------------


def rpr_xml(tags, extra_sz=None, superscript=False, bold=False, italic=False,
            color=None, verse=False):
    """w:rPr in schema-volgorde: rStyle, b, i, color, sz, highlight, u, vertAlign."""
    rstyle = None
    for t in tags:
        if t in CHAR_STYLES:
            if rstyle is not None:
                sys.stderr.write(f"waarschuwing: geneste begripsdomeinen, '{t}' wint van '{rstyle}'\n")
            rstyle = CHAR_STYLES[t]
    delen = []
    if rstyle and not verse:
        delen.append(f'<w:rStyle w:val="{rstyle}"/>')
    if bold or "vet" in tags:
        delen.append("<w:b/><w:bCs/>")
    if italic or "cursief" in tags:
        delen.append("<w:i/><w:iCs/>")
    if RED in tags:
        delen.append('<w:color w:val="FF0000"/>')
    elif color:
        delen.append(f'<w:color w:val="{color}"/>')
    if extra_sz:
        delen.append(f'<w:sz w:val="{extra_sz}"/><w:szCs w:val="{extra_sz}"/>')
    if HIGHLIGHT in tags:
        delen.append('<w:highlight w:val="yellow"/>')
    if "onderstreept" in tags:
        delen.append('<w:u w:val="single"/>')
    if superscript:
        delen.append('<w:vertAlign w:val="superscript"/>')
    return f"<w:rPr>{''.join(delen)}</w:rPr>" if delen else ""


def run_xml(tekst, rpr=""):
    if tekst == "":
        return ""
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(tekst)}</w:t></w:r>'


def segs_xml(segs, sz=None, vers_zichtbaar=True):
    """Runs voor een lijst segmenten. Versnummer: eigen superscript-run, zoals in het origineel."""
    uit = []
    for seg in segs:
        if seg[0] == "tekst":
            uit.append(run_xml(seg[1], rpr_xml(seg[2], extra_sz=sz)))
        elif vers_zichtbaar:
            uit.append(run_xml(str(seg[1]), rpr_xml(seg[2], extra_sz=sz, superscript=True, verse=True)))
    return "".join(uit)


def ppr_xml(pstyle=None, extra=""):
    inhoud = (f'<w:pStyle w:val="{pstyle}"/>' if pstyle else "") + extra
    return f"<w:pPr>{inhoud}</w:pPr>" if inhoud else ""


def para_xml(inhoud="", pstyle=None, ppr_extra=""):
    return f"<w:p>{ppr_xml(pstyle, ppr_extra)}{inhoud}</w:p>"


# ---------------------------------------------------------------------------
# doc-modus
# ---------------------------------------------------------------------------


SECTIESCHEIDING = ('<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="1" '
                   'w:color="auto"/></w:pBdr></w:pPr></w:p>')


def body_doc(alineas_per_bestand):
    """Doorlopend document zoals het origineel."""
    uit = []
    for bestand_nr, alineas in enumerate(alineas_per_bestand):
        if bestand_nr > 0 and uit and uit[-1] not in ("<w:p/>", SECTIESCHEIDING):
            uit.append("<w:p/>")  # scheiding tussen hoofdstukken
        i = 0
        while i < len(alineas):
            a = alineas[i]
            if a["soort"] == "leeg":
                # Eén lege regel = één lege alinea. Twee (of meer) lege regels = sectiescheiding:
                # een lege alinea gevolgd door een lege alinea met rand erboven (zoals in het origineel).
                n = 0
                while i + n < len(alineas) and alineas[i + n]["soort"] == "leeg":
                    n += 1
                if n == 1:
                    uit.append("<w:p/>")
                else:
                    uit.extend(["<w:p/>"] * (n - 1))
                    uit.append(SECTIESCHEIDING)
                i += n
                continue
            elif a["soort"] == "titel":
                titel_run = run_xml(a["titel"], '<w:rPr><w:rStyle w:val="Bblhfdstk"/></w:rPr>')
                # In het origineel staat 'Lukas N' inline aan het begin van de eerste alinea.
                # Zoek de eerstvolgende niet-lege regel; samenvoegen als die geen alineastijl heeft.
                j = i + 1
                while j < len(alineas) and alineas[j]["soort"] == "leeg":
                    j += 1
                if j < len(alineas) and alineas[j]["soort"] == "tekst" and alineas[j]["pstyle"] is None:
                    volgende = alineas[j]
                    uit.append(para_xml(titel_run + run_xml(" ") + segs_xml(volgende["segs"])))
                    i = j  # tussenliggende lege regels en de tekstregel zijn opgegaan in de titel
                else:
                    uit.append(para_xml(titel_run))
            else:
                uit.append(para_xml(segs_xml(a["segs"]), a["pstyle"]))
            i += 1
    return "".join(uit)


# ---------------------------------------------------------------------------
# review-modus
# ---------------------------------------------------------------------------


def hoofdstuk_nummer(alineas, pad):
    for a in alineas:
        if a["soort"] == "titel":
            m = re.search(r"(\d+)", a["titel"])
            if m:
                return int(m.group(1))
    m = re.search(r"(\d+)", Path(pad).stem)
    return int(m.group(1)) if m else None


def split_verzen(alineas):
    """Geeft {(vers, volgnr): [(pstyle, segs), ...]} in volgorde van voorkomen.

    Een vers kan over meerdere alinea's lopen; elke alinea-bijdrage is een aparte celalinea.
    Tekst voor het eerste versnummer komt onder vers 0.
    """
    verzen = {}
    teller = {}
    huidig = None
    for a in alineas:
        if a["soort"] != "tekst":
            continue
        stuk = []  # segs van dit vers in deze alinea

        for seg in a["segs"]:
            if seg[0] == "vers":
                if huidig is not None and stuk:
                    verzen[huidig].append((a["pstyle"], stuk))
                n = seg[1]
                teller[n] = teller.get(n, 0) + 1
                huidig = (n, teller[n])
                verzen.setdefault(huidig, [])
                stuk = []
            else:
                if huidig is None:
                    huidig = (0, 1)
                    verzen.setdefault(huidig, [])
                stuk.append(seg)
        if huidig is not None and stuk:
            verzen[huidig].append((a["pstyle"], stuk))
    # nette randen: witruimte aan begin/eind van elke celalinea, lege stukken weg
    for sleutel, stukken in verzen.items():
        schoon = []
        for pstyle, segs in stukken:
            segs = [list(s) for s in segs]
            while segs and segs[0][1].strip() == "":
                segs.pop(0)
            while segs and segs[-1][1].strip() == "":
                segs.pop()
            if not segs:
                continue
            segs[0][1] = segs[0][1].lstrip()
            segs[-1][1] = segs[-1][1].rstrip()
            schoon.append((pstyle, [tuple(s) for s in segs]))
        verzen[sleutel] = schoon
    return verzen


def platte_tekst(stukken):
    tekst = " ".join(s[1] for _, segs in stukken for s in segs)
    return re.sub(r"\s+", " ", tekst).strip()


def parse_log(pad):
    """Geeft ({vers: {"wijz": [..], "vraag": [..], "label": str}}, [globale vragen]) uit een wijzigingslog.

    Globale vragen = items onder een kop '## Vragen aan redactie' (genummerde of bullet-lijst).
    """
    pad = Path(pad)
    try:
        regels = pad.read_text(encoding="utf-8-sig").splitlines()
    except OSError as e:
        raise MdError(f"{pad}: kan niet lezen: {e}")
    entries = {}
    secties = []  # (verzen, [regels])
    huidig = None
    globaal = []
    in_vragen = False
    for regel in regels:
        if re.match(r"^##\s+Vragen\b", regel, re.I):
            in_vragen, huidig = True, None
            continue
        if in_vragen and not regel.startswith("#"):
            m = re.match(r"^(?:\d+\.|[-*])\s+(.*)$", regel)
            if m:
                globaal.append(m.group(1).strip())
            elif regel.strip() and globaal and regel.startswith((" ", "\t")):
                globaal[-1] += " " + regel.strip()
            continue
        if regel.startswith("#"):
            in_vragen = False
        m = re.match(r"^##\s+Vers\s+(\d+)(?:\s*[-\u2013\u2014]\s*(\d+))?\s*:?\s*$", regel, re.I)
        if m:
            a = int(m.group(1))
            b = int(m.group(2)) if m.group(2) else a
            huidig = (list(range(a, b + 1)), [])
            secties.append(huidig)
        elif regel.startswith("#"):
            huidig = None
        elif huidig is not None:
            huidig[1].append(regel)
    for verzen, inhoud in secties:
        sleutel = None
        wijz, vraag = [], []
        for regel in inhoud:
            m = re.match(r"^[-*]\s+\*\*(.+?):?\*\*:?\s*(.*)$", regel)
            if m:
                naam = m.group(1).strip().lower().rstrip(":")
                rest = m.group(2).strip()
                if naam.startswith("wijziging"):
                    sleutel = "wijz"
                elif naam.startswith("twijfel") or "vraag" in naam:
                    sleutel = "vraag"
                else:
                    sleutel = None  # Bron / Nieuw: niet nodig in het reviewdocument
                if sleutel and rest:
                    (wijz if sleutel == "wijz" else vraag).append(rest)
                continue
            if sleutel is None or not regel.strip():
                continue
            m = re.match(r"^\s+[-*]\s+(.*)$", regel)
            if m:
                (wijz if sleutel == "wijz" else vraag).append(m.group(1).strip())
            else:  # voortzetting van de vorige regel
                doel = wijz if sleutel == "wijz" else vraag
                if doel:
                    doel[-1] += " " + regel.strip()
                else:
                    doel.append(regel.strip())
        vraag = [v for v in vraag if v.strip("() ").lower() not in
                 ("", "optioneel", "geen", "nee", "n.v.t.", "nvt", "-", "\u2014")]
        for k, n in enumerate(verzen):
            label = f"vers {verzen[0]}–{verzen[-1]}" if len(verzen) > 1 else ""
            if k == 0:
                entries[n] = {"wijz": wijz, "vraag": vraag, "label": label}
            else:
                entries[n] = {"wijz": [], "vraag": [], "label": "",
                              "zie": f"zie bij vers {verzen[0]}"}
    return entries, globaal


# --- celinhoud --------------------------------------------------------------

CEL_SZ = None  # standaard grootte uit het origineel (11 pt) voor Bron/Vereenvoudigd
LOG_SZ = 18  # 9 pt voor de wijzigingen-kolom
CEL_PPR = '<w:spacing w:before="0" w:after="60"/><w:ind w:left="0" w:firstLine="0"/>'
GEEN_RAND = ('<w:pBdr>' + "".join(
    f'<w:{k} w:val="nil"/>'
    for k in ("top", "left", "bottom", "right")) + '</w:pBdr>')


def cel_para(pstyle, segs):
    """Celalinea met de alineastijl; inspringing en kader worden in de cel opgeheven.

    De pStyle blijft staan (kleur, cursief, lettertype komen uit de stijl); alleen
    w:ind (inspringing), w:spacing en de kader van Jezuswoorden worden overschreven.
    """
    extra = (GEEN_RAND if pstyle == "Jezuswoorden" else "") + CEL_PPR
    return para_xml(segs_xml(segs, sz=CEL_SZ, vers_zichtbaar=True), pstyle, extra)


def cel_tekst(inhoud, stukken, ontbreekt=False, kleur_vers=None):
    if ontbreekt:
        return para_xml(run_xml("ONTBREEKT", rpr_xml((), bold=True, color="FF0000")), None, CEL_PPR)
    if not stukken:
        return para_xml("", None, CEL_PPR)
    return "".join(cel_para(p, s) for p, s in stukken)


def md_inline(tekst, sz):
    """Mini-markdown voor de wijzigingen-kolom: **vet**, `code` zonder tekens."""
    uit = []
    for deel in re.split(r"(\*\*.+?\*\*)", tekst):
        if deel.startswith("**") and deel.endswith("**") and len(deel) > 4:
            uit.append(run_xml(deel[2:-2].replace("`", ""), rpr_xml((), extra_sz=sz, bold=True)))
        else:
            uit.append(run_xml(deel.replace("`", "").replace("**", ""), rpr_xml((), extra_sz=sz)))
    return "".join(uit)


def cel_log(entry, geen_log_regel=False):
    ppr = '<w:spacing w:before="0" w:after="40"/><w:ind w:left="170" w:hanging="170"/>'
    ppr0 = '<w:spacing w:before="0" w:after="40"/>'
    delen = []
    if entry:
        if entry.get("zie"):
            delen.append(para_xml(run_xml(entry["zie"], rpr_xml((), extra_sz=LOG_SZ, italic=True, color="7F7F7F")), None, ppr0))
        if entry.get("label"):
            delen.append(para_xml(run_xml(entry["label"], rpr_xml((), extra_sz=LOG_SZ, bold=True)), None, ppr0))
        for w in entry["wijz"]:
            delen.append(para_xml(run_xml("• ", rpr_xml((), extra_sz=LOG_SZ)) + md_inline(w, LOG_SZ), None, ppr))
        for v in entry["vraag"]:
            delen.append(para_xml(run_xml("Vraag aan redactie: ", rpr_xml((), extra_sz=LOG_SZ, bold=True))
                                  + md_inline(v, LOG_SZ), None, ppr0))
    elif geen_log_regel:
        delen.append(para_xml(run_xml("(gewijzigd, maar niet in het log)", rpr_xml((), extra_sz=LOG_SZ, italic=True, color="C00000")), None, ppr0))
    return "".join(delen) if delen else para_xml("", None, ppr0)


KOLOMMEN = [1000, 5250, 5250, 3070]  # som = 14570 = bruikbare breedte in landscape
TABEL_BREEDTE = sum(KOLOMMEN)


def tc(breedte, inhoud, shd=None):
    shd_xml = f'<w:shd w:val="clear" w:color="auto" w:fill="{shd}"/>' if shd else ""
    return f'<w:tc><w:tcPr><w:tcW w:w="{breedte}" w:type="dxa"/>{shd_xml}</w:tcPr>{inhoud}</w:tc>'


def tabel_xml(rijen):
    rand = "".join(f'<w:{k} w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>'
                   for k in ("top", "left", "bottom", "right", "insideH", "insideV"))
    grid = "".join(f'<w:gridCol w:w="{b}"/>' for b in KOLOMMEN)
    kop_namen = ["Vers", "Bron", "Vereenvoudigd", "Wijzigingen"]
    kop_cellen = "".join(
        tc(b, para_xml(run_xml(n, rpr_xml((), bold=True, color="FFFFFF")), None, CEL_PPR), "002060")
        for b, n in zip(KOLOMMEN, kop_namen))
    kop = f'<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>{kop_cellen}</w:tr>'
    return (f'<w:tbl><w:tblPr><w:tblW w:w="{TABEL_BREEDTE}" w:type="dxa"/>'
            f'<w:tblBorders>{rand}</w:tblBorders><w:tblLayout w:type="fixed"/>'
            f'<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>'
            f'<w:bottom w:w="20" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>'
            f'<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" '
            f'w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>'
            f'<w:tblGrid>{grid}</w:tblGrid>{kop}{"".join(rijen)}</w:tbl>')


GRIJS = "E7E6E6"


def maak_rij(hfd, n, volgnr, bron_stukken, nieuw_stukken, log, heeft_log):
    label = f"{hfd}:{n}" if n else f"{hfd}:\u2014"
    if volgnr > 1:
        label += f" ({volgnr}e)"
    bron_mist = bron_stukken is None
    nieuw_mist = nieuw_stukken is None
    gelijk = (not bron_mist and not nieuw_mist
              and platte_tekst(bron_stukken) == platte_tekst(nieuw_stukken))
    shd = GRIJS if gelijk else None
    entry = log.get(n) if log and volgnr == 1 else None
    geen_log_regel = bool(heeft_log and not gelijk and not bron_mist and not nieuw_mist and not entry)
    cellen = [
        tc(KOLOMMEN[0], para_xml(run_xml(label, rpr_xml((), bold=True, extra_sz=20)), None, CEL_PPR), shd),
        tc(KOLOMMEN[1], cel_tekst(None, bron_stukken, bron_mist), shd),
        tc(KOLOMMEN[2], cel_tekst(None, nieuw_stukken, nieuw_mist), shd),
        tc(KOLOMMEN[3], cel_log(entry, geen_log_regel), shd),
    ]
    return f'<w:tr>{"".join(cellen)}</w:tr>', gelijk, bron_mist or nieuw_mist


def lijst_item(tekst_xml):
    return para_xml(run_xml("• ") + tekst_xml, None,
                    '<w:spacing w:before="0" w:after="60"/><w:ind w:left="340" w:hanging="340"/>')


def legenda_xml():
    delen = [run_xml("Opmaak zoals in het origineel: ")]
    voorbeelden = [("eeuwig leven", "eeuwigleven"), ("genade", "genade"), ("geloof", "geloof"),
                   ("oordeel", "oordeel"), ("rechtvaardig", "rechtvaardig"), ("zonde", "zonde"),
                   ("Torah", "torah"), ("dag", "dag")]
    for i, (tekst, tag) in enumerate(voorbeelden):
        delen.append(run_xml(tekst, rpr_xml((tag,))))
        delen.append(run_xml(", " if i < len(voorbeelden) - 1 else "; "))
    delen.append(run_xml("onderwijs", rpr_xml((RED,))))
    delen.append(run_xml(" (rood), "))
    delen.append(run_xml("highlight", rpr_xml((HIGHLIGHT,))))
    delen.append(run_xml(" (geel)."))
    return para_xml("".join(delen), None, '<w:spacing w:before="0" w:after="120"/>')


def body_review(hoofdstukken):
    """hoofdstukken: lijst dicts met nr, bron (verzen), nieuw (verzen), log (dict|None)."""
    uit = []
    titel_nrs = ", ".join(str(h["nr"]) for h in hoofdstukken)
    uit.append(para_xml(run_xml(f"Reviewdocument {BOEK.naam} {titel_nrs}"), "Kop1", '<w:spacing w:before="0" w:after="120"/>'))
    uit.append(para_xml(run_xml(
        "Per vers staat links de brontekst (origineel) en daarnaast de vereenvoudigde tekst. "
        "De laatste kolom noemt wat er is veranderd en op grond van welke regel. "
        "Grijze rijen zijn ongewijzigd: daar hoef je niets te beoordelen. "
        "Is een wijziging niet goed? Zet de bronvorm terug in de kolom Vereenvoudigd (of markeer het vers "
        "met een opmerking). Bij vers-onderdelen die in een andere alinea staan (bijv. woorden van Jezus of "
        "een engel) staan de alinea's onder elkaar in dezelfde cel."),
        None, '<w:spacing w:before="0" w:after="120"/>'))
    uit.append(legenda_xml())

    # Vragen bovenaan: de lijst '## Vragen aan redactie' uit het log (heeft eigen versverwijzingen);
    # bestaat die niet, dan worden de vragen per vers uit het log verzameld.
    vragen = []  # (hoofdstuk, vers|None, tekst)
    per_vers = 0
    for h in hoofdstukken:
        if h["log"]:
            per_vers += sum(len(e["vraag"]) for e in h["log"].values())
        if h.get("globaal"):
            vragen.extend((h["nr"], None, v) for v in h["globaal"])
        elif h["log"]:
            for n in sorted(h["log"]):
                vragen.extend((h["nr"], n, v) for v in h["log"][n]["vraag"])
    if vragen:
        uit.append(para_xml(run_xml(f"Vragen aan de redactie ({len(vragen)})"), "Kop2"))
        meerdere = len(hoofdstukken) > 1
        for hfd, n, v in vragen:
            kop = ""
            if n is not None:
                kop = run_xml(f"{BOEK.naam} {hfd}:{n}", rpr_xml((), bold=True)) + run_xml(" \u2014 ")
            elif meerdere:
                kop = run_xml(f"{BOEK.naam} {hfd}: ", rpr_xml((), bold=True))
            uit.append(lijst_item(kop + md_inline(v, None)))
        if any(h.get("globaal") for h in hoofdstukken) and per_vers:
            uit.append(para_xml(run_xml(
                f"Bij {per_vers} verzen staat daarnaast een vraag in de kolom Wijzigingen (\u201cVraag aan redactie\u201d).",
                rpr_xml((), italic=True)), None, '<w:spacing w:before="60" w:after="60"/>'))
        uit.append(para_xml("", None, '<w:spacing w:before="0" w:after="60"/>'))

    totaal = {"verzen": 0, "gelijk": 0, "mist": 0}
    for h in hoofdstukken:
        uit.append(para_xml(run_xml(f"{BOEK.naam} {h['nr']}"), "Kop2"))
        sleutels = sorted(set(h["bron"]) | set(h["nieuw"]))
        rijen = []
        for sl in sleutels:
            rij, gelijk, mist = maak_rij(h["nr"], sl[0], sl[1], h["bron"].get(sl), h["nieuw"].get(sl),
                                         h["log"], h["log"] is not None)
            rijen.append(rij)
            totaal["verzen"] += 1
            totaal["gelijk"] += gelijk
            totaal["mist"] += mist
            if mist:
                sys.stderr.write(f"waarschuwing: {BOEK.naam} {h['nr']}:{sl[0]} ontbreekt in "
                                 f"{'bron' if sl not in h['bron'] else 'vereenvoudigd'}\n")
        if h["log"]:
            for n in h["log"]:
                if (n, 1) not in h["bron"] and (n, 1) not in h["nieuw"]:
                    sys.stderr.write(f"waarschuwing: log noemt vers {n}, maar dat staat in geen van beide teksten\n")
        uit.append(tabel_xml(rijen))
        uit.append(para_xml("", None, '<w:spacing w:before="0" w:after="0"/>'))
    sys.stderr.write(f"review: {totaal['verzen']} verzen, {totaal['gelijk']} ongewijzigd (grijs), "
                     f"{totaal['mist']} met ONTBREEKT, {len(vragen)} vragen\n")
    return "".join(uit)


# ---------------------------------------------------------------------------
# Pakket schrijven
# ---------------------------------------------------------------------------

def lees_sjabloon():
    sjabloon = Path(BOEK.sjabloon)
    if not sjabloon.exists():
        raise MdError(f"sjabloon niet gevonden: {sjabloon}")
    with zipfile.ZipFile(sjabloon) as z:
        entries = [(i, z.read(i.filename)) for i in z.infolist()]
    doc = next(d for i, d in entries if i.filename == "word/document.xml").decode("utf-8")
    start = doc.index("<w:body>") + len("<w:body>")
    kop = doc[:start]
    m = re.search(r"<w:sectPr\b.*</w:sectPr>", doc, re.S)
    if not m:
        raise MdError("geen sectPr in sjabloon")
    return entries, kop, m.group(0)


def landscape(sectpr):
    """Zelfde sectPr (header/footer-verwijzingen, marges boven/onder), maar liggend."""
    sectpr = re.sub(r"<w:pgSz\b[^>]*/>", '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>', sectpr)
    sectpr = re.sub(r'w:left="\d+"', 'w:left="1134"', sectpr)
    sectpr = re.sub(r'w:right="\d+"', 'w:right="1134"', sectpr)
    return sectpr


def schrijf_docx(uitvoer, body, liggend=False):
    entries, kop, sectpr = lees_sjabloon()
    if liggend:
        sectpr = landscape(sectpr)
    document = f"{kop}{body}{sectpr}</w:body></w:document>"
    try:  # valideer voor we schrijven
        ElementTree.fromstring(document.encode("utf-8"))
    except ElementTree.ParseError as e:
        raise MdError(f"intern: gegenereerde document.xml is niet welgevormd: {e}")
    uitvoer = Path(uitvoer)
    uitvoer.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(uitvoer, "w", zipfile.ZIP_DEFLATED) as z:
        for info, data in entries:
            if info.filename == "word/document.xml":
                data = document.encode("utf-8")
            z.writestr(info.filename, data)
    valideer_docx(uitvoer)


def valideer_docx(pad):
    with zipfile.ZipFile(pad) as z:
        slecht = z.testzip()
        if slecht:
            raise MdError(f"{pad}: corrupte zip-entry {slecht}")
        for naam in z.namelist():
            if naam.endswith(".xml") or naam.endswith(".rels"):
                ElementTree.fromstring(z.read(naam))
    return True


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def bereik(spec):
    nrs = []
    for deel in spec.split(","):
        deel = deel.strip()
        m = re.match(r"^(\d+)(?:\s*-\s*(\d+))?$", deel)
        if not m:
            raise MdError(f"ongeldig hoofdstukbereik: {spec!r} (bv. 1-3 of 1,4,5)")
        a = int(m.group(1))
        b = int(m.group(2)) if m.group(2) else a
        nrs.extend(range(a, b + 1))
    return nrs


def cmd_doc(args):
    alineas = [parse_md(p) for p in args.md]
    body = body_doc(alineas)
    schrijf_docx(args.output, body)
    print(f"geschreven: {args.output}")


def cmd_review(args):
    bronnen = list(args.bron or [])
    nieuwe = list(args.nieuw or [])
    logs = list(args.log or [])
    if args.hoofdstuk:
        for nr in bereik(args.hoofdstuk):
            bronnen.append(BOEK.pad("bron", nr))
            nieuwe.append(BOEK.pad("vereenvoudigd", nr))
            lg = Path(BOEK.pad("wijzigingslog", nr))
            if lg.exists():
                logs.append(str(lg))
            else:
                sys.stderr.write(f"waarschuwing: geen log voor hoofdstuk {nr} ({lg}); kolom Wijzigingen blijft leeg\n")
    if not bronnen or not nieuwe:
        raise MdError("review vraagt --bron en --nieuw (of --hoofdstuk)")
    if len(bronnen) != len(nieuwe):
        raise MdError(f"aantal --bron ({len(bronnen)}) en --nieuw ({len(nieuwe)}) verschilt")
    if logs and len(logs) not in (len(bronnen),) and not args.hoofdstuk:
        raise MdError(f"aantal --log ({len(logs)}) moet gelijk zijn aan het aantal hoofdstukken ({len(bronnen)}), of 0")

    # Bij --hoofdstuk kunnen logs voor sommige hoofdstukken ontbreken: koppel op hoofdstuknummer in de bestandsnaam.
    def log_voor(pad_bron, i):
        m = re.search(r"(\d+)", Path(pad_bron).stem)
        if len(logs) == len(bronnen):
            return logs[i]
        if m:
            for lg in logs:
                mm = re.search(r"(\d+)", Path(lg).stem)
                if mm and int(mm.group(1)) == int(m.group(1)):
                    return lg
        return None

    hoofdstukken = []
    for i, (b, n) in enumerate(zip(bronnen, nieuwe)):
        ab, an = parse_md(b), parse_md(n)
        nr = hoofdstuk_nummer(ab, b)
        nr_n = hoofdstuk_nummer(an, n)
        if nr is None:
            raise MdError(f"{b}: hoofdstuknummer niet te bepalen (verwacht '# {BOEK.naam} N' of {BOEK.bestandsnaam(1).replace('01', 'NN')})")
        if nr_n is not None and nr_n != nr:
            raise MdError(f"{n}: hoofdstuk {nr_n} past niet bij {b} (hoofdstuk {nr})")
        lg = log_voor(b, i)
        entries, globaal = parse_log(lg) if lg else (None, [])
        hoofdstukken.append({"nr": nr, "bron": split_verzen(ab), "nieuw": split_verzen(an),
                             "log": entries, "globaal": globaal})
    schrijf_docx(args.output, body_review(hoofdstukken), liggend=True)
    print(f"geschreven: {args.output}")


def main(argv=None):
    p = argparse.ArgumentParser(description="Markdown met opmaak-tags -> Word (.docx)")
    p.add_argument("--boek", help="map in bijbel/ (mag weg als er maar één boek is)")
    sub = p.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("doc", help="doorlopend document zoals het origineel")
    d.add_argument("md", nargs="+", help="md-bestand(en), in volgorde")
    d.add_argument("-o", "--output", required=True)
    d.set_defaults(func=cmd_doc)
    r = sub.add_parser("review", help="reviewdocument: tabel per vers (bron | vereenvoudigd | wijzigingen)")
    r.add_argument("--bron", action="append", help="<boek>/bron/<prefix>-NN.md (herhaalbaar)")
    r.add_argument("--nieuw", action="append", help="<boek>/vereenvoudigd/<prefix>-NN.md (herhaalbaar)")
    r.add_argument("--log", action="append", help="<boek>/wijzigingslog/<prefix>-NN.md (optioneel, herhaalbaar)")
    r.add_argument("--hoofdstuk", help="bereik, bv. 1-3 of 1,4: gebruikt bron/, vereenvoudigd/ en wijzigingslog/ van het boek")
    r.add_argument("-o", "--output", required=True)
    r.set_defaults(func=cmd_review)
    args = p.parse_args(argv)
    global BOEK
    try:
        BOEK = boekmod.laad(args.boek)
        args.func(args)
    except (MdError, boekmod.BoekFout) as e:
        sys.stderr.write(f"FOUT: {e}\n")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
