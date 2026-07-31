# Playbook: turning the list into deals

The screen produces names, addresses and reasons. This is what to do with them.

---

## First, a correction that will save you months

The brief assumed banks are sitting on a stock of unlisted properties before
auction, and that getting into that inventory early is the easy win. That
inventory mostly does not exist, and understanding why points at something
better.

**Before the auction, the bank does not own the building.** The borrower still
holds title. The lender holds a lien. It cannot list, sell or convey what it
does not own, so there is no secret pre-auction listing book to get into.

What genuinely exists in that window is better, because almost nobody works it:

| Play | What you are buying | Who signs |
|---|---|---|
| **Note purchase** | The defaulted loan itself, usually at a discount to unpaid principal | Lender's special assets group, or the special servicer |
| **Short sale** | The property, with the lender agreeing to release its lien for less than the balance | Borrower sells; lender must approve |
| **Deed in lieu** | Title from a borrower who wants out, taken subject to the debt you have bought or negotiated | Borrower and lender |
| **REO** | The property, after the lender has taken title | Lender's OREO desk or the servicer |

Note purchase is the strongest position in the list. Buy the note and you
control the foreclosure: you can complete it and take the asset, negotiate a
deed in lieu and skip the auction entirely, or restructure and sell the paper
on. You are no longer bidding against everybody who showed up at the courthouse
— you are the one holding the pen. It is also the play the screen supports best,
because a lis pendens tells you exactly which loans have gone to default.

**After** the auction, REO is real and is worth working — just be clear it is a
different, more crowded moment than the one described.

---

## The channels, in the order they are worth your time

### 1. CMBS special servicing — the deepest pool right now

Roughly one securitised apartment loan in twelve is with a special servicer, and
servicers are reported to be moving on assets more aggressively than at any
point this cycle. That is where the volume is.

The operational key: **the trustee named on title cannot sell.** When you see
`WILMINGTON TRUST NATIONAL ASSOCIATION AS TRUSTEE FOR SERIES 2019-C4`, that
entity is a passive fiduciary. Authority to negotiate a note sale, approve a
discounted payoff or dispose of REO sits with the **special servicer** named in
the pooling and servicing agreement.

So: read the deal name out of the owner string, identify the deal, find the
special servicer, and go to their asset manager. The screen flags these with
`lender_category = cmbs_trust` and puts the instruction in the `approach` field.

Names that recur on Florida multifamily: LNR Partners, Rialto Capital,
CWCapital, C-III, Midland Loan Services, Greystone Servicing, Argentic, Trimont.

Ask for the asset manager **by asset**, never the general line. Open with the
property, the loan and a specific proposal. Asset managers are measured on
resolution speed and on net recovery against their own valuation — a credible
buyer who can close without financing contingencies is genuinely useful to them,
and they will take the call on that basis.

### 2. Bank balance-sheet REO — small, but the easiest to actually buy

Bank multifamily delinquency was 1.47% at FDIC-insured institutions in Q1 2026.
Low. So there is less bank REO than the headlines suggest — but what exists
moves, because holding it is expensive for the bank:

- Foreclosed real estate carries a capital charge and produces no interest income.
- It draws examiner attention at every cycle.
- National banks face a statutory limit on how long they may hold real estate
  acquired through debts previously contracted — commonly cited as five years,
  extendable — and state-chartered banks have their own rules. **Confirm the
  charter and the limit before leaning on this**, but the pressure is real and
  an asset approaching its deadline is an asset the bank needs gone.

Ask for **special assets**, **OREO** or **problem loan workout** — not the
branch, and not commercial lending. Regional and community banks are far more
approachable than the money-centres and hold most of the Florida small-balance
multifamily and industrial paper. Build relationships with a dozen of them and
you will get calls before anything is marketed. That relationship is the actual
asset; the screen just tells you which banks to call.

### 3. Pre-foreclosure via lis pendens — the timing edge

A lis pendens is filed at the start of a foreclosure and is public the day it
lands. It is the earliest reliable public signal that a specific property is in
trouble, and it opens a window of months before any auction.

There is no statewide index, so this is a per-county job at the Clerk of the
Circuit Court. Do not try to cover 67 counties. Take the seven tier-one counties
— Miami-Dade, Broward, Palm Beach, Hillsborough, Orange, Pinellas, Duval — and
check them weekly for new filings against parcels already on your target list.
That intersection is small enough to work by hand and is where the best deals
are.

In this window you can reach the borrower before anyone else, and a borrower
facing foreclosure has real reasons to prefer a negotiated exit: a completed
foreclosure is far more damaging to them than a sale.

### 4. Tax-delinquent assets

Two years of delinquency lets a certificate holder force a tax deed sale. An
owner two years delinquent on a 200-unit complex has lost control of it. Check
the county tax collector for the target list; delinquency is also a good
independent confirmation of distress you inferred from the roll.

### 5. Owner-motivated, no lender involved

The largest group by count and the one everyone else ignores because it does not
announce itself. The screen finds these through the combination the brief asked
for: long hold, old building, absentee owner, assessed well below county peers.

An owner 25 years in has a very low basis, a fully depreciated asset, and a
looming capital bill. They are not distressed. They are *tired*, which is
better, because tired owners are not being called by twenty other people.

---

## Working the output

Sort by `opportunity`, not by `distress`. Distress alone surfaces broken assets
in markets with no exit — which is exactly why they are cheap. `opportunity`
weights distress by location quality, so a tired asset on good dirt ranks above
a ruined one nowhere. Your buyers are paying for the second thing.

Then, in order:

1. **Tier A, lender-held first.** Institutional counterparties, fastest to a
   yes or no. Do not spend three weeks getting a maybe from a family owner while
   a servicer is waiting on a call.
2. **Confirm before contact.** Clerk for mortgage, assignments and lis pendens;
   tax collector for delinquency; Sunbiz for entity standing and the human name.
   Fifteen minutes per asset. Skipping it is how you open a call by telling
   someone facts about their own building that are wrong.
3. **Drive it.** Occupancy, condition, parking counts, whether the roof has been
   done. No record anywhere will tell you a building is half empty.
4. **Then approach**, with a specific proposal and evidence you have done the
   work.

### Where the roll will mislead you

- **Just value is not market value.** It is a mass-appraisal estimate as of
  1 January. Fine for ranking, useless for pricing. Never quote it to a buyer.
- **`NO_RES_UNTS` is blank for hotels, motels and dormitories.** A unit filter
  silently drops all of them. Screen hospitality separately on use code `39`.
- **The roll lags.** It is annual. A property that changed hands in March will
  show the old owner until the next roll publishes.
- **Owner mailing address is often the manager, not the owner** — a property
  management company or a lawyer's office. Cross-check against Sunbiz.
- **One complex is frequently several parcels.** A 300-unit property can appear
  as six 50-unit rows. Group by owner name and adjacent situs address before
  concluding you have found six separate assets.

---

## Cadence

Rolls publish annually, so a full re-screen is a once-a-year job. Between them:

| Frequency | Task |
|---|---|
| Weekly | New lis pendens filings in the seven tier-one counties, matched against the target list |
| Monthly | Refresh HUD REAC scores; any property newly under 60 goes to the top |
| Quarterly | Sunbiz quarterly file — catch newly dissolved owner entities |
| Annually | Full re-screen on the new roll; compare year over year, because a parcel whose just value fell is telling you something happened |
| Continuous | Bank special-assets and servicer relationships. This is the compounding asset — the data only tells you who to call |

---

## A note on how you position yourself

The brief describes taking properties "as a listing" and selling them on. Read
literally that is brokerage, and in Florida brokerage requires a licence. It is
worth reading `COMPLIANCE.md` before the first conversation, not after — the
distinction between taking a listing and taking a contract changes what you can
say on the call, and it is much easier to structure correctly from the start
than to unwind later.
