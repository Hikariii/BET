#!/usr/bin/env python3
"""Controleer een vereenvoudigd hoofdstuk tegen de bron (WERKPLAN stap 3, automatisch deel).

Gebruik:
    python3 -I scripts/controleer_hoofdstuk.py 4                # bijbel/<boek>/bron/… vs vereenvoudigd/…
    python3 -I scripts/controleer_hoofdstuk.py 1-3 --boek lukas
    (--boek mag weg zolang er maar één boek in bijbel/ staat)

Meldt:
  FOUT         een bestand dat niet volgens FORMAAT.md is (parse_md), versnummers ontbreken/dubbel/volgorde,
               een opmaaksoort uit de bron ontbreekt in het vers
  WAARSCHUWING aantal tags per vers verschilt, oude vormen (§11 e.a.),
               vaste begrippen (§15) verdwenen, vers niet in het wijzigingslog
  GEACCEPTEERD bewuste afwijking van de bron, vastgelegd in controle.json (telt niet als fout)
Exitcode 1 bij een FOUT, 2 bij een fout in de invoer (boek, bereik).

De algemene lijsten oude vormen en vaste begrippen staan in controle_lijsten.json naast dit script;
de vormen van één boek staan in bijbel/<boek>/controle.json.
"""
import argparse
import os
import re
import sys
from collections import Counter, namedtuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402
from formaat import TAG_OF_PSTYLE, parse_log, parse_md_text  # noqa: E402

LIJSTEN_PAD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "controle_lijsten.json")

# vers: "4:12" of None bij een melding over het hele bestand; soort: de opmaak, het begrip of de
# oude vorm waar de melding over gaat, waarop `geaccepteerd` in controle.json matcht.
Melding = namedtuple("Melding", "vers soort tekst")


def lees_lijsten():
    """(oude vormen [(regex, paragraaf, uitleg)], vaste begrippen [regex]) uit controle_lijsten.json."""
    lijsten = boekmod.lees_json(LIJSTEN_PAD)
    try:
        oude_vormen = [tuple(vorm) for vorm in lijsten["oude_vormen"]]
        vaste_begrippen = list(lijsten["vaste_begrippen"])
    except (KeyError, TypeError):
        raise boekmod.BoekFout(f"{LIJSTEN_PAD}: verwacht oude_vormen en vaste_begrippen")
    for regex, _paragraaf, _uitleg in oude_vormen:
        re.compile(regex)
    return oude_vormen, vaste_begrippen


def lees_verzen(pad):
    """Geeft (verzen, fouten). verzen: n -> {'tekst': platte tekst, 'tags': Counter}; None als het bestand niet te lezen is."""
    naam = os.path.basename(pad)
    try:
        alineas = parse_md_text(boekmod.lees_tekst(pad), naam)
    except boekmod.BoekFout as fout:
        return None, [str(fout)]
    fouten = []
    verzen = {}
    volgorde = []
    huidig = None
    for alinea in alineas:
        if alinea["soort"] != "tekst":
            continue
        stijl = TAG_OF_PSTYLE.get(alinea["pstyle"])
        voor_eerste_vers = True  # alleen witruimte of niets vóór het eerste versnummer van deze alinea
        stijl_geteld = False
        openingen = list(alinea["openingen"])
        segs = alinea["segs"]
        for index in range(len(segs) + 1):
            while openingen and openingen[0][0] == index:
                _positie, opmaak = openingen.pop(0)
                if huidig is not None:
                    verzen[huidig]["tags"][opmaak] += 1
            if index == len(segs):
                break
            seg = segs[index]
            if seg[0] == "vers":
                huidig = seg[1]
                if huidig in verzen:
                    fouten.append(f"{naam}:{alinea['regel']}: vers {huidig} komt dubbel voor")
                else:
                    verzen[huidig] = {"tags": Counter(), "ruw": []}
                    volgorde.append(huidig)
                if stijl and voor_eerste_vers and not stijl_geteld:
                    verzen[huidig]["tags"]["@" + stijl] += 1
                    stijl_geteld = True
                voor_eerste_vers = False
                continue
            if voor_eerste_vers and seg[1].strip():
                voor_eerste_vers = False
            if huidig is None:
                continue
            if stijl and not stijl_geteld and not voor_eerste_vers:
                verzen[huidig]["tags"]["@" + stijl] += 1  # alinea begint midden in dit vers
                stijl_geteld = True
            verzen[huidig]["ruw"].append(seg[1])
        if huidig is not None:
            verzen[huidig]["ruw"].append(" ")
    if volgorde != list(range(1, len(volgorde) + 1)):
        fouten.append(f"{naam}: versnummers niet doorlopend 1..n")
    for vers in verzen.values():
        vers["tekst"] = " ".join("".join(vers["ruw"]).split())
    return verzen, fouten


def log_verzen(pad):
    """De versnummers in het wijzigingslog, of None als het log ontbreekt."""
    if not os.path.exists(pad):
        return None
    verzen, _algemene_vragen = parse_log(pad)
    return set(verzen)


def controleer(boek, hoofdstuk, oude_vormen, vaste_begrippen):
    """Geeft (fouten, waarschuwingen) als lijsten Melding."""
    h = hoofdstuk
    bron_pad = boek.pad("bron", h)
    nieuw_pad = boek.pad("vereenvoudigd", h)
    log_pad = boek.pad("wijzigingslog", h)
    oude_vormen = oude_vormen + boek.oude_vormen
    if not os.path.exists(nieuw_pad):
        return [Melding(None, None, f"{boek.kop(h)}: {nieuw_pad} bestaat niet")], []
    bron, bron_fouten = lees_verzen(bron_pad)
    nieuw, nieuw_fouten = lees_verzen(nieuw_pad)
    fouten = [Melding(None, None, tekst) for tekst in bron_fouten + nieuw_fouten]
    waarsch = []

    def melding(lijst, vers, soort, tekst):
        lijst.append(Melding(f"{h}:{vers}", soort, f"{h}:{vers} {tekst}"))

    if bron is None or nieuw is None:
        return fouten, waarsch  # een bestand dat parse_md weigert, valt niet te vergelijken
    for n in sorted(set(bron) - set(nieuw)):
        melding(fouten, n, None, "ontbreekt in de vereenvoudiging")
    for n in sorted(set(nieuw) - set(bron)):
        melding(fouten, n, None, "staat niet in de bron")
    gelogd = log_verzen(log_pad)
    if gelogd is None:
        waarsch.append(Melding(None, None, f"{boek.kop(h)}: geen wijzigingslog ({log_pad})"))
    for n in sorted(set(bron) & set(nieuw)):
        b, v = bron[n], nieuw[n]
        for soort in b["tags"]:
            if soort not in v["tags"]:
                melding(fouten, n, soort, f"opmaak '{soort}' uit de bron ontbreekt")
            elif b["tags"][soort] != v["tags"][soort]:
                melding(waarsch, n, soort, f"aantal '{soort}': bron {b['tags'][soort]}, nieuw {v['tags'][soort]}")
        for soort in v["tags"]:
            if soort not in b["tags"]:
                melding(waarsch, n, soort, f"opmaak '{soort}' staat niet in de bron")
        for patroon, paragraaf, uitleg in oude_vormen:
            for m in re.finditer(patroon, v["tekst"]):
                if re.search(patroon, b["tekst"]) is None:
                    continue  # komt alleen voor als het ook in de bron stond (dus niet nieuw ingevoerd)
                vorm = m.group(0).strip()
                melding(waarsch, n, vorm, f"oude vorm '{vorm}' ({paragraaf}: {uitleg})")
                break
        for patroon in vaste_begrippen:
            if re.search(patroon, b["tekst"]) and not re.search(patroon, v["tekst"]):
                melding(waarsch, n, patroon,
                        f"vast begrip /{patroon}/ (§15/§16) staat in de bron maar niet in de vereenvoudiging")
        if gelogd is not None and b["tekst"] != v["tekst"] and n not in gelogd:
            melding(waarsch, n, "wijzigingslog", "gewijzigd, maar niet in het wijzigingslog")
    return fouten, waarsch


def scheid_geaccepteerd(meldingen, geaccepteerd):
    """Splits meldingen in (open, [(melding, reden)]) volgens de geaccepteerde afwijkingen uit controle.json."""
    open_, ok = [], []
    for m in meldingen:
        reden = next((r for vers, soort, r in geaccepteerd if m.vers == vers and m.soort == soort), None)
        if reden is None:
            open_.append(m)
        else:
            ok.append((m, reden))
    return open_, ok


def main(argv=None):
    ap = argparse.ArgumentParser(description="Controleer vereenvoudigde hoofdstukken tegen de bron.")
    ap.add_argument("hoofdstukken", help="bv. 4, 1-3 of 1,4,5")
    ap.add_argument("--boek", help="map in bijbel/ (mag weg als er maar één boek is)")
    args = ap.parse_args(argv)
    try:
        boek = boekmod.laad(args.boek)
        hoofdstukken = boek.hoofdstukken(args.hoofdstukken)
        oude_vormen, vaste_begrippen = lees_lijsten()
        totaal_fout = 0
        for h in hoofdstukken:
            fouten, waarsch = controleer(boek, h, oude_vormen, vaste_begrippen)
            fouten, ok1 = scheid_geaccepteerd(fouten, boek.geaccepteerd)
            waarsch, ok2 = scheid_geaccepteerd(waarsch, boek.geaccepteerd)
            print(f"== {boek.kop(h)}: {len(fouten)} fouten, {len(waarsch)} waarschuwingen")
            for x in fouten:
                print("  FOUT        ", x.tekst)
            for x in waarsch:
                print("  WAARSCHUWING", x.tekst)
            for x, reden in ok1 + ok2:
                print("  GEACCEPTEERD", x.tekst, f"({reden})")
            totaal_fout += len(fouten)
    except boekmod.BoekFout as fout:
        print(f"FOUT: {fout}", file=sys.stderr)
        return 2
    return 1 if totaal_fout else 0


if __name__ == "__main__":
    sys.exit(main())
