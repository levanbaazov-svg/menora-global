"""Field normalisation for Florida DOR assessment-roll files.

The Department of Revenue publishes one NAL (Name-Address-Legal) and one SDF
(Sale Data File) per county per year, as comma-delimited CSV with a header row.
Header spelling has drifted across roll years and a few counties ship extra or
renamed columns, so nothing here indexes by position -- every field is resolved
through an alias list and missing columns are reported loudly rather than
silently read as blank.

Reference: "User's Guide -- Department Property Tax Data Files" (FDOR, annual).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# ---------------------------------------------------------------------------
# County numbers
# ---------------------------------------------------------------------------
# FDOR numbers the 67 counties 11-77 in alphabetical order (Miami-Dade files
# under its historic name, "Dade"). CO_NO carries this number in every roll file.

COUNTY_BY_CODE: dict[int, str] = {
    11: "Alachua", 12: "Baker", 13: "Bay", 14: "Bradford", 15: "Brevard",
    16: "Broward", 17: "Calhoun", 18: "Charlotte", 19: "Citrus", 20: "Clay",
    21: "Collier", 22: "Columbia", 23: "Miami-Dade", 24: "DeSoto", 25: "Dixie",
    26: "Duval", 27: "Escambia", 28: "Flagler", 29: "Franklin", 30: "Gadsden",
    31: "Gilchrist", 32: "Glades", 33: "Gulf", 34: "Hamilton", 35: "Hardee",
    36: "Hendry", 37: "Hernando", 38: "Highlands", 39: "Hillsborough",
    40: "Holmes", 41: "Indian River", 42: "Jackson", 43: "Jefferson",
    44: "Lafayette", 45: "Lake", 46: "Lee", 47: "Leon", 48: "Levy",
    49: "Liberty", 50: "Madison", 51: "Manatee", 52: "Marion", 53: "Martin",
    54: "Monroe", 55: "Nassau", 56: "Okaloosa", 57: "Okeechobee", 58: "Orange",
    59: "Osceola", 60: "Palm Beach", 61: "Pasco", 62: "Pinellas", 63: "Polk",
    64: "Putnam", 65: "St. Johns", 66: "St. Lucie", 67: "Santa Rosa",
    68: "Sarasota", 69: "Seminole", 70: "Sumter", 71: "Suwannee", 72: "Taylor",
    73: "Union", 74: "Volusia", 75: "Wakulla", 76: "Walton", 77: "Washington",
}

CODE_BY_COUNTY: dict[str, int] = {
    name.upper(): code for code, name in COUNTY_BY_CODE.items()
}
# Accept the spellings people actually type.
CODE_BY_COUNTY.update({
    "DADE": 23, "MIAMI DADE": 23, "SAINT JOHNS": 65, "ST JOHNS": 65,
    "SAINT LUCIE": 66, "ST LUCIE": 66, "DE SOTO": 24, "INDIAN-RIVER": 41,
})


def resolve_county(token: str) -> int | None:
    """Map either a county number or a county name onto a CO_NO."""
    token = token.strip()
    if not token:
        return None
    if token.isdigit():
        code = int(token)
        return code if code in COUNTY_BY_CODE else None
    return CODE_BY_COUNTY.get(re.sub(r"[.]", "", token).upper())


# ---------------------------------------------------------------------------
# Column aliases
# ---------------------------------------------------------------------------
# canonical name -> candidate header spellings, best first. Matching is done on
# the upper-cased header with punctuation and whitespace stripped.

NAL_ALIASES: dict[str, tuple[str, ...]] = {
    "county_no":      ("CONO", "COUNTYNO", "COUNTYNUMBER"),
    "parcel_id":      ("PARCELID", "PARCELNO", "PARCEL"),
    "assessment_yr":  ("ASMNTYR", "ASSESSMENTYEAR", "ASMTYR"),
    "dor_use_code":   ("DORUC", "DORUSECODE", "USECODE", "DOR"),
    "pa_use_code":    ("PAUC", "PAUSECODE"),
    "just_value":     ("JV", "JUSTVALUE", "JVTOTAL"),
    "jv_change":      ("JVCHNG", "JVCHANGE"),
    "land_value":     ("LNDVAL", "LANDVALUE", "LNDVALUE"),
    "special_feat":   ("SPECFEATVAL", "SPECIALFEATUREVALUE"),
    "assessed_value": ("AVSD", "AVNSD", "ASSESSEDVALUE"),
    "taxable_value":  ("TVSD", "TVNSD", "TAXABLEVALUE"),
    "land_sqft":      ("LNDSQFOOT", "LANDSQFOOT", "LANDSQFT"),
    "land_units":     ("NOLNDUNTS", "NOLANDUNITS"),
    "act_year_built": ("ACTYRBLT", "ACTUALYEARBUILT", "YRBLT", "YEARBUILT"),
    "eff_year_built": ("EFFYRBLT", "EFFECTIVEYEARBUILT"),
    "living_area":    ("TOTLVGAREA", "TOTALLIVINGAREA", "TOTLVGAR"),
    "n_buildings":    ("NOBULDNG", "NOBUILDING", "NOBLDG", "NUMBEROFBUILDINGS"),
    "n_res_units":    ("NORESUNTS", "NORESUNITS", "NUMBEROFRESIDENTIALUNITS"),
    "improve_qual":   ("IMPQUAL", "IMPROVEMENTQUALITY"),
    "const_class":    ("CONSTCLASS", "CONSTRUCTIONCLASS"),
    "owner_name":     ("OWNNAME", "OWNERNAME", "OWNER"),
    "owner_addr1":    ("OWNADDR1", "OWNERADDRESS1", "OWNERADDR1"),
    "owner_addr2":    ("OWNADDR2", "OWNERADDRESS2", "OWNERADDR2"),
    "owner_city":     ("OWNCITY", "OWNERCITY"),
    "owner_state":    ("OWNSTATE", "OWNERSTATE"),
    "owner_zip":      ("OWNZIPCD", "OWNERZIP", "OWNZIP"),
    "owner_country":  ("OWNSTATEDOM", "OWNERSTATEDOMICILE"),
    "phys_addr1":     ("PHYADDR1", "PHYSICALADDRESS1", "SITUSADDR1"),
    "phys_addr2":     ("PHYADDR2", "PHYSICALADDRESS2", "SITUSADDR2"),
    "phys_city":      ("PHYCITY", "PHYSICALCITY", "SITUSCITY"),
    "phys_zip":       ("PHYZIPCD", "PHYSICALZIP", "SITUSZIP"),
    "sale_price_1":   ("SALEPRC1", "SALPRC1", "SALEPRICE1"),
    "sale_year_1":    ("SALEYR1", "SALYR1", "SALEYEAR1"),
    "sale_month_1":   ("SALEMO1", "SALMO1", "SALEMONTH1"),
    "qual_code_1":    ("QUALCD1", "SALVALCD1", "SALEQUALCD1"),
    "vac_imp_1":      ("VICD1", "VACIMPCD1"),
    "or_book_1":      ("ORBOOK1", "OFFICIALRECORDBOOK1"),
    "or_page_1":      ("ORPAGE1", "OFFICIALRECORDPAGE1"),
    "sale_price_2":   ("SALEPRC2", "SALPRC2", "SALEPRICE2"),
    "sale_year_2":    ("SALEYR2", "SALYR2", "SALEYEAR2"),
    "qual_code_2":    ("QUALCD2", "SALVALCD2", "SALEQUALCD2"),
    "legal":          ("SLEGAL", "LEGAL", "LEGALDESCRIPTION"),
    "neighborhood":   ("NBRHDCD", "NEIGHBORHOODCODE"),
    "market_area":    ("MKTAR", "MARKETAREA"),
    "township":       ("TWN", "TOWNSHIP"),
    "range":          ("RNG", "RANGE"),
    "section":        ("SEC", "SECTION"),
    "census_block":   ("CENSUSBK", "CENSUSBLOCK"),
    "state_parcel":   ("STATEPARID", "STATEPARCELID"),
}

SDF_ALIASES: dict[str, tuple[str, ...]] = {
    "county_no":   ("CONO", "COUNTYNO"),
    "parcel_id":   ("PARCELID", "PARCELNO"),
    "sale_year":   ("SALYR", "SALEYR", "SALEYEAR"),
    "sale_month":  ("SALMO", "SALEMO", "SALEMONTH"),
    "sale_price":  ("SALPRC", "SALEPRC", "SALEPRICE"),
    "qual_code":   ("SALVALCD", "QUALCD", "SALEQUALCD"),
    "vac_imp":     ("VICD", "VACIMPCD"),
    "or_book":     ("ORBOOK",),
    "or_page":     ("ORPAGE",),
    "clerk_no":    ("CLERKNO", "CLERKNUMBER"),
    "multi_parcel": ("MULTIPARSAL", "MPARSAL", "MULTIPARCELSALE"),
    "change_code": ("SALCHGCD", "SALECHANGECODE"),
}


def _canon(header: str) -> str:
    """Strip BOM, punctuation and spacing so header variants collapse together."""
    return re.sub(r"[^A-Z0-9]", "", header.replace("﻿", "").upper())


@dataclass
class ColumnMap:
    """Resolved position of every canonical field in one CSV's header row."""

    index: dict[str, int]
    missing: tuple[str, ...]
    unmapped_headers: tuple[str, ...]

    def has(self, field: str) -> bool:
        return field in self.index


def build_column_map(header: list[str], aliases: dict[str, tuple[str, ...]]) -> ColumnMap:
    """Resolve canonical field names against an actual CSV header row."""
    by_canon: dict[str, int] = {}
    for pos, raw in enumerate(header):
        key = _canon(raw)
        # First spelling wins; some rolls repeat a column.
        by_canon.setdefault(key, pos)

    index: dict[str, int] = {}
    missing: list[str] = []
    claimed: set[int] = set()
    for field, candidates in aliases.items():
        for candidate in candidates:
            pos = by_canon.get(_canon(candidate))
            if pos is not None:
                index[field] = pos
                claimed.add(pos)
                break
        else:
            missing.append(field)

    unmapped = tuple(
        header[pos] for pos in range(len(header)) if pos not in claimed
    )
    return ColumnMap(index=index, missing=tuple(missing), unmapped_headers=unmapped)


# ---------------------------------------------------------------------------
# Typed row access
# ---------------------------------------------------------------------------

class Row:
    """Read-only view over one CSV row, addressed by canonical field name.

    Every getter tolerates blanks, stray whitespace, currency punctuation and
    short rows, because the rolls contain all four.
    """

    __slots__ = ("_values", "_map")

    def __init__(self, values: list[str], column_map: ColumnMap) -> None:
        self._values = values
        self._map = column_map

    def raw(self, field: str) -> str:
        pos = self._map.index.get(field)
        if pos is None or pos >= len(self._values):
            return ""
        return self._values[pos].strip()

    def text(self, field: str) -> str:
        return re.sub(r"\s+", " ", self.raw(field)).strip()

    def upper(self, field: str) -> str:
        return self.text(field).upper()

    def number(self, field: str) -> float | None:
        raw = self.raw(field)
        if not raw:
            return None
        cleaned = re.sub(r"[^0-9.\-]", "", raw)
        if not cleaned or cleaned in {"-", ".", "-."}:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None

    def integer(self, field: str) -> int | None:
        value = self.number(field)
        return None if value is None else int(value)

    def year(self, field: str) -> int | None:
        """Year fields appear as 1972, 72 and 0 across rolls; normalise them."""
        value = self.integer(field)
        if value is None or value <= 0:
            return None
        if value < 100:  # two-digit year
            value += 1900 if value > 25 else 2000
        if not (1800 <= value <= 2100):
            return None
        return value

    def code(self, field: str) -> int | None:
        """Use/qualification codes ship as '03', '003' or '3' depending on county."""
        raw = self.raw(field)
        if not raw:
            return None
        digits = re.sub(r"[^0-9]", "", raw)
        if not digits:
            return None
        try:
            return int(digits)
        except ValueError:
            return None
