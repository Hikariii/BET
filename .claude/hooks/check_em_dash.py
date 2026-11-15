#!/usr/bin/env python3
"""PreToolUse-hook (Write, Edit, MultiEdit): blokkeert een em-dash (U+2014) in nieuwe tekst.

Regel: .claude/skills/writing/SKILL.md. Alleen de tekst die de tool toevoegt wordt gecontroleerd,
niet wat er al in het bestand stond.

Uitzonderingen (de em-dash is daar een vast scheidingsteken of de tekst is van de redactie):
zie UITZONDERINGEN. Bestanden buiten de repo worden niet gecontroleerd.
In Markdown tellen code (``` en `...`), URL's en citaatregels (>) niet mee.
In code: schrijf het teken als escape (\\u2014) als het echt in de uitvoer moet.

Exitcode 2 met de gevonden regels op stderr blokkeert de tool; 0 laat hem door.
"""
import fnmatch
import json
import os
import re
import sys

EM_DASH = "\u2014"

UITZONDERINGEN = [
    "bijbel/*/wijzigingslog/*",
    "bijbel/*/referentie/*",
    "sjablonen/*",
    "richtlijn/*",
]

CODEBLOK = re.compile(r"^(\s*)(```|~~~).*?^\1\2[^\n]*$", re.S | re.M)
INLINE_CODE = re.compile(r"`[^`\n]*`")
URL = re.compile(r"https?://\S+")
CITAAT = re.compile(r"^\s*>.*$", re.M)


def maskeer(tekst):
    """Vervang niet-proza door spaties, met behoud van regelnummers."""
    leeg = lambda m: re.sub(r"[^\n]", " ", m.group(0))
    for patroon in (CODEBLOK, INLINE_CODE, URL, CITAAT):
        tekst = patroon.sub(leeg, tekst)
    return tekst


def is_uitgezonderd(pad, project):
    pad = os.path.abspath(pad)
    project = os.path.abspath(project)
    if not pad.startswith(project + os.sep):
        return True
    relatief = os.path.relpath(pad, project)
    return any(fnmatch.fnmatch(relatief, p) for p in UITZONDERINGEN)


def nieuwe_teksten(tool_input):
    if "content" in tool_input:
        return [tool_input["content"]]
    if "new_string" in tool_input:
        return [tool_input["new_string"]]
    return [e.get("new_string", "") for e in tool_input.get("edits", [])]


def vind(tekst, is_markdown):
    gemaskeerd = maskeer(tekst) if is_markdown else tekst
    regels = tekst.split("\n")
    return [(i + 1, regels[i].strip()) for i, r in enumerate(gemaskeerd.split("\n")) if EM_DASH in r]


def main():
    try:
        invoer = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    tool_input = invoer.get("tool_input") or {}
    pad = tool_input.get("file_path", "")
    project = os.environ.get("CLAUDE_PROJECT_DIR") or invoer.get("cwd") or os.getcwd()
    if not pad or is_uitgezonderd(pad, project):
        return 0
    is_markdown = pad.endswith((".md", ".markdown"))
    treffers = [t for tekst in nieuwe_teksten(tool_input) for t in vind(tekst, is_markdown)]
    if not treffers:
        return 0
    print(f"Em-dash (U+2014) in {os.path.relpath(pad, project)} is niet toegestaan "
          "(.claude/skills/writing/SKILL.md). Herschrijf de zin: een punt, dubbele punt, "
          "komma of haakjes. In code: gebruik de escape \\u2014 als het teken in de uitvoer moet.",
          file=sys.stderr)
    for nr, regel in treffers[:10]:
        print(f"  regel {nr}: {regel[:160]}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
