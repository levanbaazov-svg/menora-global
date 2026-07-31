"""Florida DOR land-use codes and sale-qualification codes.

Two code sets drive the whole screen:

* DOR_UC on the parcel tells you what the asset *is*. 03 is the one that
  matters most here -- "Multi-family, 10 units or more".
* QUAL_CD on the last transfer tells you *how it changed hands*. A handful of
  those codes are, in effect, the state publishing a list of properties that
  went back to a lender.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Land-use codes
# ---------------------------------------------------------------------------

DOR_USE_CODES: dict[int, str] = {
    # Residential
    0: "Vacant residential",
    1: "Single family",
    2: "Mobile homes",
    3: "Multi-family, 10 units or more",
    4: "Condominia",
    5: "Cooperatives",
    6: "Retirement homes (not eleemosynary)",
    7: "Miscellaneous residential (migrant camps, boarding homes)",
    8: "Multi-family, fewer than 10 units",
    9: "Undefined / residential common elements",
    # Commercial
    10: "Vacant commercial",
    11: "Stores, one storey",
    12: "Mixed use -- store and office, or store and residential",
    13: "Department stores",
    14: "Supermarkets",
    15: "Regional shopping centres",
    16: "Community shopping centres",
    17: "Office buildings, one storey, non-professional",
    18: "Office buildings, multi-storey, non-professional",
    19: "Professional service buildings",
    20: "Airports, bus terminals, marine terminals, piers, marinas",
    21: "Restaurants, cafeterias",
    22: "Drive-in restaurants",
    23: "Financial institutions",
    24: "Insurance company offices",
    25: "Repair service shops",
    26: "Service stations",
    27: "Automotive sales, repair, storage",
    28: "Parking lots, mobile home parks",
    29: "Wholesale outlets, produce houses, manufacturing outlets",
    30: "Florists, greenhouses",
    31: "Drive-in theatres, open stadiums",
    32: "Enclosed theatres, auditoriums",
    33: "Nightclubs, cocktail lounges, bars",
    34: "Bowling alleys, skating rinks, pool halls",
    35: "Tourist attractions, permanent exhibits",
    36: "Camps",
    37: "Race tracks",
    38: "Golf courses, driving ranges",
    39: "Hotels, motels",
    # Industrial
    40: "Vacant industrial",
    41: "Light manufacturing, small machine shops, printing plants",
    42: "Heavy industrial, heavy equipment manufacturing",
    43: "Lumber yards, sawmills, planing mills",
    44: "Packing plants, fruit and vegetable, meat packing",
    45: "Canneries, bottlers, breweries, distilleries, wineries",
    46: "Other food processing, bakeries, candy factories",
    47: "Mineral processing, phosphate processing, cement plants, refineries",
    48: "Warehousing, distribution terminals, trucking terminals, storage",
    49: "Open storage, building supplies, junk yards, fuel storage",
    # Agricultural
    50: "Improved agricultural",
    51: "Cropland soil class I",
    52: "Cropland soil class II",
    53: "Cropland soil class III",
    54: "Timberland index 90+",
    55: "Timberland index 80-89",
    56: "Timberland index 70-79",
    57: "Timberland index 60-69",
    58: "Timberland index 50-59",
    59: "Timberland not classified by site index",
    60: "Grazing land soil class I",
    61: "Grazing land soil class II",
    62: "Grazing land soil class III",
    63: "Grazing land soil class IV",
    64: "Grazing land soil class V",
    65: "Grazing land soil class VI",
    66: "Orchard groves, citrus",
    67: "Poultry, bees, tropical fish, rabbits",
    68: "Dairies, feed lots",
    69: "Ornamentals, miscellaneous agricultural",
    # Institutional
    70: "Vacant institutional",
    71: "Churches",
    72: "Private schools and colleges",
    73: "Privately owned hospitals",
    74: "Homes for the aged",
    75: "Orphanages, other non-profit or charitable services",
    76: "Mortuaries, cemeteries, crematoria",
    77: "Clubs, lodges, union halls",
    78: "Sanitariums, convalescent and rest homes",
    79: "Cultural organisations, facilities",
    # Governmental
    80: "Undefined -- reserved for use by DOR",
    81: "Military",
    82: "Forest, parks, recreational areas",
    83: "Public county schools",
    84: "Colleges (non-private)",
    85: "Hospitals (non-private)",
    86: "Counties other than public schools, colleges, hospitals",
    87: "State other than military, forests, parks, schools, hospitals",
    88: "Federal other than military, forests, parks, schools, hospitals",
    89: "Municipal other than parks, recreational areas, colleges, hospitals",
    # Miscellaneous
    90: "Leasehold interests (government-owned property leased by non-governmental lessee)",
    91: "Utility -- gas and electricity, telephone, locally assessed railroads",
    92: "Mining lands, petroleum lands, gas lands",
    93: "Subsurface rights",
    94: "Right-of-way, streets, roads, canals, ditches, pipelines",
    95: "Rivers and lakes, submerged lands",
    96: "Sewage disposal, solid waste, borrow pits, drainage reservoirs",
    97: "Outdoor recreational or parkland, high-water recharge",
    98: "Centrally assessed",
    99: "Acreage not zoned agricultural",
}

# Groupings the screen actually targets.
ASSET_CLASSES: dict[str, tuple[int, ...]] = {
    # The primary mandate: apartment complexes of scale.
    "multifamily": (3,),
    # Widen the net -- small MF, co-ops and condo-conversion plays.
    "multifamily_wide": (3, 4, 5, 8),
    # Senior / congregate living, frequently distressed and lender-held.
    "senior_living": (6, 74, 78),
    "hospitality": (39,),
    "commercial": tuple(range(10, 40)),
    "retail": (11, 12, 13, 14, 15, 16),
    "office": (17, 18, 19),
    "industrial": tuple(range(40, 50)),
    "warehouse": (48, 49),
    "institutional": tuple(range(70, 80)),
}

# Anything income-producing that a distressed-asset buyer would look at.
ASSET_CLASSES["income_all"] = tuple(
    sorted(
        set(ASSET_CLASSES["multifamily_wide"])
        | set(ASSET_CLASSES["senior_living"])
        | set(ASSET_CLASSES["commercial"])
        | set(ASSET_CLASSES["industrial"])
    )
)


def describe_use(code: int | None) -> str:
    if code is None:
        return "unknown"
    return DOR_USE_CODES.get(code, f"unclassified ({code})")


def asset_class_codes(name: str) -> tuple[int, ...]:
    key = name.strip().lower().replace("-", "_").replace(" ", "_")
    if key in {"all", "any"}:
        return ASSET_CLASSES["income_all"]
    if key not in ASSET_CLASSES:
        raise KeyError(
            f"unknown asset class {name!r}; choose from "
            + ", ".join(sorted(ASSET_CLASSES) + ["all"])
        )
    return ASSET_CLASSES[key]


# ---------------------------------------------------------------------------
# Sale-qualification codes
# ---------------------------------------------------------------------------
# The property appraiser stamps every transfer with a code saying whether it was
# an arm's-length sale usable for assessment. The *disqualified* ones are the
# interesting ones: they are the state telling you the transfer was a
# foreclosure, a deed in lieu, a tax deed or a sale under duress.

QUAL_CODE_NOTES: dict[int, str] = {
    11: "Corrective, quit-claim or TAX DEED; minimum documentary stamps",
    12: "Transfer to or from a FINANCIAL INSTITUTION, or deed in lieu of foreclosure",
    18: "Transfer to or from a government agency (incl. FDIC, HUD, Fannie Mae, Freddie Mac)",
    38: "Transfer FORCED or under duress, or to prevent foreclosure",
}

# Codes that mean the last transfer was itself a distress event.
DISTRESS_QUAL_CODES: frozenset[int] = frozenset({11, 12, 18, 38})

# The strongest tell that a lender or agency currently holds title.
LENDER_TRANSFER_QUAL_CODES: frozenset[int] = frozenset({12, 18})


def describe_qual(code: int | None) -> str:
    if code is None:
        return ""
    return QUAL_CODE_NOTES.get(code, "")
