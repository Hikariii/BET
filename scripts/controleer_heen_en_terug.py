#!/usr/bin/env python3
"""Heen-en-terugtest: bron -> Word -> Markdown moet de bron byte voor byte teruggeven.

Gebruik (vanuit de hoofdmap):
    python3 -I scripts/controleer_heen_en_terug.py --boek lukas

Zet alle bestanden in bijbel/<boek>/bron/ met md_naar_docx.py om naar één tijdelijk
.docx en dat met docx_naar_md.py terug naar Markdown. Elk bestand dat daarna niet
gelijk is aan de bron staat in de uitvoer. Er wordt niets in bijbel/ geschreven.
Draai dit na elke wijziging aan md_naar_docx.py, docx_naar_md.py of formaat.py.

Exitcode 0 bij gelijke bestanden, 1 bij een verschil, 2 bij een fout in de invoer.
"""
import argparse
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402

SCRIPTS = os.path.dirname(os.path.abspath(__file__))


def draai(script, *argumenten):
    """Draait een script uit deze map; geeft (exitcode, stderr)."""
    resultaat = subprocess.run([sys.executable, "-I", os.path.join(SCRIPTS, script), *argumenten],
                               capture_output=True, text=True)
    return resultaat.returncode, resultaat.stderr


def lees_bytes(pad):
    with open(pad, "rb") as bestand:
        return bestand.read()


def verschillen(boek, tijdelijke_map):
    """Geeft de meldingen over bestanden die na heen en terug niet gelijk zijn aan de bron."""
    bronmap = os.path.join(boek.map, "bron")
    bronnamen = sorted(naam for naam in os.listdir(bronmap) if naam.endswith(".md"))
    if not bronnamen:
        raise boekmod.BoekFout(f"{bronmap} bevat geen .md-bestanden")
    docx = os.path.join(tijdelijke_map, "heen.docx")
    terugmap = os.path.join(tijdelijke_map, "terug")

    code, fouten = draai("md_naar_docx.py", "--boek", boek.id, "doc",
                         *[os.path.join(bronmap, naam) for naam in bronnamen], "-o", docx)
    if code != 0:
        raise boekmod.BoekFout(f"md_naar_docx.py faalde: {fouten.strip()}")
    code, fouten = draai("docx_naar_md.py", "--boek", boek.id, docx, terugmap)
    if code != 0:
        raise boekmod.BoekFout(f"docx_naar_md.py faalde: {fouten.strip()}")

    meldingen = []
    terugnamen = sorted(os.listdir(terugmap))
    for naam in bronnamen:
        if naam not in terugnamen:
            meldingen.append(f"{naam}: ontbreekt na terugzetten")
        elif lees_bytes(os.path.join(bronmap, naam)) != lees_bytes(os.path.join(terugmap, naam)):
            meldingen.append(f"{naam}: verschilt van de bron")
    for naam in terugnamen:
        if naam not in bronnamen:
            meldingen.append(f"{naam}: staat niet in bron/")
    return meldingen, len(bronnamen)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Heen-en-terugtest: bron -> docx -> md is gelijk aan de bron.")
    parser.add_argument("--boek", help="map in bijbel/ (mag weg als er maar één boek is)")
    argumenten = parser.parse_args(argv)
    try:
        boek = boekmod.laad(argumenten.boek)
        with tempfile.TemporaryDirectory() as tijdelijke_map:
            meldingen, aantal = verschillen(boek, tijdelijke_map)
    except boekmod.BoekFout as fout:
        print(f"FOUT: {fout}", file=sys.stderr)
        return 2
    for melding in meldingen:
        print(f"VERSCHIL {melding}")
    if meldingen:
        print(f"{len(meldingen)} van {aantal} bestanden verschillen")
        return 1
    print(f"{boek.naam}: {aantal} bestanden gelijk na heen en terug")
    return 0


if __name__ == "__main__":
    sys.exit(main())
