#!/usr/bin/env python3
"""Geeft voor elk hoofdstuk de uitvoer van parse_md (md_naar_docx.py) als JSON.

De parser in redactietool/src/formaat/ wordt met deze uitvoer vergeleken (pariteitstest).

Gebruik (draai met `python3 -I`, vanuit de hoofdmap):

  python3 -I scripts/formaat_naar_json.py --boek lukas > formaat.json

De JSON gaat naar stdout. Per bestand (`bron/lukas-01.md`, `vereenvoudigd/lukas-01.md`):
de alinea's zoals parse_md ze geeft, aangevuld met `stijl` (de @tag in plaats van de Word-stijl).
Bestanden die niet bestaan worden overgeslagen.
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402
import md_naar_docx  # noqa: E402

SOORTEN = ("bron", "vereenvoudigd")
TAG_VAN_STIJL = {stijl: tag for tag, stijl in md_naar_docx.PARA_STYLES.items()}


def alinea_naar_json(alinea):
    return {
        "soort": alinea["soort"],
        "stijl": TAG_VAN_STIJL[alinea["pstyle"]] if alinea["pstyle"] else None,
        "titel": alinea.get("titel"),
        "segs": [list(seg[:-1]) + [list(seg[-1])] for seg in alinea["segs"]],
        "regel": alinea["regel"],
    }


def main(argv=None):
    p = argparse.ArgumentParser(description="parse_md-uitvoer per hoofdstuk als JSON")
    p.add_argument("--boek", help="map in bijbel/ (mag weg als er maar één boek is)")
    args = p.parse_args(argv)
    try:
        boek = boekmod.laad(args.boek)
        bestanden = {}
        for soort in SOORTEN:
            for hoofdstuk in range(1, boek.aantal_hoofdstukken + 1):
                pad = boek.pad(soort, hoofdstuk)
                if os.path.isfile(pad):
                    alineas = md_naar_docx.parse_md(pad)
                    bestanden[f"{soort}/{boek.bestandsnaam(hoofdstuk)}"] = [alinea_naar_json(a) for a in alineas]
    except (md_naar_docx.MdError, boekmod.BoekFout) as e:
        sys.stderr.write(f"FOUT: {e}\n")
        return 1
    uitvoer = {
        "alineastijlen": list(md_naar_docx.PARA_STYLES),
        "domeinen": list(md_naar_docx.CHAR_STYLES),
        "directe_opmaak": sorted(md_naar_docx.DIRECT),
        "onderwijs": md_naar_docx.RED,
        "bestanden": bestanden,
    }
    json.dump(uitvoer, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
