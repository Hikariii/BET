"""Het formaat van FORMAAT.md voor alle scripts: tags, Word-stijlen, parse_md en parse_log.

Dit is de enige plek in Python waar staat welke tag bij welke Word-stijl hoort.
De tool heeft zijn eigen parser (redactietool/src/formaat/parseer.ts); pariteit.test.ts
vergelijkt die met deze via formaat_naar_json.py, ook op een lijst ongeldige voorbeelden.
Een regel die parseer.ts weigert, weigert parse_md dus ook.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from boek import BoekFout, lees_tekst  # noqa: E402

# ---------------------------------------------------------------------------
# Tags en Word-stijlen
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
DIRECT = ("vet", "cursief", "onderstreept")  # directe Word-opmaak zonder eigen stijl
RED = "onderwijs"  # {onderwijs} is directe letterkleur FF0000
HIGHLIGHT = "highlight"  # ==...== is directe gele markering
HIGHLIGHT_TEKEN = "=="

# Opmaak van buiten naar binnen: de volgorde waarin FORMAAT.md de tags nest.
# Alle domeinen horen bij het binnenste niveau.
ORDER = [RED, HIGHLIGHT, "onderstreept", "vet", "cursief", *CHAR_STYLES]

TITLE_STYLE = "Bblhfdstk"  # tekenstijl van de hoofdstuktitel, inline aan het begin van de eerste alinea
TITLE_STYLES_READ = (TITLE_STYLE, "HoofdsukChar")  # docx_naar_md.py leest ook deze oudere naam
REVIEW_TITLE_STYLE = "Kop1"  # alineastijl in het reviewdocument
REVIEW_HEADING_STYLE = "Kop2"

# Alineastijlen die zelf cursief of vet zijn: directe b/i in zo'n alinea voegt niets toe.
ITALIC_PSTYLES = frozenset(PARA_STYLES[tag] for tag in ("engel", "citaat-ot", "god"))
BOLD_PSTYLES = frozenset(PARA_STYLES[tag] for tag in ("god",))

TAG_OF_PSTYLE = {stijl: tag for tag, stijl in PARA_STYLES.items()}
TAG_OF_RSTYLE = {stijl: tag for tag, stijl in CHAR_STYLES.items()}

# Wat het Word-sjabloon moet bevatten: styleId -> w:type.
REQUIRED_STYLES = {
    **{stijl: "paragraph" for stijl in PARA_STYLES.values()},
    **{stijl: "paragraph" for stijl in (REVIEW_TITLE_STYLE, REVIEW_HEADING_STYLE)},
    **{stijl: "character" for stijl in CHAR_STYLES.values()},
    TITLE_STYLE: "character",
}


def missing_styles(template_styles):
    """Meldingen voor stijlen die de export nodig heeft en die het sjabloon niet (of als ander soort) heeft.

    template_styles: styleId -> w:type uit word/styles.xml van het sjabloon.
    """
    meldingen = []
    for stijl, soort in REQUIRED_STYLES.items():
        gevonden = template_styles.get(stijl)
        if gevonden is None:
            meldingen.append(f"stijl '{stijl}' ({soort}) ontbreekt")
        elif gevonden != soort:
            meldingen.append(f"stijl '{stijl}' is {gevonden}, verwacht {soort}")
    return meldingen


def nesting_level(opmaak):
    return min(ORDER.index(opmaak), ORDER.index("cursief") + 1)


def open_tag(opmaak):
    return HIGHLIGHT_TEKEN if opmaak == HIGHLIGHT else "{" + opmaak + "}"


# ---------------------------------------------------------------------------
# Parsen van de Markdown
# ---------------------------------------------------------------------------
# Een alinea = {"soort": "leeg"|"tekst"|"titel", "pstyle": str|None,
#               "segs": [("tekst", tekst, tags) | ("vers", n, tags)], "regel": int,
#               "openingen": [(positie in segs, opmaak)]}
# `tags` is een tuple van actieve opmaak van buiten naar binnen; een versnummer heeft nooit tags.
# `openingen` noemt elke geopende tag, ook twee aansluitende van dezelfde opmaak, met de positie van het
# segment dat erna komt.

MAX_BLANK_LINES = 2
TAG_RE = re.compile(r"\{(/?)([^{}\s]*)\}|==|\[(\d+)\]")
TITLE_LINE_RE = re.compile(r"^# (\S.*?)\s*$")
PSTYLE_RE = re.compile(r"^@(\S+)(?:\s(.*))?$")
INVALID_XML_RE = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f￾￿]")
FORMAT_TAGS = frozenset([*CHAR_STYLES, *DIRECT, RED])


class FormaatFout(BoekFout):
    pass


def _fout(naam, regelnr, melding):
    return FormaatFout(f"{naam}:{regelnr}: {melding}")


def _tags_tekst(tags):
    return "".join(open_tag(t) for t in tags)


def parse_inline(tekst, naam, regelnr):
    """Geeft (segs, openingen) van één regel."""
    segs = []
    openingen = []
    open_ = []
    pos = 0

    def sluit(opmaak, tag):
        if opmaak not in open_:
            raise _fout(naam, regelnr, f"{tag} sluit een tag die niet open staat")
        if open_[-1] != opmaak:
            raise _fout(naam, regelnr, f"{tag} sluit terwijl {open_tag(open_[-1])} nog open staat")
        open_.pop()

    def open_met(opmaak):
        if opmaak in open_:
            raise _fout(naam, regelnr, f"{open_tag(opmaak)} staat al open")
        if open_ and nesting_level(open_[-1]) > nesting_level(opmaak):
            raise _fout(naam, regelnr, f"{open_tag(opmaak)} hoort buiten {open_tag(open_[-1])}")
        open_.append(opmaak)
        openingen.append((len(segs), opmaak))

    for m in TAG_RE.finditer(tekst):
        if m.start() > pos:
            segs.append(("tekst", tekst[pos:m.start()], tuple(open_)))
        pos = m.end()
        if m.group(3) is not None:
            if open_:
                raise _fout(naam, regelnr, f"versnummer {m.group(0)} staat binnen {_tags_tekst(open_)}")
            segs.append(("vers", int(m.group(3)), ()))
        elif m.group(0) == HIGHLIGHT_TEKEN:
            if HIGHLIGHT in open_:
                sluit(HIGHLIGHT, m.group(0))
            else:
                open_met(HIGHLIGHT)
        else:
            tag = m.group(2)
            if tag not in FORMAT_TAGS:
                raise _fout(naam, regelnr, f"onbekende tag {m.group(0)!r}")
            if m.group(1) == "/":
                sluit(tag, m.group(0))
            else:
                open_met(tag)
    if pos < len(tekst):
        segs.append(("tekst", tekst[pos:], tuple(open_)))
    if open_:
        raise _fout(naam, regelnr, f"tag(s) niet gesloten aan het eind van de alinea: {_tags_tekst(open_)}")
    return segs, openingen


def _parse_regel(regel, naam, nr):
    if INVALID_XML_RE.search(regel):
        raise _fout(naam, nr, "bevat een ongeldig stuurteken")
    if regel == "":
        return {"soort": "leeg", "pstyle": None, "segs": [], "regel": nr, "openingen": []}
    if regel.strip() == "":
        raise _fout(naam, nr, "regel met alleen witruimte; een lege regel is helemaal leeg")
    if regel.startswith("#"):
        kop = TITLE_LINE_RE.match(regel)
        if not kop:
            raise _fout(naam, nr, "alleen '# Titel' wordt ondersteund (bv. '# Lukas 1')")
        return {"soort": "titel", "pstyle": None, "titel": kop.group(1), "segs": [], "regel": nr,
                "openingen": []}
    pstyle = None
    stijl = PSTYLE_RE.match(regel)
    if stijl:
        tag, regel = stijl.group(1), stijl.group(2) or ""
        if tag not in PARA_STYLES:
            raise _fout(naam, nr, f"onbekende alineatag '@{tag}'")
        if stijl.group(2) is not None and (regel == "" or regel[0].isspace()):
            raise _fout(naam, nr, f"na '@{tag}' hoort precies één spatie en dan tekst")
        pstyle = PARA_STYLES[tag]
    segs, openingen = parse_inline(regel, naam, nr)
    return {"soort": "tekst", "pstyle": pstyle, "segs": segs, "regel": nr, "openingen": openingen}


def parse_md_text(tekst, naam):
    """Geeft de lijst alinea's van een md-tekst; `naam` komt in de foutmeldingen."""
    regels = tekst.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    if regels[-1] == "":
        regels.pop()  # slot-newline is geen lege alinea
    alineas = []
    lege_regels = 0
    for nr, regel in enumerate(regels, 1):
        lege_regels = lege_regels + 1 if regel == "" else 0
        if lege_regels > MAX_BLANK_LINES:
            raise _fout(naam, nr, f"meer dan {MAX_BLANK_LINES} lege regels achter elkaar")
        alineas.append(_parse_regel(regel, naam, nr))
    return alineas


def parse_md(pad):
    """Geeft de lijst alinea's van een md-bestand."""
    return parse_md_text(lees_tekst(pad), str(pad))


# ---------------------------------------------------------------------------
# Parsen van het wijzigingslog
# ---------------------------------------------------------------------------

LOG_VERS_RE = re.compile(r"^##\s+Vers\s+(\d+)(?:\s*[-\N{EN DASH}\N{EM DASH}]\s*(\d+))?\s*:?\s*$", re.I)
LEGE_VRAGEN = ("", "optioneel", "geen", "nee", "n.v.t.", "nvt", "-", "\N{EM DASH}")


def parse_log(pad):
    """Geeft ({vers: {"wijz": [..], "vraag": [..], "label": str}}, [globale vragen]) uit een wijzigingslog.

    Globale vragen = items onder een kop '## Vragen aan redactie' (genummerde of bullet-lijst).
    """
    regels = lees_tekst(pad).splitlines()
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
        m = LOG_VERS_RE.match(regel)
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
        vraag = [v for v in vraag if v.strip("() ").lower() not in LEGE_VRAGEN]
        for k, n in enumerate(verzen):
            label = f"vers {verzen[0]}\N{EN DASH}{verzen[-1]}" if len(verzen) > 1 else ""
            if k == 0:
                entries[n] = {"wijz": wijz, "vraag": vraag, "label": label}
            else:
                entries[n] = {"wijz": [], "vraag": [], "label": "",
                              "zie": f"zie bij vers {verzen[0]}"}
    return entries, globaal
