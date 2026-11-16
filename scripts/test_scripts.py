#!/usr/bin/env python3
"""Tests van de scripts op een nep-boek "1 Johannes" in een tijdelijke map (niet in bijbel/).

Gebruik (vanuit de hoofdmap): python3 -I scripts/test_scripts.py

De scripts bepalen de hoofdmap uit hun eigen plek. De test kopieert ze daarom naar een
tijdelijke map met een eigen bijbel/ en draait ze daar als gewone commando's.
Het sjabloon is het Word-bestand van Lukas; de bijbel/lukas/-inhoud zelf wordt niet gebruikt.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

SCRIPTS = os.path.dirname(os.path.abspath(__file__))
HOOFDMAP = os.path.dirname(SCRIPTS)
SJABLOON = os.path.join(HOOFDMAP, "bijbel", "lukas", "origineel", "Lukas Jezus' woorden en highlights 1.0.docx")

BRON = {
    1: "# 1 Johannes 1\n\n[1] Wat van het begin af was, {eeuwigleven}het leven{/eeuwigleven} dat wij hebben gezien. "
       "[2] En {onderwijs}het leven is verschenen{/onderwijs}.\n",
    2: "# 1 Johannes 2\n\n[1] Mijn kinderen, dit schrijf ik u. [2] Hij is een verzoening voor onze zonden, de Heere.\n",
}
VEREENVOUDIGD = {
    1: "# 1 Johannes 1\n\n[1] Wat vanaf het begin was, {eeuwigleven}het leven{/eeuwigleven} dat wij hebben gezien. "
       "[2] En {onderwijs}het leven kwam{/onderwijs}.\n",
    2: "# 1 Johannes 2\n\n[1] Mijn kinderen, dit schrijf ik jullie. [2] Hij is een verzoening voor onze zonden, de Heere.\n",
}
WIJZIGINGSLOG = {
    1: "# Wijzigingslog 1 Johannes 1\n\n## Vers 1\n- **Wijziging:** begin af → vanaf het begin\n\n"
       "## Vers 2\n- **Wijziging:** is verschenen → kwam\n",
    2: "# Wijzigingslog 1 Johannes 2\n\n## Vers 1\n- **Wijziging:** u → jullie\n",
}


def schrijf(pad, tekst):
    os.makedirs(os.path.dirname(pad), exist_ok=True)
    with open(pad, "w", encoding="utf-8") as bestand:
        bestand.write(tekst)


def schrijf_json(pad, inhoud):
    schrijf(pad, json.dumps(inhoud, ensure_ascii=False))


def sjabloon_zonder_stijl(doel, styleid):
    """Kopie van het sjabloon waarin één stijl een andere naam heeft."""
    with zipfile.ZipFile(SJABLOON) as bron, zipfile.ZipFile(doel, "w") as uit:
        for info in bron.infolist():
            data = bron.read(info.filename)
            if info.filename == "word/styles.xml":
                data = data.decode("utf-8").replace(f'w:styleId="{styleid}"', f'w:styleId="{styleid}Weg"').encode("utf-8")
            uit.writestr(info.filename, data)


class Uitvoer:
    def __init__(self, resultaat):
        self.code = resultaat.returncode
        self.uit = resultaat.stdout
        self.fout = resultaat.stderr

    @property
    def alles(self):
        return self.uit + self.fout


class ScriptTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.map = tempfile.mkdtemp(prefix="bet-scripts-")
        os.makedirs(os.path.join(cls.map, "scripts"))
        for naam in os.listdir(SCRIPTS):
            if naam.endswith((".py", ".json")) and naam != os.path.basename(__file__):
                shutil.copy(os.path.join(SCRIPTS, naam), os.path.join(cls.map, "scripts", naam))
        cls.bijbel = os.path.join(cls.map, "bijbel")
        cls.maak_boek("joh")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.map, ignore_errors=True)

    @classmethod
    def maak_boek(cls, boek_id, bron=None, sjabloon=SJABLOON, verzen=(2, 2)):
        boekmap = os.path.join(cls.bijbel, boek_id)
        os.makedirs(os.path.join(boekmap, "origineel"), exist_ok=True)
        shutil.copy(sjabloon, os.path.join(boekmap, "origineel", "sjabloon.docx"))
        schrijf_json(os.path.join(boekmap, "boek.json"), {
            "naam": "1 Johannes", "bestandsprefix": "1joh", "sjabloon": "origineel/sjabloon.docx",
            "verzen_per_hoofdstuk": list(verzen)})
        for soort, inhoud in (("bron", bron or BRON), ("vereenvoudigd", VEREENVOUDIGD), ("wijzigingslog", WIJZIGINGSLOG)):
            for nummer, tekst in inhoud.items():
                schrijf(os.path.join(boekmap, soort, f"1joh-{nummer:02d}.md"), tekst)
        return boekmap

    def draai(self, script, *argumenten):
        resultaat = subprocess.run([sys.executable, "-I", os.path.join(self.map, "scripts", script), *argumenten],
                                   capture_output=True, text=True, cwd=self.map)
        uitvoer = Uitvoer(resultaat)
        self.assertNotIn("Traceback", uitvoer.fout, f"{script} {argumenten}: {uitvoer.fout}")
        return uitvoer

    def verwijder_controle(self):
        controle = os.path.join(self.bijbel, "joh", "controle.json")
        if os.path.exists(controle):
            os.remove(controle)

    def setUp(self):
        self.verwijder_controle()

    def document_xml(self, docx):
        with zipfile.ZipFile(docx) as z:
            return z.read("word/document.xml").decode("utf-8")


class BoekMetCijferInDeNaam(ScriptTest):
    def test_heen_en_terug_geeft_de_bron_terug(self):
        uitvoer = self.draai("controleer_heen_en_terug.py", "--boek", "joh")
        self.assertEqual((uitvoer.code, uitvoer.uit.strip()), (0, "1 Johannes: 2 bestanden gelijk na heen en terug"))

    def test_heen_en_terug_meldt_een_bestand_dat_niet_gelijk_terugkomt(self):
        # twee spaties achter elkaar komen na Word als één spatie terug
        boekmap = self.maak_boek("verschil", bron={1: BRON[1].replace("begin af", "begin  af"), 2: BRON[2]})
        uitvoer = self.draai("controleer_heen_en_terug.py", "--boek", "verschil")
        self.assertEqual(uitvoer.code, 1)
        self.assertIn("VERSCHIL 1joh-01.md: verschilt van de bron", uitvoer.uit)
        self.assertNotIn("1joh-02.md", uitvoer.uit)
        shutil.rmtree(boekmap)

    def test_review_telt_de_hoofdstukken_en_verzen_van_het_boek(self):
        docx = os.path.join(self.map, "review.docx")
        uitvoer = self.draai("md_naar_docx.py", "--boek", "joh", "review", "--hoofdstuk", "1-2", "-o", docx)
        self.assertEqual(uitvoer.code, 0, uitvoer.fout)
        xml = self.document_xml(docx)
        self.assertIn("Reviewdocument 1 Johannes 1, 2", xml)
        self.assertIn(">2:1<", xml)
        self.assertIn(">2:2<", xml)

    def test_controleer_hoofdstuk_leest_beide_hoofdstukken(self):
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "1-2")
        self.assertEqual(uitvoer.code, 0, uitvoer.alles)
        self.assertIn("== 1 Johannes 1: 0 fouten, 0 waarschuwingen", uitvoer.uit)
        self.assertIn("== 1 Johannes 2: 0 fouten, 1 waarschuwingen", uitvoer.uit)
        self.assertIn("oude vorm 'Heere'", uitvoer.uit)

    def test_controleer_docx_md_herkent_beide_hoofdstukken(self):
        docx = os.path.join(self.map, "doc.docx")
        bronnen = [os.path.join(self.bijbel, "joh", "bron", f"1joh-{n:02d}.md") for n in (1, 2)]
        self.draai("md_naar_docx.py", "--boek", "joh", "doc", *bronnen, "-o", docx)
        uitvoer = self.draai("controleer_docx_md.py", "--boek", "joh", docx, os.path.join(self.bijbel, "joh", "bron"))
        self.assertEqual(uitvoer.code, 0, uitvoer.alles)
        self.assertIn("1 Johannes 1: 2 verzen (verwacht 2)", uitvoer.uit)
        self.assertIn("1 Johannes 2: 2 verzen (verwacht 2)", uitvoer.uit)
        self.assertIn("TEKST (zonder witruimte, ", uitvoer.uit)
        self.assertIn("GELIJK", uitvoer.uit)


class GeaccepteerdeAfwijkingenInDocx(ScriptTest):
    def setUp(self):
        super().setUp()
        self.docx = os.path.join(self.map, "doc.docx")
        bronnen = [os.path.join(self.bijbel, "joh", "bron", f"1joh-{n:02d}.md") for n in (1, 2)]
        self.draai("md_naar_docx.py", "--boek", "joh", "doc", *bronnen, "-o", self.docx)
        self.mdmap = os.path.join(self.map, "md-met-extra-vet")
        shutil.rmtree(self.mdmap, ignore_errors=True)
        for nummer, tekst in BRON.items():
            schrijf(os.path.join(self.mdmap, f"1joh-{nummer:02d}.md"), tekst.replace("het begin af", "{vet}het begin af{/vet}"))

    def test_een_afwijking_die_niet_geaccepteerd_is_geeft_exit_1(self):
        uitvoer = self.draai("controleer_docx_md.py", "--boek", "joh", self.docx, self.mdmap)
        self.assertEqual(uitvoer.code, 1)
        self.assertIn("AFWIJKING H1 vet: md 1, docx 0", uitvoer.uit)
        self.assertIn("TOTAAL AANTAL PROBLEMEN: 1", uitvoer.uit)

    def test_een_afwijking_in_controle_json_geeft_exit_0_met_de_reden(self):
        schrijf_json(os.path.join(self.bijbel, "joh", "controle.json"),
                     {"docx_geaccepteerd": [{"hoofdstuk": 1, "opmaak": "vet", "reden": "vet is bewust toegevoegd"}]})
        uitvoer = self.draai("controleer_docx_md.py", "--boek", "joh", self.docx, self.mdmap)
        self.assertEqual(uitvoer.code, 0, uitvoer.alles)
        self.assertIn("GEACCEPTEERD H1 vet: md 1, docx 0 (vet is bewust toegevoegd)", uitvoer.uit)
        self.assertIn("TOTAAL AANTAL PROBLEMEN: 0", uitvoer.uit)

    def test_een_ander_hoofdstuk_of_andere_opmaak_accepteert_niets(self):
        schrijf_json(os.path.join(self.bijbel, "joh", "controle.json"), {"docx_geaccepteerd": [
            {"hoofdstuk": 2, "opmaak": "vet", "reden": "ander hoofdstuk"},
            {"hoofdstuk": 1, "opmaak": "cursief", "reden": "andere opmaak"}]})
        uitvoer = self.draai("controleer_docx_md.py", "--boek", "joh", self.docx, self.mdmap)
        self.assertEqual(uitvoer.code, 1)
        self.assertNotIn("GEACCEPTEERD", uitvoer.uit)


class ControleJson(ScriptTest):
    def test_een_bestand_met_alleen_geaccepteerd_werkt(self):
        schrijf_json(os.path.join(self.bijbel, "joh", "controle.json"), {"geaccepteerd": []})
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "1")
        self.assertEqual(uitvoer.code, 0, uitvoer.alles)

    def test_oude_vormen_van_het_boek_komen_bovenop_de_algemene_lijst(self):
        schrijf_json(os.path.join(self.bijbel, "joh", "controle.json"),
                     {"oude_vormen": [["\\bkinderen\\b", "precedent", "kinderen → kids"]]})
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "2")
        self.assertIn("oude vorm 'kinderen' (precedent: kinderen → kids)", uitvoer.uit)
        self.assertIn("oude vorm 'Heere'", uitvoer.uit)

    def test_geaccepteerd_matcht_op_vers_en_soort(self):
        schrijf_json(os.path.join(self.bijbel, "joh", "controle.json"),
                     {"geaccepteerd": [{"vers": "2:2", "soort": "Heere", "reden": "naam in de bron"}]})
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "2")
        self.assertIn("== 1 Johannes 2: 0 fouten, 0 waarschuwingen", uitvoer.uit)
        self.assertIn("GEACCEPTEERD 2:2 oude vorm 'Heere'", uitvoer.uit)

    def test_geaccepteerd_voor_een_ander_vers_accepteert_niets(self):
        schrijf_json(os.path.join(self.bijbel, "joh", "controle.json"),
                     {"geaccepteerd": [{"vers": "2:1", "soort": "Heere", "reden": "ander vers"}]})
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "2")
        self.assertIn("== 1 Johannes 2: 0 fouten, 1 waarschuwingen", uitvoer.uit)

    def test_een_onjuist_item_is_een_nette_fout(self):
        schrijf_json(os.path.join(self.bijbel, "joh", "controle.json"), {"geaccepteerd": [{"vers": "2:2"}]})
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "2")
        self.assertEqual(uitvoer.code, 2)
        self.assertIn("FOUT:", uitvoer.fout)
        self.assertIn("geaccepteerd", uitvoer.fout)


class NetteFouten(ScriptTest):
    def test_een_ongeldig_hoofdstukbereik_is_een_fout_met_exit_2(self):
        for spec, woorden in (("3-1", "loopt terug"), ("0", "bestaat niet"), ("99", "bestaat niet"),
                              ("abc", "ongeldig"), ("1-", "ongeldig"), ("", "ongeldig")):
            with self.subTest(spec=spec):
                uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", spec)
                self.assertEqual(uitvoer.code, 2)
                self.assertIn("FOUT:", uitvoer.fout)
                self.assertIn(woorden, uitvoer.fout)
                self.assertEqual(uitvoer.uit, "")

    def test_review_met_een_hoofdstuk_buiten_het_boek_is_een_fout(self):
        uitvoer = self.draai("md_naar_docx.py", "--boek", "joh", "review", "--hoofdstuk", "2-3", "-o",
                             os.path.join(self.map, "x.docx"))
        self.assertEqual(uitvoer.code, 2)
        self.assertIn("hoofdstuk 3 bestaat niet", uitvoer.fout)

    def test_een_boek_json_die_geen_json_is(self):
        schrijf(os.path.join(self.bijbel, "kapot", "boek.json"), "{ dit is geen json")
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "kapot", "1")
        self.assertEqual(uitvoer.code, 2)
        self.assertIn("geen geldige JSON", uitvoer.fout)

    def test_een_boek_json_zonder_verzen_per_hoofdstuk(self):
        schrijf_json(os.path.join(self.bijbel, "leeg", "boek.json"), {"naam": "X", "bestandsprefix": "x", "sjabloon": "s.docx"})
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "leeg", "1")
        self.assertEqual(uitvoer.code, 2)
        self.assertIn("verwacht naam, bestandsprefix, sjabloon en verzen_per_hoofdstuk", uitvoer.fout)

    def test_een_onbekend_boek_noemt_de_beschikbare(self):
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "nergens", "1")
        self.assertEqual(uitvoer.code, 2)
        self.assertIn("beschikbaar:", uitvoer.fout)

    def test_een_ontbrekende_bron_is_een_fout_in_het_hoofdstuk(self):
        os.remove(os.path.join(self.bijbel, "joh", "bron", "1joh-02.md"))
        try:
            uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "2")
        finally:
            schrijf(os.path.join(self.bijbel, "joh", "bron", "1joh-02.md"), BRON[2])
        self.assertEqual(uitvoer.code, 1)
        self.assertIn("FOUT", uitvoer.uit)
        self.assertIn("kan niet lezen", uitvoer.uit)

    def test_een_docx_die_niet_bestaat_of_geen_docx_is(self):
        schrijf(os.path.join(self.map, "geen.docx"), "tekst")
        for docx in (os.path.join(self.map, "nergens.docx"), os.path.join(self.map, "geen.docx")):
            with self.subTest(docx=docx):
                uitvoer = self.draai("docx_naar_md.py", "--boek", "joh", docx, os.path.join(self.map, "uit"))
                self.assertEqual(uitvoer.code, 2)
                self.assertIn("FOUT:", uitvoer.fout)

    def test_controleer_docx_md_met_een_lege_mdmap(self):
        os.makedirs(os.path.join(self.map, "leeg-md"), exist_ok=True)
        uitvoer = self.draai("controleer_docx_md.py", "--boek", "joh", SJABLOON, os.path.join(self.map, "leeg-md"))
        self.assertEqual(uitvoer.code, 2)
        self.assertIn("bevat geen 1joh-NN.md", uitvoer.fout)


class OngeldigFormaat(ScriptTest):
    def met_vereenvoudigd(self, nummer, tekst):
        pad = os.path.join(self.bijbel, "joh", "vereenvoudigd", f"1joh-{nummer:02d}.md")
        origineel = VEREENVOUDIGD[nummer]
        schrijf(pad, tekst)
        self.addCleanup(schrijf, pad, origineel)

    def test_controleer_hoofdstuk_meldt_een_onbekende_tag_als_fout_met_regelnummer(self):
        self.met_vereenvoudigd(1, VEREENVOUDIGD[1].replace("het leven kwam", "{foo}het leven kwam{/foo}"))
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "1")
        self.assertEqual(uitvoer.code, 1)
        self.assertIn("1joh-01.md:3: onbekende tag '{foo}'", uitvoer.uit)

    def test_controleer_hoofdstuk_weigert_tags_in_de_verkeerde_volgorde(self):
        self.met_vereenvoudigd(1, VEREENVOUDIGD[1].replace(
            "het leven kwam", "{cursief}{vet}het leven kwam{/vet}{/cursief}"))
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "1")
        self.assertEqual(uitvoer.code, 1)
        self.assertIn("{vet} hoort buiten {cursief}", uitvoer.uit)

    def test_controleer_hoofdstuk_weigert_een_regel_met_alleen_spaties(self):
        self.met_vereenvoudigd(1, VEREENVOUDIGD[1].replace("\n\n", "\n  \n", 1))
        uitvoer = self.draai("controleer_hoofdstuk.py", "--boek", "joh", "1")
        self.assertEqual(uitvoer.code, 1)
        self.assertIn("regel met alleen witruimte", uitvoer.uit)

    def test_review_weigert_drie_lege_regels(self):
        self.met_vereenvoudigd(1, VEREENVOUDIGD[1].replace("\n\n", "\n\n\n\n", 1))
        uitvoer = self.draai("md_naar_docx.py", "--boek", "joh", "review", "--hoofdstuk", "1", "-o",
                             os.path.join(self.map, "x.docx"))
        self.assertEqual(uitvoer.code, 2)
        self.assertIn("meer dan 2 lege regels achter elkaar", uitvoer.fout)


class SjabloonStijlen(ScriptTest):
    def test_een_sjabloon_zonder_stijl_geeft_een_fout_met_de_naam(self):
        zonder_torah = os.path.join(self.map, "zonder-torah.docx")
        sjabloon_zonder_stijl(zonder_torah, "Torah")
        self.maak_boek("zonder", sjabloon=zonder_torah)
        uitvoer = self.draai("md_naar_docx.py", "--boek", "zonder", "doc",
                             os.path.join(self.bijbel, "zonder", "bron", "1joh-01.md"), "-o", os.path.join(self.map, "x.docx"))
        self.assertEqual(uitvoer.code, 2)
        self.assertIn("mist stijlen", uitvoer.fout)
        self.assertIn("stijl 'Torah' (character) ontbreekt", uitvoer.fout)

    def test_een_sjabloon_zonder_alineastijl_noemt_die_stijl(self):
        zonder_kop = os.path.join(self.map, "zonder-kop.docx")
        sjabloon_zonder_stijl(zonder_kop, "Kop2")
        self.maak_boek("zonderkop", sjabloon=zonder_kop)
        uitvoer = self.draai("md_naar_docx.py", "--boek", "zonderkop", "review", "--hoofdstuk", "1", "-o",
                             os.path.join(self.map, "x.docx"))
        self.assertEqual(uitvoer.code, 2)
        self.assertIn("stijl 'Kop2' (paragraph) ontbreekt", uitvoer.fout)

    def test_het_sjabloon_van_het_boek_heeft_alle_stijlen(self):
        uitvoer = self.draai("md_naar_docx.py", "--boek", "joh", "doc",
                             os.path.join(self.bijbel, "joh", "bron", "1joh-01.md"), "-o", os.path.join(self.map, "x.docx"))
        self.assertEqual(uitvoer.code, 0, uitvoer.fout)


if __name__ == "__main__":
    unittest.main(verbosity=1)
