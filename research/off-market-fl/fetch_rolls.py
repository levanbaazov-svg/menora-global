#!/usr/bin/env python3
"""Download Florida DOR assessment rolls from the department's FTP directory.

The department publishes the rolls at:

    ftp://sdrftp03.dor.state.fl.us/Tax Roll Data Files/

with subfolders for NAL (real property roll), SDF (sales), NAP (tangible
personal property), NAL-DBF and NAV. Preliminary and final NAL/NAP go back to
2002; sale files to 2009.

This script lists first and downloads second. It never guesses a filename: it
reads the directory, shows you what is actually there with sizes, and only
fetches what matches. If the department reorganises the folders the listing
still works and you can see the new layout rather than getting a pile of 404s.

    ./fetch_rolls.py --list
    ./fetch_rolls.py --list --match NAL
    ./fetch_rolls.py --counties "Miami-Dade,Broward,Palm Beach,Hillsborough,Orange,Pinellas,Duval"
    ./fetch_rolls.py --all

NOTE: this could not be tested against the live server from the machine it was
written on (no outbound access to state hosts), so treat the first run as a
verification run: start with --list. If FTP is blocked on your network, the same
files are downloadable by hand from the web portal:
https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx
"""

from __future__ import annotations

import argparse
import ftplib
import re
import socket
import sys
from pathlib import Path

from flscreen.schema import COUNTY_BY_CODE, resolve_county

HOST = "sdrftp03.dor.state.fl.us"
ROOT = "Tax Roll Data Files"

# The seven counties that hold most of Florida's institutional apartment stock.
# Starting here instead of all 67 cuts the download by roughly an order of
# magnitude and covers the overwhelming majority of 75+ unit properties.
TIER_1 = ["Miami-Dade", "Broward", "Palm Beach", "Hillsborough",
          "Orange", "Pinellas", "Duval"]


def human(size: int | None) -> str:
    if size is None:
        return "     ?"
    value = float(size)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:6.1f}{unit}"
        value /= 1024
    return f"{value:6.1f}GB"


def connect(timeout: int = 45) -> ftplib.FTP:
    ftp = ftplib.FTP(HOST, timeout=timeout)
    ftp.login()          # anonymous
    ftp.set_pasv(True)   # passive mode survives most corporate firewalls
    return ftp


def walk(ftp: ftplib.FTP, path: str, depth: int = 0, max_depth: int = 2):
    """Yield (full_path, name, size, is_dir) under a directory."""
    try:
        ftp.cwd(path)
    except ftplib.error_perm as exc:
        print(f"  cannot enter {path!r}: {exc}", file=sys.stderr)
        return

    entries: list[tuple[str, dict]] = []
    try:
        entries = list(ftp.mlsd())
    except (ftplib.error_perm, ftplib.error_proto):
        # Older servers do not support MLSD; fall back to NLST plus SIZE.
        for name in ftp.nlst():
            name = name.rsplit("/", 1)[-1]
            if name in {".", ".."}:
                continue
            entries.append((name, {}))

    for name, facts in entries:
        if name in {".", ".."}:
            continue
        full = f"{path}/{name}"
        kind = facts.get("type")
        if kind in {"cdir", "pdir"}:
            continue

        is_dir = kind == "dir"
        size: int | None = None
        if kind == "file":
            size = int(facts["size"]) if "size" in facts else None
        elif kind is None:
            # Unknown: probe with SIZE. Success means it is a file.
            try:
                size = ftp.size(full)
                is_dir = size is None
            except (ftplib.error_perm, ftplib.error_reply, OSError):
                is_dir = True

        yield full, name, size, is_dir
        if is_dir and depth < max_depth:
            yield from walk(ftp, full, depth + 1, max_depth)


def county_tokens(names: list[str]) -> tuple[set[str], set[str]]:
    """Build filename-matching tokens for the requested counties."""
    words: set[str] = set()
    codes: set[str] = set()
    for name in names:
        code = resolve_county(name)
        if code is None:
            raise SystemExit(f"error: unknown county {name!r}")
        codes.add(f"{code:02d}")
        label = COUNTY_BY_CODE[code]
        # "Miami-Dade" -> {miamidade, dade}; "St. Johns" -> {stjohns, johns}
        flat = re.sub(r"[^a-z]", "", label.lower())
        words.add(flat)
        for part in re.split(r"[^a-z]+", label.lower()):
            if len(part) > 3:
                words.add(part)
    return words, codes


def matches_county(filename: str, words: set[str], codes: set[str]) -> bool:
    flat = re.sub(r"[^a-z]", "", filename.lower())
    if any(word in flat for word in words):
        return True
    # County number appears as e.g. nal23f2025.csv / 23_NAL_2025.zip
    return any(re.search(rf"(?<!\d){code}(?!\d)", filename) for code in codes)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--list", action="store_true",
                        help="list what is on the server and exit (start here)")
    parser.add_argument("--match", default="NAL", metavar="TEXT",
                        help="only paths containing this text, case-insensitive "
                             "(default: NAL — the real property roll)")
    parser.add_argument("--counties", default=None, metavar="LIST",
                        help="comma-separated county names or DOR numbers")
    parser.add_argument("--tier1", action="store_true",
                        help=f"shorthand for the seven largest: {', '.join(TIER_1)}")
    parser.add_argument("--all", action="store_true",
                        help="every county — much larger, check --list sizes first")
    parser.add_argument("--out", type=Path, default=Path("data/rolls"))
    parser.add_argument("--max-depth", type=int, default=2)
    args = parser.parse_args()

    if not (args.list or args.counties or args.tier1 or args.all):
        parser.error("choose one of --list, --counties, --tier1 or --all")

    names = TIER_1 if args.tier1 else (
        [c.strip() for c in args.counties.split(",")] if args.counties else []
    )
    words, codes = county_tokens(names) if names else (set(), set())

    print(f"Connecting to {HOST} ...")
    try:
        ftp = connect()
    except (ftplib.all_errors, socket.error) as exc:
        print(f"\nCould not reach the FTP server: {exc}\n", file=sys.stderr)
        print("Some networks block FTP. Download by hand instead:", file=sys.stderr)
        print("  https://floridarevenue.com/property/Pages/"
              "DataPortal_RequestAssessmentRollGISData.aspx", file=sys.stderr)
        return 2

    try:
        needle = args.match.lower()
        found: list[tuple[str, str, int | None]] = []
        print(f"Reading '{ROOT}' ...\n")

        for full, name, size, is_dir in walk(ftp, ROOT, max_depth=args.max_depth):
            if is_dir:
                if args.list:
                    print(f"  [dir]  {full}")
                continue
            if needle and needle not in full.lower():
                continue
            found.append((full, name, size))
            if args.list:
                print(f"  {human(size)}  {full}")

        if args.list:
            total = sum(s for _, _, s in found if s)
            print(f"\n{len(found)} file(s) matching {args.match!r}, "
                  f"{human(total)} in total.")
            print("\nNext: pick counties, e.g.")
            print("  ./fetch_rolls.py --tier1")
            return 0

        wanted = (found if args.all else
                  [f for f in found if matches_county(f[1], words, codes)])

        if not wanted:
            print("Nothing matched. Run --list to see the actual file names, "
                  "then narrow with --match.")
            return 1

        total = sum(s for _, _, s in wanted if s)
        print(f"{len(wanted)} file(s) to download, {human(total)} total.\n")
        args.out.mkdir(parents=True, exist_ok=True)

        for index, (full, name, size) in enumerate(sorted(wanted), start=1):
            target = args.out / name
            if target.exists() and size and target.stat().st_size == size:
                print(f"  [{index}/{len(wanted)}] {name} — already have it")
                continue
            print(f"  [{index}/{len(wanted)}] {name} ({human(size)}) ...", end="", flush=True)
            try:
                with target.open("wb") as handle:
                    ftp.retrbinary(f"RETR {full}", handle.write, blocksize=1 << 16)
                print(" done")
            except ftplib.all_errors as exc:
                print(f" FAILED: {exc}")
                target.unlink(missing_ok=True)

        print(f"\nSaved to {args.out}/")
        print("Now run:")
        print(f"  ./run.py --rolls {args.out} --asset-class multifamily "
              "--min-units 75 --lender-owned-only --out out/reo.csv")
        return 0
    finally:
        try:
            ftp.quit()
        except ftplib.all_errors:
            ftp.close()


if __name__ == "__main__":
    sys.exit(main())
