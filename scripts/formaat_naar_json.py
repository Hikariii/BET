#!/usr/bin/env python3
"""Geeft voor elk hoofdstuk de uitvoer van parse_md (formaat.py) als JSON.

De parser in redactietool/src/formaat/ wordt met deze uitvoer vergeleken (pariteitstest).

Gebruik (draai met `python3 -I`, vanuit de hoofdmap):

  python3 -I scripts/formaat_naar_json.py --boek lukas [--voorbeelden voorbeelden.json] > formaat.json

De JSON gaat naar stdout. Per bestand (`bron/lukas-01.md`, `vereenvoudigd/lukas-01.md`):
de alinea's zoals parse_md ze geeft, aangevuld met `stijl` (de @tag in plaats van de Word-stijl).
`stijlkoppeling` geeft per @tag en per {tag} de Word-stijl (styleId) waar de export hem op zet.
Bestanden die niet bestaan worden overgeslagen.
Met `--voorbeelden` (een JSON-bestand met `geldig` en `ongeldig`, elk een lijst van `{naam, tekst}`)
staat in `voorbeelden` per naam de foutmelding van parse_md, of null als de tekst geldig is.
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402
import formaat  # noqa: E402

SOORTEN = ("bron", "vereenvoudigd")


def alinea_naar_json(alinea):
    return {
        "soort": alinea["soort"],
        "stijl": formaat.TAG_OF_PSTYLE[alinea["pstyle"]] if alinea["pstyle"] else None,
        "titel": alinea.get("titel"),
        "segs": [list(seg[:-1]) + [list(seg[-1])] for seg in alinea["segs"]],
        "regel": alinea["regel"],
    }


def voorbeelden_naar_json(pad):
    """Per voorbeeld de foutmelding van parse_md_text, of null als het geldig is."""
    voorbeelden = boekmod.lees_json(pad)
    uitkomst = {}
    for soort in ("geldig", "ongeldig"):
        uitkomst[soort] = {}
        for voorbeeld in voorbeelden[soort]:
            try:
                formaat.parse_md_text(voorbeeld["tekst"], voorbeeld["naam"])
                uitkomst[soort][voorbeeld["naam"]] = None
            except formaat.FormaatFout as fout:
                uitkomst[soort][voorbeeld["naam"]] = str(fout)
    return uitkomst


def main(argv=None):
    p = argparse.ArgumentParser(description="parse_md-uitvoer per hoofdstuk als JSON")
    p.add_argument("--boek", help="map in bijbel/ (mag weg als er maar één boek is)")
    p.add_argument("--voorbeelden", help="JSON-bestand met geldige en ongeldige voorbeeldteksten")
    args = p.parse_args(argv)
    try:
        boek = boekmod.laad(args.boek)
        bestanden = {}
        for soort in SOORTEN:
            for hoofdstuk in range(1, boek.aantal_hoofdstukken + 1):
                pad = boek.pad(soort, hoofdstuk)
                if os.path.isfile(pad):
                    alineas = formaat.parse_md(pad)
                    bestanden[f"{soort}/{boek.bestandsnaam(hoofdstuk)}"] = [alinea_naar_json(a) for a in alineas]
    except boekmod.BoekFout as fout:
        sys.stderr.write(f"FOUT: {fout}\n")
        return 2
    uitvoer = {
        "alineastijlen": list(formaat.PARA_STYLES),
        "domeinen": list(formaat.CHAR_STYLES),
        "directe_opmaak": sorted(formaat.DIRECT),
        "onderwijs": formaat.RED,
        "opmaak_volgorde": formaat.ORDER,
        "stijlkoppeling": {
            "alineastijlen": formaat.PARA_STYLES,
            "domeinen": formaat.CHAR_STYLES,
            "titel": formaat.TITLE_STYLE,
        },
        "bestanden": bestanden,
    }
    if args.voorbeelden:
        uitvoer["voorbeelden"] = voorbeelden_naar_json(args.voorbeelden)
    json.dump(uitvoer, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
