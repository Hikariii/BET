#!/usr/bin/env python3
"""Controleer een vereenvoudigd hoofdstuk tegen de bron (WERKPLAN stap 3, automatisch deel).

Gebruik:
    python3 -I scripts/controleer_hoofdstuk.py 4                # bijbel/<boek>/bron/… vs vereenvoudigd/…
    python3 -I scripts/controleer_hoofdstuk.py 1-3 --boek lukas
    (--boek mag weg zolang er maar één boek in bijbel/ staat)

Meldt:
  FOUT         versnummers ontbreken/dubbel/volgorde, tags niet in balans,
               een opmaaksoort uit de bron ontbreekt in het vers
  WAARSCHUWING aantal tags per vers verschilt, oude vormen (§11 e.a.),
               vaste begrippen (§15) verdwenen, vers niet in het wijzigingslog
Exitcode 1 bij een FOUT.
"""
import argparse
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boek as boekmod  # noqa: E402

TAG_RE = re.compile(r"\{(/?)([a-z-]+)\}|==")
VERS_RE = re.compile(r"\[(\d+)\]")
PSTIJL_RE = re.compile(r"^@([a-z-]+) ")

# Oude/ongewenste vormen in de vereenvoudiging (regex, paragraaf, uitleg), uit de richtlijn.
# Vormen uit de precedenten van een boek staan in bijbel/<boek>/controle.json.
OUDE_VORMEN = [
    (r"\bHeere\b", "§11", "Heere → Heer"),
    (r"\bgeschiedde\b|\bgeschieden\b", "§11", "geschiedde → gebeurde"),
    (r"\bbevreesd\b", "§11", "bevreesd → bang"),
    (r"\bondertrouwd", "§11", "ondertrouwd → verloofd"),
    (r"\baangezien\b", "§11", "aangezien → omdat"),
    (r"\bgereed\b|\bgereed(?!maken)\w+", "§11", "gereed → klaar (behalve 'gereedmaken' bij een volk)"),
    (r"\b[Ee]n zie\b|(^|[.:;!?“\"] *)[Zz]ie,", "§7A", "'zie' weglaten of 'Kijk'"),
    (r"\b(baren|baarde|gebaard)\b", "§11", "baren → krijgen / ter wereld brengen"),
    (r"\bwelbehagen\b", "§11", "welbehagen → blij zijn met"),
    (r"\bZaligmaker\b", "§17", "Zaligmaker → Redder"),
    (r"\b[Zz]alig(heid)?\b", "§17", "zalig → gezegend/gered; zaligheid → redding"),
    (r"\b[Hh]eidenen\b", "§17", "heidenen → niet-Joodse volken / niet-Joden"),
    (r"\bEvangelie\b", "§22", "Evangelie → het Goede Nieuws"),
    (r"\bverwonder", "§18", "verwonderd → onder de indruk / verbaasd"),
    (r"\bbarmhartig", "§17", "barmhartigheid → goedheid en medeleven"),
    (r"\b(gedoopt|dopen|doopte|doop)\b", "§17A", "dopen → onderdompelen"),
    (r"\b(loofde|loofden|loven)\b", "§11", "loven → prijzen"),
    (r"\b(dienst)?knecht(en)?\b", "§11", "knecht → dienaar"),
    (r"\bmenigte\b", "§11", "menigte → (de) mensen / grote groep"),
    (r"\bverheug", "§11", "zich verheugen → blij zijn"),
    (r"\bonvruchtbaar\b", "§11", "onvruchtbaar → geen kinderen kunnen krijgen"),
    (r"\bopdat\b", "§7A", "opdat → zodat / zo"),
    (r"\bantwoordde en zei\b", "§7A", "antwoordde en zei → antwoordde"),
    (r"\bvan wie de naam\b", "§7A", "van wie de naam X was → die X heette"),
    (r"\bstadhouder\b", "§28", "stadhouder → bestuurder"),
    (r"\bviervorst\b", "§28", "viervorst → heerser"),
    (r"\bprofeteer", "§17", "profeteren → woorden van God doorgeven"),
    (r"\bgodvrezend\b", "§17", "godvrezend → ontzag hebben voor God"),
    (r"\bdes\b", "§11", "'des' (ouderwetse genitief) vervangen"),
]

# Vaste begrippen (§15): als ze in het bronvers staan, moeten ze in het vereenvoudigde vers staan
VASTE_BEGRIPPEN = [
    r"Christus", r"Messias", r"Zoon van God|Gods Zoon", r"Heilige Geest", r"Allerhoogste",
    r"Koninkrijk van God", r"[Pp]rofeet", r"[Pp]rofeten", r"Rabbi", r"[Vv]erbond",
    r"[Tt]empel", r"[Ss]abbat", r"[Ss]ynagoge", r"Torah", r"[Aa]postel",
]


def lees_verzen(pad):
    """Geeft (verzen, fouten). verzen: dict n -> {'tekst': platte tekst, 'tags': Counter, 'ruw': str}."""
    fouten = []
    verzen = {}
    volgorde = []
    huidig = None
    open_tags = []
    with open(pad, encoding="utf-8") as f:
        regels = f.read().split("\n")
    for nr, regel in enumerate(regels, 1):
        if regel.startswith("# "):
            continue
        m = PSTIJL_RE.match(regel)
        pstijl = None
        if m:
            pstijl = m.group(1)
            regel = regel[m.end():]
        if open_tags:
            fouten.append(f"{os.path.basename(pad)}:{nr}: tag(s) niet gesloten aan eind van vorige regel: {open_tags}")
            open_tags = []
        if pstijl and huidig is not None:
            verzen[huidig]["tags"]["@" + pstijl] += 1
        pos = 0
        for vm in list(VERS_RE.finditer(regel)) + [None]:
            stuk = regel[pos: vm.start() if vm else len(regel)]
            if huidig is not None and stuk:
                v = verzen[huidig]
                v["ruw"] += stuk
                for t in TAG_RE.finditer(stuk):
                    if t.group(0) == "==":
                        if open_tags and open_tags[-1] == "==":
                            open_tags.pop()
                        else:
                            open_tags.append("==")
                            v["tags"]["highlight"] += 1
                    elif t.group(1):
                        if not open_tags or open_tags[-1] != t.group(2):
                            fouten.append(f"{os.path.basename(pad)}:{nr}: sluittag {{/{t.group(2)}}} past niet (open: {open_tags})")
                        else:
                            open_tags.pop()
                    else:
                        open_tags.append(t.group(2))
                        v["tags"][t.group(2)] += 1
            if vm is None:
                break
            if open_tags:
                fouten.append(f"{os.path.basename(pad)}:{nr}: tag(s) {open_tags} lopen over versgrens [{vm.group(1)}]")
                open_tags = []
            huidig = int(vm.group(1))
            if huidig in verzen:
                fouten.append(f"{os.path.basename(pad)}:{nr}: vers {huidig} komt dubbel voor")
            else:
                verzen[huidig] = {"tags": Counter(), "ruw": ""}
                volgorde.append(huidig)
            if pstijl and regel[:vm.start()].strip() == "":
                verzen[huidig]["tags"]["@" + pstijl] += 1
            pos = vm.end()
        if huidig is not None:
            verzen[huidig]["ruw"] += " "
    if volgorde != sorted(volgorde) or (volgorde and volgorde != list(range(1, len(volgorde) + 1))):
        fouten.append(f"{os.path.basename(pad)}: versnummers niet doorlopend 1..n")
    for v in verzen.values():
        v["tekst"] = " ".join(TAG_RE.sub("", v["ruw"]).split())
    return verzen, fouten


def log_verzen(pad):
    if not os.path.exists(pad):
        return None
    gevonden = set()
    with open(pad, encoding="utf-8") as f:
        for m in re.finditer(r"^## Vers (\d+)(?:\s*[-–]\s*(\d+))?", f.read(), re.M):
            a = int(m.group(1))
            b = int(m.group(2) or a)
            gevonden.update(range(a, b + 1))
    return gevonden


def controleer(boek, h):
    bron_pad = boek.pad("bron", h)
    nieuw_pad = boek.pad("vereenvoudigd", h)
    log_pad = boek.pad("wijzigingslog", h)
    oude_vormen = OUDE_VORMEN + boek.extra_oude_vormen()
    fouten, waarsch = [], []
    if not os.path.exists(nieuw_pad):
        return [f"{boek.kop(h)}: {nieuw_pad} bestaat niet"], []
    bron, f1 = lees_verzen(bron_pad)
    nieuw, f2 = lees_verzen(nieuw_pad)
    fouten += f1 + f2
    for n in sorted(set(bron) - set(nieuw)):
        fouten.append(f"{h}:{n} ontbreekt in de vereenvoudiging")
    for n in sorted(set(nieuw) - set(bron)):
        fouten.append(f"{h}:{n} staat niet in de bron")
    gelogd = log_verzen(log_pad)
    if gelogd is None:
        waarsch.append(f"{boek.kop(h)}: geen wijzigingslog ({log_pad})")
    for n in sorted(set(bron) & set(nieuw)):
        b, v = bron[n], nieuw[n]
        for soort in b["tags"]:
            if soort not in v["tags"]:
                fouten.append(f"{h}:{n} opmaak '{soort}' uit de bron ontbreekt")
            elif b["tags"][soort] != v["tags"][soort]:
                waarsch.append(f"{h}:{n} aantal '{soort}': bron {b['tags'][soort]}, nieuw {v['tags'][soort]}")
        for soort in v["tags"]:
            if soort not in b["tags"]:
                waarsch.append(f"{h}:{n} opmaak '{soort}' staat niet in de bron")
        for patroon, par, uitleg in oude_vormen:
            for m in re.finditer(patroon, v["tekst"]):
                if re.search(patroon, b["tekst"]) is None:
                    continue  # komt alleen voor als het ook in de bron stond (dus niet nieuw ingevoerd)
                waarsch.append(f"{h}:{n} oude vorm '{m.group(0).strip()}' ({par}: {uitleg})")
                break
        for patroon in VASTE_BEGRIPPEN:
            if re.search(patroon, b["tekst"]) and not re.search(patroon, v["tekst"]):
                waarsch.append(f"{h}:{n} vast begrip /{patroon}/ (§15/§16) staat in de bron maar niet in de vereenvoudiging")
        if gelogd is not None and b["tekst"] != v["tekst"] and n not in gelogd:
            waarsch.append(f"{h}:{n} gewijzigd, maar niet in het wijzigingslog")
    return fouten, waarsch


def main():
    ap = argparse.ArgumentParser(description="Controleer vereenvoudigde hoofdstukken tegen de bron.")
    ap.add_argument("hoofdstukken", help="bv. 4, 1-3 of 1,4,5")
    ap.add_argument("--boek", help="map in bijbel/ (mag weg als er maar één boek is)")
    args = ap.parse_args()
    try:
        boek = boekmod.laad(args.boek)
    except boekmod.BoekFout as e:
        print(f"FOUT: {e}", file=sys.stderr)
        sys.exit(2)
    hoofdstukken = []
    for deel in args.hoofdstukken.split(","):
        if "-" in deel:
            a, b = deel.split("-")
            hoofdstukken.extend(range(int(a), int(b) + 1))
        else:
            hoofdstukken.append(int(deel))
    totaal_fout = 0
    for h in hoofdstukken:
        fouten, waarsch = controleer(boek, h)
        print(f"== {boek.kop(h)}: {len(fouten)} fouten, {len(waarsch)} waarschuwingen")
        for x in fouten:
            print("  FOUT        ", x)
        for x in waarsch:
            print("  WAARSCHUWING", x)
        totaal_fout += len(fouten)
    sys.exit(1 if totaal_fout else 0)


if __name__ == "__main__":
    main()
