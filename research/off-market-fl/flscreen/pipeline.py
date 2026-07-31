"""Two-pass screen over the Florida assessment rolls.

Pass one reads every parcel in the target use classes and builds county-level
peer medians. Pass two re-reads, applies the hard filters and scores what
survives. Two passes because a peer median computed only over the already-
filtered set would be circular -- a 300-unit tower has to be judged against all
the apartments in its county, not just the other distressed ones.

Everything streams. The statewide roll is roughly 10 million parcels and the
Miami-Dade file alone is over a million rows, so nothing is ever held in memory
except the surviving candidates and the running benchmark samples.
"""

from __future__ import annotations

import csv
import glob
import gzip
import io
import sys
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from .dor_codes import asset_class_codes
from .lenders import sunbiz_search_url
from .score import (
    Benchmarks,
    CURRENT_YEAR,
    Parcel,
    approach_note,
    metro_tier,
    score_parcel,
    tier_label,
)
from .schema import COUNTY_BY_CODE, NAL_ALIASES, ColumnMap, Row, build_column_map

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))


@dataclass
class Filters:
    """Hard gates applied before anything is scored."""

    use_codes: frozenset[int]
    min_units: int | None = None
    max_units: int | None = None
    counties: frozenset[int] | None = None
    min_just_value: float | None = None
    min_living_area: float | None = None
    built_before: int | None = None
    lender_owned_only: bool = False
    min_score: float = 0.0


@dataclass
class RunStats:
    files: int = 0
    rows_read: int = 0
    in_use_class: int = 0
    passed_filters: int = 0
    scored: int = 0
    skipped_files: list[str] = None  # type: ignore[assignment]
    missing_columns: dict[str, tuple[str, ...]] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        self.skipped_files = self.skipped_files or []
        self.missing_columns = self.missing_columns or {}


# ---------------------------------------------------------------------------
# File handling
# ---------------------------------------------------------------------------

# Columns the screen genuinely cannot work without.
REQUIRED_FIELDS = ("parcel_id", "dor_use_code", "owner_name", "just_value")


def _open_text(path: Path) -> Iterator[io.TextIOBase]:
    """Yield a text handle for a plain, gzipped or zipped roll file."""
    suffix = path.suffix.lower()
    if suffix == ".zip":
        with zipfile.ZipFile(path) as archive:
            members = [
                n for n in archive.namelist()
                if n.lower().endswith((".csv", ".txt")) and not n.startswith("__MACOSX")
            ]
            if not members:
                raise ValueError(f"{path.name}: no CSV inside the archive")
            for member in members:
                with archive.open(member) as raw:
                    yield io.TextIOWrapper(raw, encoding="utf-8", errors="replace", newline="")
    elif suffix == ".gz":
        with gzip.open(path, "rt", encoding="utf-8", errors="replace", newline="") as handle:
            yield handle
    else:
        with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
            yield handle


def iter_roll_rows(paths: list[Path], stats: RunStats) -> Iterator[tuple[Row, ColumnMap]]:
    """Stream every data row across every roll file, with columns resolved."""
    for path in paths:
        try:
            for handle in _open_text(path):
                reader = csv.reader(handle)
                try:
                    header = next(reader)
                except StopIteration:
                    continue

                column_map = build_column_map(header, NAL_ALIASES)
                absent = [f for f in REQUIRED_FIELDS if not column_map.has(f)]
                if absent:
                    stats.skipped_files.append(
                        f"{path.name}: missing required column(s) {', '.join(absent)}"
                    )
                    continue
                if column_map.missing:
                    stats.missing_columns[path.name] = column_map.missing

                stats.files += 1
                for values in reader:
                    if not values:
                        continue
                    stats.rows_read += 1
                    yield Row(values, column_map), column_map
        except (OSError, zipfile.BadZipFile, ValueError) as exc:
            stats.skipped_files.append(f"{path.name}: {exc}")


def resolve_inputs(patterns: list[str]) -> list[Path]:
    """Expand files, directories and globs into a sorted list of roll files."""
    found: list[Path] = []
    for pattern in patterns:
        candidate = Path(pattern)
        if candidate.is_dir():
            for suffix in ("*.csv", "*.CSV", "*.zip", "*.ZIP", "*.gz", "*.txt"):
                found.extend(sorted(candidate.rglob(suffix)))
        elif candidate.exists():
            found.append(candidate)
        else:
            # glob.glob rather than Path.glob: the latter rejects absolute
            # patterns outright, so a mistyped absolute path would crash here
            # instead of falling through to the "no roll files found" message.
            found.extend(Path(match) for match in sorted(glob.glob(pattern, recursive=True)))
    # De-duplicate while keeping order.
    seen: set[Path] = set()
    unique: list[Path] = []
    for path in found:
        resolved = path.resolve()
        if resolved not in seen:
            seen.add(resolved)
            unique.append(path)
    return unique


# ---------------------------------------------------------------------------
# Row -> Parcel
# ---------------------------------------------------------------------------


def build_parcel(row: Row) -> Parcel:
    county_no = row.integer("county_no")
    owner_addr = " ".join(x for x in (row.text("owner_addr1"), row.text("owner_addr2")) if x)
    site_addr = " ".join(x for x in (row.text("phys_addr1"), row.text("phys_addr2")) if x)
    return Parcel(
        county_no=county_no,
        county=COUNTY_BY_CODE.get(county_no or -1, ""),
        parcel_id=row.text("parcel_id"),
        dor_use_code=row.code("dor_use_code"),
        owner_name=row.upper("owner_name"),
        owner_addr=owner_addr,
        owner_city=row.text("owner_city"),
        owner_state=row.text("owner_state"),
        owner_zip=row.text("owner_zip"),
        site_addr=site_addr,
        site_city=row.text("phys_city"),
        site_zip=row.text("phys_zip"),
        just_value=row.number("just_value"),
        land_value=row.number("land_value"),
        jv_change=row.number("jv_change"),
        land_sqft=row.number("land_sqft"),
        living_area=row.number("living_area"),
        n_units=row.integer("n_res_units"),
        n_buildings=row.integer("n_buildings"),
        act_year_built=row.year("act_year_built"),
        eff_year_built=row.year("eff_year_built"),
        sale_price_1=row.number("sale_price_1"),
        sale_year_1=row.year("sale_year_1"),
        qual_code_1=row.code("qual_code_1"),
        sale_price_2=row.number("sale_price_2"),
        sale_year_2=row.year("sale_year_2"),
        qual_code_2=row.code("qual_code_2"),
        legal=row.text("legal"),
    )


def passes(parcel: Parcel, filters: Filters) -> bool:
    if parcel.dor_use_code not in filters.use_codes:
        return False
    if filters.counties is not None and parcel.county_no not in filters.counties:
        return False
    if filters.min_units is not None:
        # NO_RES_UNTS is blank for transitory stock (hotels, dormitories), so a
        # unit filter can only ever be applied where the roll actually states one.
        if not parcel.n_units or parcel.n_units < filters.min_units:
            return False
    if filters.max_units is not None and parcel.n_units and parcel.n_units > filters.max_units:
        return False
    if filters.min_just_value is not None:
        if parcel.just_value is None or parcel.just_value < filters.min_just_value:
            return False
    if filters.min_living_area is not None:
        if not parcel.living_area or parcel.living_area < filters.min_living_area:
            return False
    if filters.built_before is not None:
        year = parcel.act_year_built or parcel.eff_year_built
        if year is None or year >= filters.built_before:
            return False
    return True


# ---------------------------------------------------------------------------
# The two passes
# ---------------------------------------------------------------------------


def collect_benchmarks(paths: list[Path], filters: Filters, stats: RunStats) -> Benchmarks:
    """Pass one: county x use-code medians for value per unit, per sqft and land."""
    per_unit: dict[tuple[int, int], list[float]] = defaultdict(list)
    per_sqft: dict[tuple[int, int], list[float]] = defaultdict(list)
    land: dict[int, list[float]] = defaultdict(list)

    for row, _ in iter_roll_rows(paths, stats):
        use_code = row.code("dor_use_code")
        if use_code not in filters.use_codes:
            continue
        county_no = row.integer("county_no")
        if county_no is None:
            continue
        stats.in_use_class += 1

        just_value = row.number("just_value")
        if not just_value or just_value <= 0:
            continue
        key = (county_no, use_code)

        units = row.integer("n_res_units")
        if units and units > 0:
            per_unit[key].append(just_value / units)

        area = row.number("living_area")
        if area and area > 0:
            per_sqft[key].append(just_value / area)

        land_value = row.number("land_value")
        land_area = row.number("land_sqft")
        if land_value and land_area and land_area > 0:
            land[county_no].append(land_value / land_area)

    return Benchmarks.from_samples(per_unit, per_sqft, land)


def screen(paths: list[Path], filters: Filters, marks: Benchmarks, stats: RunStats) -> list[Parcel]:
    """Pass two: filter, score, and return everything at or above the threshold."""
    keepers: list[Parcel] = []
    for row, _ in iter_roll_rows(paths, stats):
        if row.code("dor_use_code") not in filters.use_codes:
            continue
        parcel = build_parcel(row)
        if not passes(parcel, filters):
            continue
        stats.passed_filters += 1

        score_parcel(parcel, marks)
        if filters.lender_owned_only and not (parcel.lender and parcel.lender.is_lender):
            continue
        if parcel.opportunity < filters.min_score:
            continue
        stats.scored += 1
        keepers.append(parcel)

    keepers.sort(key=lambda p: (-p.opportunity, -p.distress, -(p.just_value or 0)))
    return keepers


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

OUTPUT_COLUMNS = [
    "rank", "tier", "opportunity", "distress", "location",
    "county", "county_no", "metro_tier", "parcel_id",
    "use_code", "use_description",
    "units", "year_built", "age", "years_held",
    "just_value", "land_value", "value_per_unit", "peer_ratio",
    "living_area", "buildings",
    "last_sale_year", "last_sale_price", "last_sale_qual_code",
    "owner_name", "owner_type", "lender_category", "lender_confidence",
    "owner_address", "owner_city", "owner_state", "owner_zip",
    "site_address", "site_city", "site_zip",
    "approach", "signals", "sunbiz_lookup",
]


def to_record(parcel: Parcel, rank: int) -> dict[str, object]:
    lender = parcel.lender
    return {
        "rank": rank,
        "tier": tier_label(parcel.opportunity),
        "opportunity": parcel.opportunity,
        "distress": parcel.distress,
        "location": parcel.location,
        "county": parcel.county,
        "county_no": parcel.county_no or "",
        "metro_tier": metro_tier(parcel.county_no),
        "parcel_id": parcel.parcel_id,
        "use_code": parcel.dor_use_code if parcel.dor_use_code is not None else "",
        "use_description": parcel.use_description,
        "units": parcel.n_units or "",
        "year_built": parcel.act_year_built or parcel.eff_year_built or "",
        "age": parcel.age if parcel.age is not None else "",
        "years_held": parcel.years_held if parcel.years_held is not None else "",
        "just_value": int(parcel.just_value) if parcel.just_value else "",
        "land_value": int(parcel.land_value) if parcel.land_value else "",
        "value_per_unit": int(parcel.value_per_unit) if parcel.value_per_unit else "",
        "peer_ratio": f"{parcel.peer_ratio:.2f}" if parcel.peer_ratio is not None else "",
        "living_area": int(parcel.living_area) if parcel.living_area else "",
        "buildings": parcel.n_buildings or "",
        "last_sale_year": parcel.sale_year_1 or "",
        "last_sale_price": int(parcel.sale_price_1) if parcel.sale_price_1 else "",
        "last_sale_qual_code": parcel.qual_code_1 if parcel.qual_code_1 is not None else "",
        "owner_name": parcel.owner_name,
        "owner_type": "lender/agency" if lender and lender.is_lender else "private",
        "lender_category": lender.category if lender and lender.is_lender else "",
        "lender_confidence": lender.confidence if lender and lender.is_lender else "",
        "owner_address": parcel.owner_addr,
        "owner_city": parcel.owner_city,
        "owner_state": parcel.owner_state,
        "owner_zip": parcel.owner_zip,
        "site_address": parcel.site_addr,
        "site_city": parcel.site_city,
        "site_zip": parcel.site_zip,
        "approach": approach_note(parcel),
        "signals": " | ".join(parcel.signals),
        "sunbiz_lookup": sunbiz_search_url(parcel.owner_name),
    }


def write_csv(parcels: list[Parcel], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        for rank, parcel in enumerate(parcels, start=1):
            writer.writerow(to_record(parcel, rank))
