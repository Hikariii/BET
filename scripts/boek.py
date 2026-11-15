"""Gedeelde boekinstellingen voor de scripts.

Elk boek staat in `bijbel/<id>/` met een `boek.json`:

    {
      "naam": "Lukas",                       # zoals in de kop: "# Lukas 1"
      "bestandsprefix": "lukas",             # lukas-01.md, lukas-02.md, ...
      "sjabloon": "origineel/....docx",      # Word-stijlsjabloon, relatief aan de boekmap
      "verzen_per_hoofdstuk": [80, 52, ...]  # verwachte versindeling
    }

Optioneel `controle.json`: extra oude vormen uit de precedenten van dit boek,
als lijst van [regex, paragraaf, uitleg] (zie controleer_hoofdstuk.py).

Scripts worden met `python3 -I` gedraaid; die voegen deze map zelf aan sys.path toe.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIJBEL = os.path.join(ROOT, "bijbel")


class BoekFout(Exception):
    pass


def beschikbare_boeken():
    if not os.path.isdir(BIJBEL):
        return []
    return sorted(d for d in os.listdir(BIJBEL) if os.path.isfile(os.path.join(BIJBEL, d, "boek.json")))


class Boek:
    def __init__(self, boek_id):
        self.id = boek_id
        self.map = os.path.join(BIJBEL, boek_id)
        pad = os.path.join(self.map, "boek.json")
        if not os.path.isfile(pad):
            raise BoekFout(f"boek '{boek_id}' niet gevonden ({pad}); beschikbaar: {', '.join(beschikbare_boeken()) or 'geen'}")
        with open(pad, encoding="utf-8") as f:
            cfg = json.load(f)
        self.naam = cfg["naam"]
        self.prefix = cfg["bestandsprefix"]
        self.sjabloon = os.path.join(self.map, cfg["sjabloon"])
        self.verzen = list(cfg["verzen_per_hoofdstuk"])
        self.aantal_hoofdstukken = len(self.verzen)
        self.titel_re = re.compile(r"^\s*" + re.escape(self.naam) + r"\s*(\d+)\s*$")

    def pad(self, soort, hoofdstuk):
        """soort: bron | vereenvoudigd | wijzigingslog"""
        return os.path.join(self.map, soort, f"{self.prefix}-{hoofdstuk:02d}.md")

    def bestandsnaam(self, hoofdstuk):
        return f"{self.prefix}-{hoofdstuk:02d}.md"

    def kop(self, hoofdstuk):
        return f"{self.naam} {hoofdstuk}"

    def extra_oude_vormen(self):
        pad = os.path.join(self.map, "controle.json")
        if not os.path.isfile(pad):
            return []
        with open(pad, encoding="utf-8") as f:
            return [tuple(x) for x in json.load(f)["oude_vormen"]]


def laad(boek_id=None):
    """Zonder boek_id: het enige boek in bijbel/, anders een fout."""
    if boek_id is None:
        ids = beschikbare_boeken()
        if len(ids) != 1:
            raise BoekFout(f"geef --boek op; beschikbaar: {', '.join(ids) or 'geen'}")
        boek_id = ids[0]
    return Boek(boek_id)
