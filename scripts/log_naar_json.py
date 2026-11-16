#!/usr/bin/env python3
"""Geeft voor elk hoofdstuk de uitvoer van parse_log (formaat.py) als JSON.

De parser in redactietool/src/log/ wordt met deze uitvoer vergeleken (pariteitstest).

Gebruik (draai met `python3 -I`, vanuit de hoofdmap):

  python3 -I scripts/log_naar_json.py --boek lukas > log.json

De JSON gaat naar stdout, per wijzigingslog (`wijzigingslog/lukas-01.md`):
- `verzen`: per versnummer (als tekst) de velden `wijz`, `vraag`, `label` en, bij een
  vers dat in een reeks `## Vers N-M` niet het eerste is, `zie`;
- `algemene_vragen`: de items onder `## Vragen aan redactie`.
De `-controle.md`-bestanden zijn geen wijzigingslog en blijven buiten beschouwing.
Logs die niet bestaan worden overgeslagen.
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402
import formaat  # noqa: E402

MAP = "wijzigingslog"


def main(argv=None):
    p = argparse.ArgumentParser(description="parse_log-uitvoer per hoofdstuk als JSON")
    p.add_argument("--boek", help="map in bijbel/ (mag weg als er maar één boek is)")
    args = p.parse_args(argv)
    try:
        boek = boekmod.laad(args.boek)
        bestanden = {}
        for hoofdstuk in range(1, boek.aantal_hoofdstukken + 1):
            pad = boek.pad(MAP, hoofdstuk)
            if os.path.isfile(pad):
                verzen, algemene_vragen = formaat.parse_log(pad)
                bestanden[f"{MAP}/{boek.bestandsnaam(hoofdstuk)}"] = {
                    "verzen": {str(vers): inhoud for vers, inhoud in verzen.items()},
                    "algemene_vragen": algemene_vragen,
                }
    except boekmod.BoekFout as fout:
        sys.stderr.write(f"FOUT: {fout}\n")
        return 2
    json.dump({"bestanden": bestanden}, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
