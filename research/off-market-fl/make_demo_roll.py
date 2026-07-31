#!/usr/bin/env python3
"""Generate a SYNTHETIC roll file so the screen can be run before real data lands.

Everything this writes is invented. The owner names are all prefixed
"[DEMO]", the parcel IDs are sequential, and the addresses are made up. It
exists to prove the pipeline works end to end and to show what the output looks
like -- it is not a source of leads and must never be worked.

    ./make_demo_roll.py --out data/demo/nal_demo.csv
    ./run.py --rolls data/demo --asset-class multifamily --min-units 75 \
             --out out/demo-targets.csv
"""

from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path

from flscreen.schema import COUNTY_BY_CODE

HEADER = [
    "CO_NO", "PARCEL_ID", "ASMNT_YR", "DOR_UC", "JV", "JV_CHNG", "LND_VAL",
    "LND_SQFOOT", "ACT_YR_BLT", "EFF_YR_BLT", "TOT_LVG_AREA", "NO_BULDNG",
    "NO_RES_UNTS", "OWN_NAME", "OWN_ADDR1", "OWN_CITY", "OWN_STATE", "OWN_ZIPCD",
    "PHY_ADDR1", "PHY_CITY", "PHY_ZIPCD", "SALE_PRC1", "SALE_YR1", "SALE_MO1",
    "QUAL_CD1", "SALE_PRC2", "SALE_YR2", "QUAL_CD2", "S_LEGAL",
]

# Shapes of owner name the screen is meant to react to differently.
LENDER_OWNERS = [
    "[DEMO] FEDERAL NATIONAL MORTGAGE ASSOCIATION",
    "[DEMO] WILMINGTON TRUST NATIONAL ASSOCIATION AS TRUSTEE FOR SERIES 2019-C4",
    "[DEMO] LNR PARTNERS LLC",
    "[DEMO] US BANK NATIONAL ASSOCIATION AS TRUSTEE",
    "[DEMO] RIALTO CAPITAL ADVISORS LLC",
    "[DEMO] BANKUNITED NA",
    "[DEMO] CWCAPITAL ASSET MANAGEMENT LLC",
]
ENTITY_OWNERS = [
    "[DEMO] {} GARDENS APARTMENTS LLC",
    "[DEMO] {} BAY HOLDINGS LP",
    "[DEMO] {} PALMS PROPERTIES INC",
    "[DEMO] {} RIDGE INVESTMENTS LLC",
]
# Deliberately present so the false-positive guard can be seen working.
TRUST_OWNERS = [
    "[DEMO] {} FAMILY TRUST",
    "[DEMO] {} REVOCABLE LIVING TRUST",
]
PERSON_OWNERS = ["[DEMO] {} MARTINEZ", "[DEMO] {} OKAFOR", "[DEMO] {} CHEN"]

WORDS = ["CORAL", "OAKMONT", "SABAL", "HERON", "MANGROVE", "CYPRESS", "LAUREL",
         "INDIGO", "PELICAN", "JUNIPER", "ORCHID", "TAMARIND", "BANYAN", "OSPREY"]
STREETS = ["EXAMPLE ST", "SAMPLE AVE", "FICTION BLVD", "PLACEHOLDER DR", "TESTING WAY"]
OUT_OF_STATE = ["NY", "NJ", "IL", "CA", "TX", "GA", "MA"]

# Weight the county draw toward the metros, roughly as the real stock sits.
COUNTY_WEIGHTS = (
    [23] * 14 + [16] * 11 + [60] * 9 + [39] * 9 + [58] * 8 + [62] * 6 + [26] * 6 +
    [46] * 4 + [63] * 3 + [74] * 3 + [61] * 3 + [59] * 2 + [68] * 2 + [51] * 2 +
    [15] * 2 + [21, 69, 47, 11, 52, 27, 66, 45, 18, 20, 44, 34, 71, 77]
)


def make_row(rng: random.Random, index: int, use_code: int) -> list[str]:
    county = rng.choice(COUNTY_WEIGHTS)
    metro = county in {23, 16, 60, 39, 58, 62, 26}

    # Roughly one in eight is lender-held; the rest split across entity,
    # trust and individual ownership.
    draw = rng.random()
    if draw < 0.12:
        owner = rng.choice(LENDER_OWNERS)
        qual = rng.choice(["12", "18", "12"])
    elif draw < 0.70:
        owner = rng.choice(ENTITY_OWNERS).format(rng.choice(WORDS))
        qual = rng.choice(["01", "01", "01", "38", "11"])
    elif draw < 0.85:
        owner = rng.choice(TRUST_OWNERS).format(rng.choice(WORDS).title().upper())
        qual = "01"
    else:
        owner = rng.choice(PERSON_OWNERS).format(rng.choice(["A", "J", "M", "R"]))
        qual = "01"

    built = rng.choice(
        [rng.randint(1958, 1979)] * 3 + [rng.randint(1980, 1999)] * 4
        + [rng.randint(2000, 2021)] * 3
    )
    sale_year = rng.choice([""] * 2 + [str(rng.randint(1988, 2024))] * 8)

    if use_code == 3:
        units = rng.choice([rng.randint(75, 140)] * 5 + [rng.randint(141, 320)] * 3
                           + [rng.randint(321, 600)])
        per_unit = rng.randint(160_000, 340_000) if metro else rng.randint(70_000, 160_000)
        # A slice of the stock is assessed well under its peers.
        if rng.random() < 0.18:
            per_unit = int(per_unit * rng.uniform(0.35, 0.65))
        just = units * per_unit
        area = units * rng.randint(720, 1150)
        buildings = max(1, units // rng.randint(18, 40))
    else:
        units = ""
        area = rng.randint(20_000, 260_000)
        just = int(area * (rng.randint(90, 240) if metro else rng.randint(45, 120)))
        buildings = rng.randint(1, 4)

    land_sqft = rng.randint(40_000, 900_000)
    land_share = rng.uniform(0.15, 0.45) if rng.random() > 0.12 else rng.uniform(0.7, 0.95)
    land_value = int(just * land_share)
    jv_change = int(just * rng.uniform(-0.14, 0.10)) if rng.random() < 0.35 else 0

    state = rng.choice(OUT_OF_STATE) if rng.random() < 0.34 else "FL"
    city = COUNTY_BY_CODE[county].upper()
    zip_code = f"3{rng.randint(2000, 4999)}"

    sale_price = ""
    if sale_year:
        sale_price = str(int(just * rng.uniform(0.35, 0.95)))

    return [
        str(county), f"DEMO-{index:07d}", "2025", f"{use_code:03d}", str(just),
        str(jv_change), str(land_value), str(land_sqft), str(built),
        str(min(2025, built + rng.randint(0, 14))), str(area), str(buildings),
        str(units), owner, f"{rng.randint(100, 9999)} {rng.choice(STREETS)}",
        city if state == "FL" else "OUT OF STATE", state, zip_code,
        f"{rng.randint(100, 9999)} {rng.choice(WORDS)} {rng.choice(STREETS)}",
        city, zip_code, sale_price, sale_year,
        f"{rng.randint(1, 12):02d}" if sale_year else "", qual, "", "", "",
        "[DEMO] SYNTHETIC LEGAL DESCRIPTION",
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=Path("data/demo/nal_demo.csv"))
    parser.add_argument("--multifamily", type=int, default=1800,
                        help="synthetic apartment parcels (default: 1800)")
    parser.add_argument("--commercial", type=int, default=900)
    parser.add_argument("--industrial", type=int, default=600)
    parser.add_argument("--seed", type=int, default=20260731)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)

    index = 0
    with args.out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADER)
        for count, codes in (
            (args.multifamily, [3]),
            (args.commercial, [11, 12, 16, 17, 18, 19, 21, 27, 39]),
            (args.industrial, [41, 42, 48, 49]),
        ):
            for _ in range(count):
                index += 1
                writer.writerow(make_row(rng, index, rng.choice(codes)))

    print(f"Wrote {index:,} SYNTHETIC parcels to {args.out}")
    print()
    print("  !!  This is invented data for testing the pipeline.")
    print("  !!  Every owner name is prefixed [DEMO]. None of it is real property.")
    print("  !!  Replace it with the actual DOR rolls before working any lead.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
