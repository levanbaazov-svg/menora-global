# Off-market acquisition screen — Florida

Finds distressed and lender-held property that is not listed anywhere, from
state and county public records, and ranks it by how workable the deal is.

Built for: multifamily of 75+ units statewide, plus distressed commercial and
industrial. Targets the assets that never reach Loopnet or CoStar — bank and
servicer REO, properties in foreclosure, and buildings whose owners have quietly
stopped maintaining them.

Standalone Python 3, **no dependencies**, nothing imported by the app.

---

## What it does

Florida publishes the **entire statewide property roll, with owner names, for
free**. Most states make you buy that county by county from a vendor. The
Department of Revenue has to collect it anyway to oversee the 67 county property
appraisers, so it is public — about 10 million parcels with owner name, owner
mailing address, situs address, use code, just value, land value, year built,
unit count and the last two sales.

The screen reads that roll and scores every candidate on two separate axes:

**Distress** — how likely the owner is to transact off-market:
- owner of record is a bank, servicer, CMBS trust or federal agency
- the last transfer carried a qualification code meaning foreclosure, deed in
  lieu, tax deed or a sale under duress
- how long they have held it
- how old the building is
- absentee or foreign owner
- assessed well below its county peer set
- just value falling year over year
- land worth more than the building standing on it

**Location** — metro tier, adjusted by how expensive the parcel's dirt is
relative to its own county.

The headline `opportunity` score combines them, because distress alone surfaces
broken assets in markets with no exit — which is exactly why they are cheap.
A tired asset on good dirt is the thing your buyers actually pay for.

Output is a ranked CSV plus a markdown dossier per target: what it is, who is on
title, why it surfaced, who has authority to sell, and what must be verified
before you spend money on it.

---

## Try it in thirty seconds

Runs on synthetic data, so you can see the shape of the output before
downloading anything:

```bash
cd research/off-market-fl
python3 make_demo_roll.py
python3 run.py --rolls data/demo --asset-class multifamily --min-units 75 \
               --out out/demo.csv --dossiers out/demo-dossiers
```

Every demo owner name is prefixed `[DEMO]`. It is invented. Do not work it.

---

## Running it for real

### 1. Get the rolls

Download the NAL files from the DOR data portal:

https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx

One CSV per county per year. Take all 67 for a statewide screen, or just the
counties you care about. Drop them in `data/rolls/`.

### 2. Screen

**Statewide apartment complexes, 75+ units** — the primary mandate:

```bash
python3 run.py --rolls data/rolls \
               --asset-class multifamily --min-units 75 \
               --out out/fl-multifamily-75plus.csv \
               --dossiers out/dossiers
```

**Only what a bank, servicer or agency holds title to today:**

```bash
python3 run.py --rolls data/rolls \
               --asset-class multifamily --min-units 75 --lender-owned-only \
               --out out/fl-reo-multifamily.csv
```

**Distressed industrial across the seven biggest counties:**

```bash
python3 run.py --rolls data/rolls --asset-class industrial \
               --counties "Miami-Dade,Broward,Palm Beach,Hillsborough,Orange,Pinellas,Duval" \
               --min-value 1500000 --min-area 40000 \
               --out out/fl-industrial.csv
```

**Older, tired stock — long-held and past its capex cycle:**

```bash
python3 run.py --rolls data/rolls --asset-class multifamily \
               --min-units 100 --built-before 1990 --min-score 45 \
               --out out/fl-mf-tired.csv
```

### 3. Add HUD inspection scores

The strongest public evidence that an owner has stopped maintaining a building.
HUD scores assisted and insured multifamily 0–100 and publishes the results by
address. Below 60 is a "Troubled Performer" facing enforcement; 30 or below
triggers automatic referral. Download from
https://www.huduser.gov/portal/datasets/pis.html and join it in:

```bash
python3 run.py --rolls data/rolls --asset-class multifamily --min-units 75 \
               --hud data/hud/inspection_scores.csv \
               --out out/fl-mf-failing.csv
```

Matched properties get a large distress bump and rise to the top.

---

## Options

| Flag | Effect |
|---|---|
| `--rolls` | Roll files, directories or globs. `.csv`, `.zip` and `.gz` all work |
| `--asset-class` | `multifamily`, `multifamily_wide`, `senior_living`, `hospitality`, `commercial`, `retail`, `office`, `industrial`, `warehouse`, `institutional`, `all` |
| `--min-units` / `--max-units` | Residential unit count |
| `--counties` | Names or DOR numbers, comma-separated. Default statewide |
| `--min-value` | Minimum just value |
| `--min-area` | Minimum building area — use this instead of units for commercial and industrial |
| `--built-before` | Only stock older than a given year |
| `--lender-owned-only` | Keep only bank, servicer, CMBS trust and agency owners |
| `--min-score` / `--top` | Trim the output |
| `--hud` | HUD REAC scores to join by address |
| `--out` / `--dossiers` | Where results go |

---

## Reading the output

Sort by `opportunity`. Key columns:

- `tier` — A work immediately, B qualify this week, C drip, D monitor
- `owner_type` / `lender_category` — `agency`, `cmbs_trust`, `special_servicer`,
  `bank`, `receiver`, or private
- `approach` — who actually has authority to sell this asset
- `signals` — every reason it surfaced, in plain language
- `peer_ratio` — assessed value against the county median for the same use class
- `sunbiz_lookup` — link to the owner entity's officers and registered agent

**When the owner is a CMBS trust, the trustee on title cannot sell.** Authority
sits with the special servicer named in the pooling agreement. The `approach`
column says so per row; `docs/PLAYBOOK.md` explains how to find them.

---

## Read these before the first phone call

- **`docs/SOURCES.md`** — every data source, what is in it, and the sale
  qualification codes that identify lender-held property.
- **`docs/PLAYBOOK.md`** — the acquisition channels ranked, including why the
  pre-auction bank inventory people expect mostly does not exist and what to
  work instead.
- **`docs/COMPLIANCE.md`** — the Florida brokerage licensing line. The model as
  originally described — taking properties "as a listing" and selling them on —
  is brokerage, which needs a licence. There are four clean ways to structure
  around it, and it is much easier to get right at the start.

---

## What this does not do

Honest limits, so nothing here gets over-trusted:

- **It is not title.** The roll is an assessment record. Confirm mortgages,
  assignments and lis pendens at the county clerk before acting.
- **Just value is not market value.** It is a mass-appraisal estimate as of
  1 January. Good for ranking, useless for pricing, and never quote it to a
  buyer.
- **Lender ownership is inferred from the owner name.** High precision, not
  certainty. Confirm at the clerk.
- **The roll is annual and lags.** A property sold in March shows the old owner
  until the next roll publishes.
- **No occupancy data exists anywhere in public records.** Low occupancy was in
  the brief and it cannot be screened for — it has to be established by driving
  the asset or by getting a rent roll. HUD REAC scores are the closest public
  proxy, and only for assisted and insured stock.
- **No loan-level detail.** Maturity dates, DSCR and servicer commentary are the
  genuine gap that Trepp and CRED iQ fill. The clerk's mortgage record gives you
  original principal, date and term, which brackets maturity well enough to time
  an approach.

---

## Tests

```bash
python3 -m unittest discover -s tests -v
```

34 tests. All fixture data is synthetic.
