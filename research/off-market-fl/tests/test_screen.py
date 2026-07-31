"""Tests for the Florida off-market screen.

All fixture data here is synthetic. Parcel IDs, owner names and addresses are
invented for the purpose of exercising the code and do not describe real
property or real people.

Run with:  python3 -m unittest discover -s tests -v
"""

from __future__ import annotations

import csv
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from flscreen import dossier, hud  # noqa: E402
from flscreen.dor_codes import (  # noqa: E402
    DISTRESS_QUAL_CODES,
    asset_class_codes,
    describe_use,
)
from flscreen.lenders import classify_owner, is_entity_owner  # noqa: E402
from flscreen.pipeline import (  # noqa: E402
    Filters,
    RunStats,
    collect_benchmarks,
    resolve_inputs,
    screen,
    write_csv,
)
from flscreen.schema import (  # noqa: E402
    COUNTY_BY_CODE,
    NAL_ALIASES,
    Row,
    build_column_map,
    resolve_county,
)

# The subset of NAL columns the fixtures write, in the department's spelling.
FIXTURE_HEADER = [
    "CO_NO", "PARCEL_ID", "ASMNT_YR", "DOR_UC", "JV", "JV_CHNG", "LND_VAL",
    "LND_SQFOOT", "ACT_YR_BLT", "EFF_YR_BLT", "TOT_LVG_AREA", "NO_BULDNG",
    "NO_RES_UNTS", "OWN_NAME", "OWN_ADDR1", "OWN_CITY", "OWN_STATE", "OWN_ZIPCD",
    "PHY_ADDR1", "PHY_CITY", "PHY_ZIPCD", "SALE_PRC1", "SALE_YR1", "SALE_MO1",
    "QUAL_CD1", "SALE_PRC2", "SALE_YR2", "QUAL_CD2", "S_LEGAL",
]


def parcel_row(**overrides) -> list[str]:
    """One synthetic NAL row, with sane defaults."""
    values = {
        "CO_NO": "23", "PARCEL_ID": "00-0000-000-0000", "ASMNT_YR": "2025",
        "DOR_UC": "003", "JV": "12000000", "JV_CHNG": "0", "LND_VAL": "3000000",
        "LND_SQFOOT": "120000", "ACT_YR_BLT": "1998", "EFF_YR_BLT": "2004",
        "TOT_LVG_AREA": "140000", "NO_BULDNG": "6", "NO_RES_UNTS": "150",
        "OWN_NAME": "SYNTHETIC HOLDINGS LLC", "OWN_ADDR1": "1 EXAMPLE PLAZA",
        "OWN_CITY": "MIAMI", "OWN_STATE": "FL", "OWN_ZIPCD": "33131",
        "PHY_ADDR1": "100 EXAMPLE ST", "PHY_CITY": "MIAMI", "PHY_ZIPCD": "33131",
        "SALE_PRC1": "9000000", "SALE_YR1": "2015", "SALE_MO1": "06",
        "QUAL_CD1": "01", "SALE_PRC2": "", "SALE_YR2": "", "QUAL_CD2": "",
        "S_LEGAL": "SYNTHETIC SUBDIVISION BLK 1",
    }
    values.update(overrides)
    return [str(values[column]) for column in FIXTURE_HEADER]


def write_roll(path: Path, rows: list[list[str]], header: list[str] | None = None) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header or FIXTURE_HEADER)
        writer.writerows(rows)


def baseline_rows(count: int = 12, **overrides) -> list[list[str]]:
    """Enough ordinary parcels to clear the benchmark minimum sample size."""
    return [
        parcel_row(PARCEL_ID=f"BASE-{i:04d}", **overrides)
        for i in range(count)
    ]


# ---------------------------------------------------------------------------


class TestSchema(unittest.TestCase):
    def test_county_numbering_covers_all_67(self):
        self.assertEqual(len(COUNTY_BY_CODE), 67)
        self.assertEqual(min(COUNTY_BY_CODE), 11)
        self.assertEqual(max(COUNTY_BY_CODE), 77)
        # Spot-check the anchors confirmed against the DOR county-number map.
        self.assertEqual(COUNTY_BY_CODE[11], "Alachua")
        self.assertEqual(COUNTY_BY_CODE[23], "Miami-Dade")
        self.assertEqual(COUNTY_BY_CODE[26], "Duval")
        self.assertEqual(COUNTY_BY_CODE[60], "Palm Beach")
        self.assertEqual(COUNTY_BY_CODE[77], "Washington")

    def test_resolve_county_accepts_names_and_numbers(self):
        self.assertEqual(resolve_county("Miami-Dade"), 23)
        self.assertEqual(resolve_county("miami dade"), 23)
        self.assertEqual(resolve_county("Dade"), 23)
        self.assertEqual(resolve_county("St. Lucie"), 66)
        self.assertEqual(resolve_county("60"), 60)
        self.assertIsNone(resolve_county("Nowhere"))
        self.assertIsNone(resolve_county("999"))

    def test_header_aliases_survive_spelling_drift(self):
        drifted = ["co_no", "Parcel ID", "DOR-UC", "JV", "OWN_NAME", "ACT_YR_BLT"]
        column_map = build_column_map(drifted, NAL_ALIASES)
        for field in ("county_no", "parcel_id", "dor_use_code", "just_value",
                      "owner_name", "act_year_built"):
            self.assertTrue(column_map.has(field), f"{field} should resolve")

    def test_row_getters_tolerate_dirty_values(self):
        header = ["JV", "ACT_YR_BLT", "DOR_UC", "NO_RES_UNTS"]
        column_map = build_column_map(header, NAL_ALIASES)

        row = Row(["$1,250,000.00", " 1972 ", "003", ""], column_map)
        self.assertEqual(row.number("just_value"), 1250000.0)
        self.assertEqual(row.year("act_year_built"), 1972)
        self.assertEqual(row.code("dor_use_code"), 3)
        self.assertIsNone(row.integer("n_res_units"))

        blank = Row(["", "0", "", ""], column_map)
        self.assertIsNone(blank.number("just_value"))
        self.assertIsNone(blank.year("act_year_built"))

        short = Row(["500"], column_map)  # row truncated mid-record
        self.assertEqual(short.number("just_value"), 500.0)
        self.assertIsNone(short.year("act_year_built"))

    def test_two_digit_years_normalise(self):
        column_map = build_column_map(["ACT_YR_BLT"], NAL_ALIASES)
        self.assertEqual(Row(["72"], column_map).year("act_year_built"), 1972)
        self.assertEqual(Row(["05"], column_map).year("act_year_built"), 2005)


class TestUseCodes(unittest.TestCase):
    def test_multifamily_is_code_three(self):
        self.assertEqual(asset_class_codes("multifamily"), (3,))
        self.assertIn("10 units or more", describe_use(3))

    def test_industrial_and_commercial_ranges(self):
        self.assertEqual(asset_class_codes("industrial"), tuple(range(40, 50)))
        self.assertEqual(asset_class_codes("commercial"), tuple(range(10, 40)))
        self.assertIn(48, asset_class_codes("industrial"))
        self.assertIn(39, asset_class_codes("commercial"))

    def test_distress_qualification_codes(self):
        # Confirmed against the DOR sale-qualification code list.
        for code in (11, 12, 18, 38):
            self.assertIn(code, DISTRESS_QUAL_CODES)
        self.assertNotIn(1, DISTRESS_QUAL_CODES)

    def test_unknown_class_is_rejected(self):
        with self.assertRaises(KeyError):
            asset_class_codes("penthouses")


class TestLenderDetection(unittest.TestCase):
    def test_agencies_and_gses(self):
        for name in ("FEDERAL NATIONAL MORTGAGE ASSOCIATION",
                     "FANNIE MAE", "FREDDIE MAC",
                     "SECRETARY OF HOUSING AND URBAN DEVELOPMENT",
                     "FEDERAL DEPOSIT INSURANCE CORPORATION"):
            match = classify_owner(name)
            self.assertTrue(match.is_lender, name)
            self.assertEqual(match.confidence, "certain", name)
            self.assertEqual(match.category, "agency", name)

    def test_cmbs_trust_structures(self):
        for name in ("WILMINGTON TRUST NATIONAL ASSOCIATION AS TRUSTEE",
                     "US BANK NATIONAL ASSOCIATION AS TRUSTEE FOR SERIES 2019-C4",
                     "COMM 2014-CCRE18 MORTGAGE TRUST",
                     "DEUTSCHE BANK NATIONAL TRUST COMPANY"):
            match = classify_owner(name)
            self.assertTrue(match.is_lender, name)
            self.assertEqual(match.confidence, "certain", name)

    def test_special_servicers(self):
        for name in ("LNR PARTNERS LLC", "RIALTO CAPITAL ADVISORS LLC",
                     "CWCAPITAL ASSET MANAGEMENT"):
            match = classify_owner(name)
            self.assertTrue(match.is_lender, name)
            self.assertEqual(match.category, "special_servicer", name)

    def test_named_banks(self):
        match = classify_owner("BANKUNITED NA")
        self.assertTrue(match.is_lender)
        self.assertEqual(match.category, "bank")

    def test_family_trusts_are_not_lenders(self):
        """The whole list is worthless if estate-planning vehicles flood it."""
        for name in ("SMITH FAMILY TRUST",
                     "JOHNSON REVOCABLE LIVING TRUST",
                     "THE GOLDBERG IRREVOCABLE TRUST",
                     "MARTINEZ TRUST U/A DATED 01/01/2001",
                     "ESTATE OF ROBERT ALLEN",
                     "GARCIA FAMILY LP",
                     "WILLIAMS TRUST",
                     "FIRST BAPTIST CHURCH OF EXAMPLE"):
            self.assertFalse(classify_owner(name).is_lender, f"{name} must not match")

    def test_institutional_token_overrides_the_trust_exclusion(self):
        """A real securitisation trust often has 'TRUST' plus a deal series."""
        match = classify_owner("WELLS FARGO BANK NA AS TRUSTEE FOR SERIES 2018-C7 TRUST")
        self.assertTrue(match.is_lender)

    def test_ordinary_owners_are_ignored(self):
        for name in ("PALM GARDENS APARTMENTS LLC", "MARIA SANTOS", "", "X"):
            self.assertFalse(classify_owner(name).is_lender, name)

    def test_entity_detection(self):
        self.assertTrue(is_entity_owner("PALM GARDENS APARTMENTS LLC"))
        self.assertTrue(is_entity_owner("OCEAN VIEW PROPERTIES INC"))
        self.assertFalse(is_entity_owner("MARIA SANTOS"))


class TestScreening(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def _run(self, rows: list[list[str]], filters: Filters):
        roll = self.tmp / "nal_23.csv"
        write_roll(roll, rows)
        paths = resolve_inputs([str(roll)])
        marks = collect_benchmarks(paths, filters, RunStats())
        return screen(paths, filters, marks, RunStats())

    def test_unit_threshold_is_enforced(self):
        rows = baseline_rows(10)
        rows.append(parcel_row(PARCEL_ID="SMALL-1", NO_RES_UNTS="40"))
        rows.append(parcel_row(PARCEL_ID="BIG-1", NO_RES_UNTS="220"))

        results = self._run(rows, Filters(use_codes=frozenset({3}), min_units=75))
        ids = {r.parcel_id for r in results}
        self.assertIn("BIG-1", ids)
        self.assertNotIn("SMALL-1", ids)

    def test_blank_unit_count_cannot_pass_a_unit_filter(self):
        """NO_RES_UNTS is blank for hotels and dormitories — never assume."""
        rows = baseline_rows(10)
        rows.append(parcel_row(PARCEL_ID="NOUNITS", NO_RES_UNTS=""))
        results = self._run(rows, Filters(use_codes=frozenset({3}), min_units=75))
        self.assertNotIn("NOUNITS", {r.parcel_id for r in results})

    def test_lender_owned_filter(self):
        rows = baseline_rows(10)
        rows.append(parcel_row(PARCEL_ID="REO-1",
                               OWN_NAME="FEDERAL NATIONAL MORTGAGE ASSOCIATION"))
        rows.append(parcel_row(PARCEL_ID="PRIVATE-1", OWN_NAME="PALM GARDENS LLC"))

        results = self._run(
            rows, Filters(use_codes=frozenset({3}), min_units=75, lender_owned_only=True)
        )
        ids = {r.parcel_id for r in results}
        self.assertEqual(ids, {"REO-1"})

    def test_distress_signals_rank_above_a_clean_asset(self):
        rows = baseline_rows(10)
        rows.append(parcel_row(
            PARCEL_ID="CLEAN", OWN_NAME="RECENT BUYER LLC",
            ACT_YR_BLT="2019", EFF_YR_BLT="2019", SALE_YR1="2024", QUAL_CD1="01",
            OWN_STATE="FL",
        ))
        rows.append(parcel_row(
            PARCEL_ID="DISTRESSED", OWN_NAME="WILMINGTON TRUST NA AS TRUSTEE",
            ACT_YR_BLT="1968", EFF_YR_BLT="1968", SALE_YR1="1996", QUAL_CD1="12",
            OWN_STATE="NY", JV="4000000", JV_CHNG="-500000",
        ))

        results = self._run(rows, Filters(use_codes=frozenset({3}), min_units=75))
        ranked = [r.parcel_id for r in results]
        self.assertLess(ranked.index("DISTRESSED"), ranked.index("CLEAN"))

        distressed = next(r for r in results if r.parcel_id == "DISTRESSED")
        joined = " ".join(distressed.signals).lower()
        self.assertIn("lender-held", joined)
        self.assertIn("financial institution", joined)
        self.assertIn("absentee", joined)
        self.assertTrue(any("1968" in s for s in distressed.signals))

    def test_county_filter(self):
        rows = baseline_rows(10)
        rows.append(parcel_row(PARCEL_ID="DADE-1", CO_NO="23"))
        rows.append(parcel_row(PARCEL_ID="BROWARD-1", CO_NO="16"))
        results = self._run(
            rows, Filters(use_codes=frozenset({3}), min_units=75, counties=frozenset({16}))
        )
        self.assertEqual({r.county for r in results}, {"Broward"})

    def test_industrial_screen(self):
        rows = [
            parcel_row(PARCEL_ID=f"IND-{i}", DOR_UC="048", NO_RES_UNTS="",
                       TOT_LVG_AREA="90000", JV="6000000")
            for i in range(10)
        ]
        results = self._run(
            rows, Filters(use_codes=frozenset(asset_class_codes("industrial")),
                          min_living_area=50000)
        )
        self.assertEqual(len(results), 10)
        self.assertIn("Warehousing", results[0].use_description)

    def test_peer_ratio_flags_the_underperformer(self):
        rows = [parcel_row(PARCEL_ID=f"PEER-{i}", JV="15000000", NO_RES_UNTS="100")
                for i in range(12)]
        rows.append(parcel_row(PARCEL_ID="CHEAP", JV="4000000", NO_RES_UNTS="100"))

        results = self._run(rows, Filters(use_codes=frozenset({3}), min_units=75))
        cheap = next(r for r in results if r.parcel_id == "CHEAP")
        self.assertIsNotNone(cheap.peer_ratio)
        self.assertLess(cheap.peer_ratio, 0.5)
        self.assertTrue(any("peer median" in s for s in cheap.signals))

    def test_location_lifts_an_equally_distressed_asset(self):
        """Same distress, better market — the metro one must rank higher."""
        shared = dict(OWN_NAME="WILMINGTON TRUST NA AS TRUSTEE", ACT_YR_BLT="1970",
                      SALE_YR1="1995", QUAL_CD1="12", OWN_STATE="NY")
        rows = baseline_rows(10)
        rows.append(parcel_row(PARCEL_ID="METRO", CO_NO="23", **shared))
        rows.append(parcel_row(PARCEL_ID="RURAL", CO_NO="44", **shared))

        results = self._run(rows, Filters(use_codes=frozenset({3}), min_units=75))
        metro = next(r for r in results if r.parcel_id == "METRO")
        rural = next(r for r in results if r.parcel_id == "RURAL")
        self.assertAlmostEqual(metro.distress, rural.distress, places=1)
        self.assertGreater(metro.location, rural.location)
        self.assertGreater(metro.opportunity, rural.opportunity)

    def test_file_missing_required_columns_is_reported_not_crashed(self):
        roll = self.tmp / "broken.csv"
        write_roll(roll, [["23", "2025"]], header=["CO_NO", "ASMNT_YR"])
        stats = RunStats()
        marks = collect_benchmarks(resolve_inputs([str(roll)]), Filters(frozenset({3})), stats)
        self.assertEqual(len(marks.value_per_unit), 0)
        self.assertEqual(len(stats.skipped_files), 1)
        self.assertIn("missing required column", stats.skipped_files[0])

    def test_missing_paths_resolve_to_nothing_rather_than_crashing(self):
        """A mistyped absolute path must not blow up path expansion."""
        self.assertEqual(resolve_inputs(["/nonexistent/rolls"]), [])
        self.assertEqual(resolve_inputs(["/nonexistent/*.csv"]), [])
        self.assertEqual(resolve_inputs(["also/not/here.csv"]), [])

    def test_glob_and_directory_inputs_expand(self):
        write_roll(self.tmp / "nal_23.csv", baseline_rows(3))
        write_roll(self.tmp / "nal_16.csv", baseline_rows(3))
        self.assertEqual(len(resolve_inputs([str(self.tmp)])), 2)
        self.assertEqual(len(resolve_inputs([str(self.tmp / "*.csv")])), 2)
        # A file named twice is only read once.
        target = str(self.tmp / "nal_23.csv")
        self.assertEqual(len(resolve_inputs([target, target])), 1)

    def test_zipped_roll_is_read(self):
        import zipfile

        plain = self.tmp / "nal_inner.csv"
        write_roll(plain, baseline_rows(10))
        archive = self.tmp / "nal_23.zip"
        with zipfile.ZipFile(archive, "w") as zf:
            zf.write(plain, arcname="nal_23.csv")

        paths = resolve_inputs([str(archive)])
        filters = Filters(use_codes=frozenset({3}), min_units=75)
        results = screen(paths, filters,
                         collect_benchmarks(paths, filters, RunStats()), RunStats())
        self.assertEqual(len(results), 10)


class TestHudJoin(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def test_address_key_normalisation(self):
        a = hud.address_key("100 NW EXAMPLE STREET APT 3", "33131")
        b = hud.address_key("100 Example St", "33131-1234")
        self.assertIsNotNone(a)
        self.assertEqual(a, b)

    def test_address_key_rejects_unusable_input(self):
        self.assertIsNone(hud.address_key("", "33131"))
        self.assertIsNone(hud.address_key("100 EXAMPLE ST", "FL"))
        self.assertIsNone(hud.address_key("PO BOX 12", "33131"))

    def test_troubled_score_raises_distress_and_reorders(self):
        scores = self.tmp / "reac.csv"
        with scores.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["PROPERTY_NAME", "ADDRESS", "CITY", "STATE",
                             "ZIP", "INSPECTION_SCORE", "INSPECTION_DATE"])
            writer.writerow(["Synthetic Gardens", "100 EXAMPLE ST", "MIAMI", "FL",
                             "33131", "41", "2026-02-11"])

        roll = self.tmp / "nal.csv"
        rows = baseline_rows(10, PHY_ADDR1="900 OTHER AVE")
        rows.append(parcel_row(PARCEL_ID="FAILING", PHY_ADDR1="100 EXAMPLE ST"))
        write_roll(roll, rows)

        paths = resolve_inputs([str(roll)])
        filters = Filters(use_codes=frozenset({3}), min_units=75)
        targets = screen(paths, filters,
                         collect_benchmarks(paths, filters, RunStats()), RunStats())

        before = next(t for t in targets if t.parcel_id == "FAILING").distress
        matched = hud.enrich(targets, hud.load_inspections(scores))

        self.assertEqual(matched, 1)
        failing = next(t for t in targets if t.parcel_id == "FAILING")
        self.assertGreater(failing.distress, before)
        self.assertIn("REAC score 41", failing.signals[0])
        self.assertIn("TROUBLED", failing.signals[0])
        self.assertEqual(targets[0].parcel_id, "FAILING")

    def test_missing_columns_raise_a_clear_error(self):
        bad = self.tmp / "bad.csv"
        bad.write_text("FOO,BAR\n1,2\n", encoding="utf-8")
        with self.assertRaises(ValueError) as ctx:
            hud.load_inspections(bad)
        self.assertIn("score/address/zip", str(ctx.exception))


class TestOutputs(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def _targets(self):
        roll = self.tmp / "nal.csv"
        rows = baseline_rows(10)
        rows.append(parcel_row(PARCEL_ID="REO-1", OWN_NAME="LNR PARTNERS LLC",
                               ACT_YR_BLT="1971", SALE_YR1="1994", QUAL_CD1="12",
                               OWN_STATE="TX"))
        write_roll(roll, rows)
        paths = resolve_inputs([str(roll)])
        filters = Filters(use_codes=frozenset({3}), min_units=75)
        return screen(paths, filters,
                      collect_benchmarks(paths, filters, RunStats()), RunStats())

    def test_csv_round_trips(self):
        destination = self.tmp / "out" / "targets.csv"
        write_csv(self._targets(), destination)

        with destination.open(encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        self.assertGreater(len(rows), 0)
        self.assertEqual(rows[0]["rank"], "1")
        for column in ("owner_name", "parcel_id", "opportunity", "approach", "signals"):
            self.assertIn(column, rows[0])

        reo = next(r for r in rows if r["parcel_id"] == "REO-1")
        self.assertEqual(reo["owner_type"], "lender/agency")
        self.assertEqual(reo["lender_category"], "special_servicer")
        self.assertIn("sunbiz.org", reo["sunbiz_lookup"])

    def test_dossiers_render(self):
        targets = self._targets()
        written = dossier.write_all(targets, self.tmp / "dossiers", limit=5)
        self.assertGreater(written, 0)

        files = sorted((self.tmp / "dossiers").glob("*.md"))
        text = files[0].read_text(encoding="utf-8")
        for heading in ("## Asset", "## Ownership of record", "## Why it surfaced",
                        "## Route to the decision-maker", "## Verify before you spend money"):
            self.assertIn(heading, text)
        self.assertIn("Clerk of the Circuit Court", text)

    def test_dossier_only_emits_verified_links(self):
        """A dead county link in front of a seller is worse than no link."""
        targets = self._targets()
        text = dossier.render(targets[0], 1)
        for url in [line for line in text.splitlines() if "http" in line]:
            self.assertNotIn("example.com", url)
        # Miami-Dade (23) has a confirmed clerk URL; unverified counties fall back.
        self.assertTrue(
            "miamidadeclerk.gov" in text or "flclerks.com" in text,
            "expected either the verified county link or the statewide directory",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
