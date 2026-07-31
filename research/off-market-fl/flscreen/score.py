"""Scoring model: how distressed, how well located, how mispriced.

Two scores come out of here and they are deliberately kept apart.

* ``distress`` -- how likely the owner is to transact off-market, and how far
  the asset has slipped. Built from lender ownership, the qualification code on
  the last transfer, hold period, building age, absentee ownership and value
  behaviour.
* ``location`` -- how good the dirt is, from metro tier plus the parcel's land
  value per square foot against its own county.

Distress on its own is not an opportunity; plenty of assets are distressed
because they sit somewhere nobody wants to own. The headline ``opportunity``
number is the combination -- a tired asset on good dirt, which is the only
thing a value-add buyer actually pays for.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from statistics import median

from .dor_codes import (
    DISTRESS_QUAL_CODES,
    LENDER_TRANSFER_QUAL_CODES,
    describe_qual,
    describe_use,
)
from .lenders import LenderMatch, classify_owner, is_entity_owner

# ---------------------------------------------------------------------------
# Market tiers
# ---------------------------------------------------------------------------
# Institutional buyer appetite by county. Tier 1 clears at the tightest cap
# rates and has the deepest bid; tier 3 needs a story to trade at all.

TIER_1 = frozenset({23, 16, 60, 39, 58, 62, 26})            # Miami-Dade .. Duval
TIER_2 = frozenset({46, 21, 68, 51, 69, 15, 63, 74, 61,     # Lee .. Pasco
                    59, 65, 11, 47, 52, 27, 66, 53, 41,     # Osceola .. Indian River
                    18, 45, 20, 56, 13, 37, 54})            # Charlotte .. Monroe

METRO_TIER_POINTS = {1: 26.0, 2: 16.0, 3: 6.0}


def metro_tier(county_no: int | None) -> int:
    if county_no in TIER_1:
        return 1
    if county_no in TIER_2:
        return 2
    return 3


# ---------------------------------------------------------------------------
# Parcel record
# ---------------------------------------------------------------------------


@dataclass
class Parcel:
    """One candidate, flattened out of the roll."""

    county_no: int | None
    county: str
    parcel_id: str
    dor_use_code: int | None
    owner_name: str
    owner_addr: str
    owner_city: str
    owner_state: str
    owner_zip: str
    site_addr: str
    site_city: str
    site_zip: str
    just_value: float | None
    land_value: float | None
    jv_change: float | None
    land_sqft: float | None
    living_area: float | None
    n_units: int | None
    n_buildings: int | None
    act_year_built: int | None
    eff_year_built: int | None
    sale_price_1: float | None
    sale_year_1: int | None
    qual_code_1: int | None
    sale_price_2: float | None
    sale_year_2: int | None
    qual_code_2: int | None
    legal: str = ""

    # Filled in by the scorer.
    lender: LenderMatch | None = None
    signals: list[str] = field(default_factory=list)
    distress: float = 0.0
    location: float = 0.0
    opportunity: float = 0.0
    value_per_unit: float | None = None
    peer_ratio: float | None = None

    @property
    def age(self) -> int | None:
        year = self.act_year_built or self.eff_year_built
        return None if year is None else max(0, CURRENT_YEAR - year)

    @property
    def years_held(self) -> int | None:
        if not self.sale_year_1:
            return None
        return max(0, CURRENT_YEAR - self.sale_year_1)

    @property
    def improvement_value(self) -> float | None:
        if self.just_value is None or self.land_value is None:
            return None
        return max(0.0, self.just_value - self.land_value)

    @property
    def use_description(self) -> str:
        return describe_use(self.dor_use_code)


CURRENT_YEAR = 2026


# ---------------------------------------------------------------------------
# Peer benchmarks
# ---------------------------------------------------------------------------


@dataclass
class Benchmarks:
    """County-level medians, computed in a first pass over the roll.

    Everything is measured against a parcel's own county and use class rather
    than a statewide number, because a $70k/unit basis means something very
    different in Miami-Dade than it does in Suwannee.
    """

    value_per_unit: dict[tuple[int, int], float] = field(default_factory=dict)
    value_per_sqft: dict[tuple[int, int], float] = field(default_factory=dict)
    land_per_sqft: dict[int, float] = field(default_factory=dict)

    @classmethod
    def from_samples(
        cls,
        per_unit: dict[tuple[int, int], list[float]],
        per_sqft: dict[tuple[int, int], list[float]],
        land: dict[int, list[float]],
        min_sample: int = 8,
    ) -> "Benchmarks":
        def collapse(source: dict, out: dict) -> None:
            for key, values in source.items():
                if len(values) >= min_sample:
                    out[key] = median(values)

        marks = cls()
        collapse(per_unit, marks.value_per_unit)
        collapse(per_sqft, marks.value_per_sqft)
        collapse(land, marks.land_per_sqft)
        return marks


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

DISTRESS_CAP = 100.0
LOCATION_CAP = 100.0


def score_parcel(parcel: Parcel, marks: Benchmarks) -> Parcel:
    """Attach distress, location and opportunity scores plus human-readable why."""
    parcel.lender = classify_owner(parcel.owner_name)
    points = 0.0
    reasons: list[str] = []

    # --- who holds title -------------------------------------------------
    lender = parcel.lender
    if lender.is_lender:
        award = {"certain": 34.0, "strong": 26.0, "possible": 12.0}[lender.confidence]
        points += award
        reasons.append(f"LENDER-HELD ({lender.confidence}): {lender.note}")

    # --- how it last changed hands ---------------------------------------
    qual = parcel.qual_code_1
    if qual in LENDER_TRANSFER_QUAL_CODES:
        points += 22.0
        reasons.append(f"Last transfer qual {qual}: {describe_qual(qual)}")
    elif qual in DISTRESS_QUAL_CODES:
        points += 14.0
        reasons.append(f"Last transfer qual {qual}: {describe_qual(qual)}")
    if parcel.qual_code_2 in DISTRESS_QUAL_CODES and qual not in DISTRESS_QUAL_CODES:
        points += 6.0
        reasons.append(f"Prior transfer was distressed (qual {parcel.qual_code_2})")

    # --- how long they have been in --------------------------------------
    held = parcel.years_held
    if held is None:
        points += 9.0
        reasons.append("No qualified sale on record -- very long-held, low basis")
    elif held >= 25:
        points += 17.0
        reasons.append(f"Held {held} years -- fully depreciated, refinance pressure")
    elif held >= 18:
        points += 13.0
        reasons.append(f"Held {held} years -- past a typical hold period")
    elif held >= 12:
        points += 8.0
        reasons.append(f"Held {held} years")

    # --- how old the asset is --------------------------------------------
    age = parcel.age
    if age is not None:
        if age >= 55:
            points += 15.0
            reasons.append(f"Built {parcel.act_year_built or parcel.eff_year_built} "
                           f"({age} yrs) -- major systems past life")
        elif age >= 40:
            points += 11.0
            reasons.append(f"Built {parcel.act_year_built or parcel.eff_year_built} "
                           f"({age} yrs) -- deferred capex likely")
        elif age >= 28:
            points += 6.0
            reasons.append(f"Built {parcel.act_year_built or parcel.eff_year_built} ({age} yrs)")

    # --- absentee ownership ----------------------------------------------
    state = (parcel.owner_state or "").upper()
    if state and state != "FL":
        if len(state) == 2:
            points += 8.0
            reasons.append(f"Absentee owner -- mailing address in {state}")
        else:
            points += 10.0
            reasons.append(f"Foreign-domiciled owner ({state})")

    # --- pricing against the peer set ------------------------------------
    _price_signals(parcel, marks)
    peer = parcel.peer_ratio
    if peer is not None:
        if peer <= 0.50:
            points += 18.0
            reasons.append(f"Assessed {peer:.0%} of county peer median -- deep underperformer")
        elif peer <= 0.70:
            points += 12.0
            reasons.append(f"Assessed {peer:.0%} of county peer median")
        elif peer <= 0.85:
            points += 6.0
            reasons.append(f"Assessed {peer:.0%} of county peer median")

    # --- value behaviour --------------------------------------------------
    if parcel.jv_change is not None and parcel.jv_change < 0 and parcel.just_value:
        drop = abs(parcel.jv_change) / parcel.just_value
        if drop >= 0.05:
            points += 9.0
            reasons.append(f"Just value fell {drop:.0%} year over year")

    # --- improvements worth little next to the dirt ----------------------
    improvement = parcel.improvement_value
    if improvement is not None and parcel.just_value and parcel.just_value > 0:
        land_share = (parcel.land_value or 0.0) / parcel.just_value
        if land_share >= 0.80:
            points += 12.0
            reasons.append(f"Land is {land_share:.0%} of value -- improvements near worthless, "
                           "redevelopment or teardown basis")
        elif land_share >= 0.65:
            points += 6.0
            reasons.append(f"Land is {land_share:.0%} of value")

    parcel.distress = round(min(points, DISTRESS_CAP), 1)
    parcel.signals = reasons
    parcel.location = round(_location_score(parcel, marks), 1)

    # Distress matters, but only where the dirt supports an exit. Weighting the
    # location term sub-linearly keeps a genuinely broken asset in a good market
    # ahead of a lightly tired one, without ever surfacing rural noise at the top.
    loc_factor = 0.55 + 0.45 * (parcel.location / LOCATION_CAP)
    parcel.opportunity = round(parcel.distress * loc_factor, 1)
    return parcel


def _price_signals(parcel: Parcel, marks: Benchmarks) -> None:
    """Compute value-per-unit / per-sqft and the ratio to the county peer set."""
    if parcel.county_no is None or parcel.dor_use_code is None or not parcel.just_value:
        return
    key = (parcel.county_no, parcel.dor_use_code)

    if parcel.n_units and parcel.n_units > 0:
        parcel.value_per_unit = parcel.just_value / parcel.n_units
        benchmark = marks.value_per_unit.get(key)
        if benchmark and benchmark > 0:
            parcel.peer_ratio = parcel.value_per_unit / benchmark
            return

    if parcel.living_area and parcel.living_area > 0:
        per_sqft = parcel.just_value / parcel.living_area
        benchmark = marks.value_per_sqft.get(key)
        if benchmark and benchmark > 0:
            parcel.peer_ratio = per_sqft / benchmark


def _location_score(parcel: Parcel, marks: Benchmarks) -> float:
    """Metro tier, adjusted by how expensive this parcel's dirt is for its county."""
    score = METRO_TIER_POINTS[metro_tier(parcel.county_no)]

    # Land value per square foot against the county median is a decent stand-in
    # for submarket quality without needing geocoding: expensive dirt is, almost
    # by definition, dirt people want.
    if parcel.county_no is not None and parcel.land_value and parcel.land_sqft:
        if parcel.land_sqft > 0:
            per_sqft = parcel.land_value / parcel.land_sqft
            benchmark = marks.land_per_sqft.get(parcel.county_no)
            if benchmark and benchmark > 0:
                ratio = per_sqft / benchmark
                if ratio >= 3.0:
                    score += 74.0
                elif ratio >= 2.0:
                    score += 60.0
                elif ratio >= 1.35:
                    score += 46.0
                elif ratio >= 0.9:
                    score += 32.0
                elif ratio >= 0.55:
                    score += 18.0
                else:
                    score += 6.0
                return min(score, LOCATION_CAP)

    # No land benchmark available -- fall back to the tier alone, scaled up so
    # missing data does not masquerade as a bad location.
    return min(score * 2.2, LOCATION_CAP)


def tier_label(opportunity: float) -> str:
    if opportunity >= 70:
        return "A -- work immediately"
    if opportunity >= 50:
        return "B -- qualify this week"
    if opportunity >= 32:
        return "C -- keep on the drip"
    return "D -- monitor only"


def approach_note(parcel: Parcel) -> str:
    """One line on who to actually call for this asset."""
    lender = parcel.lender
    if lender and lender.is_lender:
        return {
            "agency": "Agency-held: track the published disposition schedule and "
                      "register as an approved purchaser before the offering opens.",
            "cmbs_trust": "Securitised: the trustee on title cannot sell. Identify the "
                          "special servicer from the deal name and approach their REO desk.",
            "special_servicer": "Servicer-held REO: go directly to the named servicer's "
                                "asset manager for this SASB/conduit deal.",
            "bank": "Balance-sheet REO: approach the bank's special assets / OREO group. "
                    "They are under pressure to clear it before the next exam cycle.",
            "receiver": "In receivership: the court-appointed receiver controls the sale, "
                        "subject to court approval.",
        }.get(lender.category, "Lender-held -- confirm the holder before approaching.")

    if is_entity_owner(parcel.owner_name):
        return ("Entity-owned: pull the Sunbiz filing for the manager/officer and their "
                "registered agent, then approach the principal directly at that address.")
    return ("Individually owned: the roll mailing address is the owner's own. "
            "Direct mail to that address, then skip-trace.")
