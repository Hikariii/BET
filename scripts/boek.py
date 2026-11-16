"""Gedeelde boekinstellingen en foutafhandeling voor de scripts.

Elk boek staat in `bijbel/<id>/` met een `boek.json`:

    {
      "naam": "Lukas",                       # zoals in de kop: "# Lukas 1"
      "bestandsprefix": "lukas",             # lukas-01.md, lukas-02.md, ...
      "sjabloon": "origineel/....docx",      # Word-stijlsjabloon, relatief aan de boekmap
      "verzen_per_hoofdstuk": [80, 52, ...]  # verwachte versindeling
    }

Optioneel `controle.json`, met drie lijsten die alle drie mogen ontbreken:

    "oude_vormen":       [[regex, bron, uitleg], ...]
    "geaccepteerd":      [{"vers": "1:16", "soort": "geloof", "reden": "..."}, ...]
    "docx_geaccepteerd": [{"hoofdstuk": 8, "opmaak": "onderstreept", "reden": "..."}, ...]

`oude_vormen` komt bovenop de algemene lijst in controle_lijsten.json en `geaccepteerd` is voor
controleer_hoofdstuk.py. `docx_geaccepteerd` is voor controleer_docx_md.py.

Elke fout in de invoer van een script is een `BoekFout`; het script meldt hem als `FOUT: ...`
en stopt met exitcode 2.

Scripts worden met `python3 -I` gedraaid; die voegen deze map zelf aan sys.path toe.
"""
import json
import os
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIJBEL = os.path.join(ROOT, "bijbel")
BOEK_VELDEN = "naam, bestandsprefix, sjabloon en verzen_per_hoofdstuk"


class BoekFout(Exception):
    pass


def lees_tekst(pad):
    """Tekst van een bestand (zonder BOM); een leesfout is een BoekFout."""
    try:
        with open(pad, encoding="utf-8-sig") as bestand:
            return bestand.read()
    except (OSError, UnicodeDecodeError) as fout:
        raise BoekFout(f"{pad}: kan niet lezen: {fout}")


def lees_json(pad):
    try:
        return json.loads(lees_tekst(pad))
    except json.JSONDecodeError as fout:
        raise BoekFout(f"{pad}: geen geldige JSON: {fout}")


def open_docx(pad):
    """Het .docx als zip; een bestand dat ontbreekt of geen zip is, is een BoekFout."""
    try:
        return zipfile.ZipFile(pad)
    except OSError as fout:
        raise BoekFout(f"{pad}: kan niet lezen: {fout}")
    except zipfile.BadZipFile:
        raise BoekFout(f"{pad}: is geen Word-bestand (.docx)")


def lees_docx_onderdeel(pad, onderdeel):
    """De bytes van één onderdeel van een .docx, bv. 'word/document.xml'."""
    with open_docx(pad) as docx:
        try:
            return docx.read(onderdeel)
        except KeyError:
            raise BoekFout(f"{pad}: {onderdeel} ontbreekt, is dit een Word-bestand?")


def beschikbare_boeken():
    if not os.path.isdir(BIJBEL):
        return []
    return sorted(d for d in os.listdir(BIJBEL) if os.path.isfile(os.path.join(BIJBEL, d, "boek.json")))


def _is_geheel_getal(waarde):
    return isinstance(waarde, int) and not isinstance(waarde, bool)


def _is_tekst(waarde):
    return isinstance(waarde, str)


def _lijst_van(controle, sleutel, pad, vorm):
    """De lijst onder `sleutel`; ontbreekt hij, dan is het een lege lijst. `vorm` omschrijft één item."""
    lijst = controle.get(sleutel, [])
    if not isinstance(lijst, list):
        raise BoekFout(f"{pad}: '{sleutel}' moet een lijst zijn van {vorm}")
    return lijst


def _velden(item, velden, pad, sleutel):
    """De waarden van `velden` (naam -> controle) uit een item; elk ander item is een BoekFout."""
    if not isinstance(item, dict) or not all(naam in item and test(item[naam]) for naam, test in velden.items()):
        raise BoekFout(f"{pad}: '{sleutel}' verwacht items met {', '.join(velden)}, gevonden {item!r}")
    return [item[naam] for naam in velden]


class Boek:
    def __init__(self, boek_id):
        self.id = boek_id
        self.map = os.path.join(BIJBEL, boek_id)
        pad = os.path.join(self.map, "boek.json")
        if not os.path.isfile(pad):
            raise BoekFout(f"boek '{boek_id}' niet gevonden ({pad}); beschikbaar: {', '.join(beschikbare_boeken()) or 'geen'}")
        configuratie = lees_json(pad)
        if not self._heeft_boekvelden(configuratie):
            raise BoekFout(f"{pad}: verwacht {BOEK_VELDEN}")
        self.naam = configuratie["naam"]
        self.prefix = configuratie["bestandsprefix"]
        self.sjabloon = os.path.join(self.map, configuratie["sjabloon"])
        self.verzen = list(configuratie["verzen_per_hoofdstuk"])
        self.aantal_hoofdstukken = len(self.verzen)
        self.titel_re = re.compile(r"^\s*" + re.escape(self.naam) + r"\s*(\d+)\s*$")
        self._bestandsnaam_re = re.compile("^" + re.escape(self.prefix) + r"-(\d+)\.md$")
        self._lees_controle()

    @staticmethod
    def _heeft_boekvelden(configuratie):
        return (isinstance(configuratie, dict)
                and _is_tekst(configuratie.get("naam"))
                and _is_tekst(configuratie.get("bestandsprefix"))
                and _is_tekst(configuratie.get("sjabloon"))
                and isinstance(configuratie.get("verzen_per_hoofdstuk"), list)
                and all(_is_geheel_getal(aantal) for aantal in configuratie["verzen_per_hoofdstuk"]))

    def _lees_controle(self):
        """Leest controle.json één keer; wat ontbreekt is een lege lijst."""
        pad = os.path.join(self.map, "controle.json")
        controle = lees_json(pad) if os.path.isfile(pad) else {}
        if not isinstance(controle, dict):
            raise BoekFout(f"{pad}: verwacht een object met oude_vormen, geaccepteerd en docx_geaccepteerd")
        self.oude_vormen = []
        for item in _lijst_van(controle, "oude_vormen", pad, "[regex, bron, uitleg]"):
            if not (isinstance(item, list) and len(item) == 3 and all(_is_tekst(deel) for deel in item)):
                raise BoekFout(f"{pad}: 'oude_vormen' verwacht [regex, bron, uitleg], gevonden {item!r}")
            try:
                re.compile(item[0])
            except re.error as fout:
                raise BoekFout(f"{pad}: ongeldige regex {item[0]!r}: {fout}")
            self.oude_vormen.append(tuple(item))
        tekstvelden = {"vers": _is_tekst, "soort": _is_tekst, "reden": _is_tekst}
        self.geaccepteerd = [tuple(_velden(item, tekstvelden, pad, "geaccepteerd"))
                             for item in _lijst_van(controle, "geaccepteerd", pad, "{vers, soort, reden}")]
        docxvelden = {"hoofdstuk": _is_geheel_getal, "opmaak": _is_tekst, "reden": _is_tekst}
        self.docx_geaccepteerd = [tuple(_velden(item, docxvelden, pad, "docx_geaccepteerd"))
                                  for item in _lijst_van(controle, "docx_geaccepteerd", pad, "{hoofdstuk, opmaak, reden}")]

    def pad(self, soort, hoofdstuk):
        """soort: bron | vereenvoudigd | wijzigingslog"""
        return os.path.join(self.map, soort, f"{self.prefix}-{hoofdstuk:02d}.md")

    def bestandsnaam(self, hoofdstuk):
        return f"{self.prefix}-{hoofdstuk:02d}.md"

    def nummer_uit_bestandsnaam(self, pad):
        """Het hoofdstuknummer uit `<prefix>-NN.md` (ook met een mappad ervoor), anders None."""
        gevonden = self._bestandsnaam_re.match(os.path.basename(pad))
        return int(gevonden.group(1)) if gevonden else None

    def kop(self, hoofdstuk):
        return f"{self.naam} {hoofdstuk}"

    def hoofdstukken(self, spec):
        """Hoofdstuknummers uit een bereik als '1-3' of '1,4,5'. Leeg, omgekeerd of buiten het boek is een BoekFout."""
        nummers = []
        for deel in spec.split(","):
            gevonden = re.match(r"^\s*(\d+)(?:\s*-\s*(\d+))?\s*$", deel)
            if not gevonden:
                raise BoekFout(f"ongeldig hoofdstukbereik: {spec!r} (bv. 1-3 of 1,4,5)")
            eerste = int(gevonden.group(1))
            laatste = int(gevonden.group(2)) if gevonden.group(2) else eerste
            if eerste > laatste:
                raise BoekFout(f"ongeldig hoofdstukbereik: {deel.strip()!r} loopt terug")
            nummers.extend(range(eerste, laatste + 1))
        buiten = [n for n in nummers if not 1 <= n <= self.aantal_hoofdstukken]
        if buiten:
            raise BoekFout(f"hoofdstuk {buiten[0]} bestaat niet: {self.naam} heeft {self.aantal_hoofdstukken} hoofdstukken (boek.json)")
        return nummers


def laad(boek_id=None):
    """Zonder boek_id: het enige boek in bijbel/, anders een fout."""
    if boek_id is None:
        ids = beschikbare_boeken()
        if len(ids) != 1:
            raise BoekFout(f"geef --boek op; beschikbaar: {', '.join(ids) or 'geen'}")
        boek_id = ids[0]
    return Boek(boek_id)
