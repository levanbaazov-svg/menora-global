#!/usr/bin/env python3
"""Screen the Florida assessment rolls for off-market acquisition targets.

Examples
--------
Statewide apartment complexes of 75+ units, oldest and most tired first:

    ./run.py --rolls ./data/rolls --asset-class multifamily --min-units 75 \
             --out ./out/fl-multifamily-75plus.csv --dossiers ./out/dossiers

Only what a bank, servicer or agency currently holds title to:

    ./run.py --rolls ./data/rolls --asset-class multifamily --min-units 75 \
             --lender-owned-only --out ./out/fl-reo-multifamily.csv

Distressed industrial and commercial across the big seven counties:

    ./run.py --rolls ./data/rolls --asset-class industrial \
             --counties "Miami-Dade,Broward,Palm Beach,Hillsborough,Orange,Pinellas,Duval" \
             --min-value 1500000 --out ./out/fl-industrial.csv

Layer HUD inspection scores on top to find physically failing apartments:

    ./run.py --rolls ./data/rolls --asset-class multifamily --min-units 75 \
             --hud ./data/hud/multifamily_inspection_scores.csv \
             --out ./out/fl-mf-reac.csv
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from flscreen import dossier, hud
from flscreen.dor_codes import ASSET_CLASSES, asset_class_codes
from flscreen.pipeline import (
    Filters,
    RunStats,
    collect_benchmarks,
    resolve_inputs,
    screen,
    write_csv,
)
from flscreen.schema import COUNTY_BY_CODE, resolve_county


def parse_counties(raw: str | None) -> frozenset[int] | None:
    if not raw:
        return None
    codes: set[int] = set()
    unknown: list[str] = []
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        code = resolve_county(token)
        if code is None:
            unknown.append(token)
        else:
            codes.add(code)
    if unknown:
        raise SystemExit(
            f"error: unrecognised county name/number: {', '.join(unknown)}\n"
            "       use a DOR county number (11-77) or a Florida county name."
        )
    return frozenset(codes) if codes else None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="run.py",
        description="Screen Florida DOR assessment rolls for off-market targets.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--rolls", nargs="+", required=True, metavar="PATH",
        help="NAL roll files, directories or globs (.csv, .zip, .gz all accepted)",
    )
    parser.add_argument(
        "--asset-class", default="multifamily", metavar="CLASS",
        help="one of: " + ", ".join(sorted(ASSET_CLASSES)) + ", all (default: multifamily)",
    )
    parser.add_argument("--min-units", type=int, default=None,
                        help="minimum residential units (e.g. 75)")
    parser.add_argument("--max-units", type=int, default=None, help="maximum residential units")
    parser.add_argument("--counties", default=None, metavar="LIST",
                        help="comma-separated county names or DOR numbers; default is statewide")
    parser.add_argument("--min-value", type=float, default=None, metavar="USD",
                        help="minimum just value")
    parser.add_argument("--min-area", type=float, default=None, metavar="SQFT",
                        help="minimum building area, for commercial and industrial")
    parser.add_argument("--built-before", type=int, default=None, metavar="YEAR",
                        help="only parcels built before this year")
    parser.add_argument("--lender-owned-only", action="store_true",
                        help="keep only parcels whose owner of record is a bank, servicer, "
                             "CMBS trust or federal agency")
    parser.add_argument("--min-score", type=float, default=0.0, metavar="N",
                        help="drop anything scoring below this opportunity score")
    parser.add_argument("--top", type=int, default=None, metavar="N",
                        help="keep only the top N results")
    parser.add_argument("--hud", type=Path, default=None, metavar="CSV",
                        help="HUD REAC inspection-scores export to join by address")
    parser.add_argument("--out", type=Path, default=Path("out/targets.csv"),
                        help="output CSV path (default: out/targets.csv)")
    parser.add_argument("--dossiers", type=Path, default=None, metavar="DIR",
                        help="also write one markdown dossier per target into DIR")
    parser.add_argument("--dossier-limit", type=int, default=50,
                        help="how many dossiers to write (default: 50)")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    try:
        use_codes = frozenset(asset_class_codes(args.asset_class))
    except KeyError as exc:
        raise SystemExit(f"error: {exc}") from exc

    paths = resolve_inputs(args.rolls)
    if not paths:
        raise SystemExit(
            f"error: no roll files found under {' '.join(args.rolls)}\n"
            "       download the NAL files first — see docs/SOURCES.md"
        )

    filters = Filters(
        use_codes=use_codes,
        min_units=args.min_units,
        max_units=args.max_units,
        counties=parse_counties(args.counties),
        min_just_value=args.min_value,
        min_living_area=args.min_area,
        built_before=args.built_before,
        lender_owned_only=args.lender_owned_only,
        min_score=args.min_score,
    )

    scope = "statewide" if filters.counties is None else (
        ", ".join(sorted(COUNTY_BY_CODE[c] for c in filters.counties))
    )
    print(f"Roll files      : {len(paths)}")
    print(f"Asset class     : {args.asset_class} (DOR use codes "
          f"{', '.join(str(c) for c in sorted(use_codes))})")
    print(f"Scope           : {scope}")
    if filters.min_units:
        print(f"Minimum units   : {filters.min_units}")
    if filters.lender_owned_only:
        print("Ownership       : lender / servicer / agency only")
    print()

    started = time.time()

    print("Pass 1 of 2 — building county peer benchmarks...")
    pass1 = RunStats()
    marks = collect_benchmarks(paths, filters, pass1)
    print(f"  read {pass1.rows_read:,} rows, {pass1.in_use_class:,} in the target use class")
    print(f"  benchmarks: {len(marks.value_per_unit)} per-unit, "
          f"{len(marks.value_per_sqft)} per-sqft, {len(marks.land_per_sqft)} land")

    print("Pass 2 of 2 — filtering and scoring...")
    pass2 = RunStats()
    targets = screen(paths, filters, marks, pass2)
    print(f"  {pass2.passed_filters:,} passed the filters, {len(targets):,} scored and kept")

    if args.hud:
        if not args.hud.exists():
            print(f"  warning: HUD file not found at {args.hud}, skipping the join")
        else:
            try:
                index = hud.load_inspections(args.hud)
                matched = hud.enrich(targets, index)
                print(f"  HUD REAC: {len(index):,} Florida inspections loaded, "
                      f"{matched:,} matched by address")
            except ValueError as exc:
                print(f"  warning: {exc}")

    if args.top:
        targets = targets[: args.top]

    for note in pass1.skipped_files + pass2.skipped_files:
        print(f"  SKIPPED {note}")
    if pass2.missing_columns:
        sample = next(iter(pass2.missing_columns.items()))
        print(f"  note: some optional columns were absent, e.g. {sample[0]} lacked "
              f"{', '.join(sample[1][:6])}")

    if not targets:
        print("\nNo parcels matched. Loosen --min-units, widen --asset-class, "
              "or confirm the roll files cover the counties you expect.")
        return 1

    write_csv(targets, args.out)
    print(f"\nWrote {len(targets):,} targets to {args.out}")

    if args.dossiers:
        count = dossier.write_all(targets, args.dossiers, limit=args.dossier_limit)
        print(f"Wrote {count} dossiers to {args.dossiers}/")

    # A quick read on what came out.
    lender_held = sum(1 for t in targets if t.lender and t.lender.is_lender)
    tier_a = sum(1 for t in targets if t.opportunity >= 70)
    print()
    print(f"  Tier A (work immediately) : {tier_a:,}")
    print(f"  Lender / agency held      : {lender_held:,}")
    print(f"  Elapsed                   : {time.time() - started:.1f}s")
    print()
    print("Top 10:")
    for rank, target in enumerate(targets[:10], start=1):
        units = f"{target.n_units}u" if target.n_units else "—"
        value = f"${target.just_value:,.0f}" if target.just_value else "—"
        print(f"  {rank:2d}. [{target.opportunity:5.1f}] {target.county:<14} {units:>6}  "
              f"{value:>14}  {(target.site_addr or target.parcel_id)[:40]:<40} "
              f"{target.owner_name[:36]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
