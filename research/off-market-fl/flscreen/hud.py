"""Join HUD REAC physical-inspection scores onto screened parcels.

REAC scores are the single best public evidence that an owner has stopped
maintaining a property. HUD inspects assisted and insured multifamily stock on
a 0-100 scale and publishes the results by property and address:

* below 60  -- "Troubled Performer". Referred to the Departmental Enforcement
  Centre; can constitute a violation or default under the Regulatory Agreement,
  HAP contract or Use Agreement.
* 30 or below -- automatic referral for administrative review.
* below 80 -- inspected annually rather than on the longer cycle.

An owner sitting on consecutive sub-60 scores is facing enforcement, cannot
refinance cleanly, and is the most reliably motivated seller in the state.

The join is by address because the HUD file carries no parcel identifier.
Matching is deliberately conservative -- street number plus the first
significant street word plus the 5-digit ZIP -- so a miss is far more likely
than a wrong match. Treat a hit as a lead to confirm, not as proof.
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path

from .schema import _canon

_SCORE_HEADERS = ("INSPECTIONSCORE", "SCORE", "REACSCORE", "PHYSICALINSPECTIONSCORE",
                  "INSPECTION_SCORE", "LATESTSCORE")
_ADDR_HEADERS = ("ADDRESS", "STREETADDRESS", "PROPERTYADDRESS", "ADDR", "STREET")
_ZIP_HEADERS = ("ZIP", "ZIPCODE", "POSTALCODE", "ZIP5")
_NAME_HEADERS = ("PROPERTYNAME", "NAME", "PROJECTNAME", "DEVELOPMENTNAME")
_CITY_HEADERS = ("CITY", "PROPERTYCITY")
_STATE_HEADERS = ("STATE", "STATECODE", "PROPERTYSTATE")
_DATE_HEADERS = ("INSPECTIONDATE", "RELEASEDATE", "DATE", "INSPECTEDDATE")

_STREET_NOISE = re.compile(
    r"\b(NORTH|SOUTH|EAST|WEST|N|S|E|W|NE|NW|SE|SW|"
    r"STREET|ST|AVENUE|AVE|ROAD|RD|DRIVE|DR|BOULEVARD|BLVD|LANE|LN|COURT|CT|"
    r"CIRCLE|CIR|PLACE|PL|TERRACE|TER|TRAIL|TRL|PARKWAY|PKWY|HIGHWAY|HWY|WAY|"
    r"APT|UNIT|SUITE|STE|BLDG|BUILDING)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Inspection:
    property_name: str
    address: str
    city: str
    zip_code: str
    score: float
    inspected: str

    @property
    def is_troubled(self) -> bool:
        return self.score < 60

    @property
    def is_severe(self) -> bool:
        return self.score <= 30

    def describe(self) -> str:
        if self.is_severe:
            band = "SEVERE -- automatic DEC referral"
        elif self.is_troubled:
            band = "TROUBLED PERFORMER -- enforcement exposure"
        elif self.score < 80:
            band = "sub-80 -- on annual inspection"
        else:
            band = "passing"
        stamp = f" as of {self.inspected}" if self.inspected else ""
        return f"HUD REAC score {self.score:.0f}{stamp} ({band})"


def address_key(street: str, zip_code: str) -> str | None:
    """Conservative join key: house number + first real street word + ZIP5."""
    street = (street or "").strip().upper()
    zip5 = re.sub(r"[^0-9]", "", zip_code or "")[:5]
    if not street or len(zip5) != 5:
        return None

    number_match = re.match(r"(\d+)", street)
    if not number_match:
        return None
    number = number_match.group(1)

    rest = _STREET_NOISE.sub(" ", street[number_match.end():])
    words = [w for w in re.findall(r"[A-Z0-9]+", rest) if len(w) > 1]
    if not words:
        return None
    return f"{number}|{words[0]}|{zip5}"


def _pick(header: list[str], candidates: tuple[str, ...]) -> int | None:
    lookup = {_canon(h): i for i, h in enumerate(header)}
    for candidate in candidates:
        pos = lookup.get(_canon(candidate))
        if pos is not None:
            return pos
    # Fall back to a substring match on the canonical header.
    for canon, pos in lookup.items():
        if any(_canon(c) in canon for c in candidates):
            return pos
    return None


def load_inspections(path: Path, state: str = "FL") -> dict[str, Inspection]:
    """Read the HUD inspection-scores export into an address-keyed index.

    Accepts the CSV export of either the multifamily or public-housing dataset;
    column naming differs slightly between releases so headers are matched
    loosely.
    """
    index: dict[str, Inspection] = {}
    with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
        reader = csv.reader(handle)
        try:
            header = next(reader)
        except StopIteration:
            return index

        col_score = _pick(header, _SCORE_HEADERS)
        col_addr = _pick(header, _ADDR_HEADERS)
        col_zip = _pick(header, _ZIP_HEADERS)
        if col_score is None or col_addr is None or col_zip is None:
            raise ValueError(
                f"{path.name}: could not locate score/address/zip columns. "
                f"Header was: {', '.join(header[:20])}"
            )
        col_name = _pick(header, _NAME_HEADERS)
        col_city = _pick(header, _CITY_HEADERS)
        col_state = _pick(header, _STATE_HEADERS)
        col_date = _pick(header, _DATE_HEADERS)

        def cell(values: list[str], pos: int | None) -> str:
            if pos is None or pos >= len(values):
                return ""
            return values[pos].strip()

        for values in reader:
            if not values:
                continue
            if state and col_state is not None:
                if cell(values, col_state).upper()[:2] not in {state.upper(), ""}:
                    continue
            raw_score = re.sub(r"[^0-9.]", "", cell(values, col_score))
            if not raw_score:
                continue
            try:
                score = float(raw_score)
            except ValueError:
                continue

            key = address_key(cell(values, col_addr), cell(values, col_zip))
            if key is None:
                continue

            inspection = Inspection(
                property_name=cell(values, col_name),
                address=cell(values, col_addr),
                city=cell(values, col_city),
                zip_code=re.sub(r"[^0-9]", "", cell(values, col_zip))[:5],
                score=score,
                inspected=cell(values, col_date),
            )
            # Keep the worst score seen for an address -- that is the one that
            # drives enforcement pressure.
            existing = index.get(key)
            if existing is None or inspection.score < existing.score:
                index[key] = inspection
    return index


def enrich(parcels, index: dict[str, Inspection]) -> int:
    """Attach REAC findings to matching parcels and bump their distress score.

    Returns the number of parcels matched.
    """
    if not index:
        return 0
    matched = 0
    for parcel in parcels:
        key = address_key(parcel.site_addr, parcel.site_zip)
        if key is None:
            continue
        inspection = index.get(key)
        if inspection is None:
            continue

        matched += 1
        parcel.signals.insert(0, inspection.describe())
        if inspection.is_severe:
            parcel.distress = min(100.0, parcel.distress + 32.0)
        elif inspection.is_troubled:
            parcel.distress = min(100.0, parcel.distress + 24.0)
        elif inspection.score < 80:
            parcel.distress = min(100.0, parcel.distress + 10.0)

        loc_factor = 0.55 + 0.45 * (parcel.location / 100.0)
        parcel.opportunity = round(parcel.distress * loc_factor, 1)

    parcels.sort(key=lambda p: (-p.opportunity, -p.distress, -(p.just_value or 0)))
    return matched
