# Source register

Every source below was checked to exist. Where a link could not be confirmed it
is described rather than guessed at — a dead link handed to a seller or a buyer
costs more than the ten seconds it saves.

Florida is unusually good for this work. Most states make you buy parcel data
county by county from a vendor. Florida's Department of Revenue publishes the
**entire statewide roll, with owner names, for free**, because the department
has to collect it anyway to oversee the 67 county property appraisers.

---

## 1. The spine: Florida DOR assessment rolls

The one dataset the whole screen is built on.

| What | Where |
|---|---|
| Data portal (request/download rolls and GIS) | https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx |
| 2025 file layout guide | https://floridarevenue.com/property/dataportal/Documents/PTO%20Data%20Portal/User%20Guides/2025%20Users%20guide%20and%20quick%20reference/2025_NAL_SDF_NAP_Users_Guide.pdf |
| 2024 layout guide | https://floridarevenue.com/property/dataportal/Documents/PTO%20Data%20Portal/User%20Guides/2024%20Users%20guide%20and%20quick%20reference/2024_NAL_SDF_NAP_Users_Guide.pdf |
| County number map (CO_NO 11–77) | https://floridarevenue.com/property/Documents/CountyNumberMap.pdf |

Three file types, one per county per year, comma-delimited with a header row:

- **NAL** — Name / Address / Legal. The real property roll. Owner name, owner
  mailing address, situs address, DOR use code, just value, land value, year
  built, living area, **number of residential units**, and the last two sales
  with their qualification codes. This is the file the screen reads.
- **SDF** — Sale Data File. Every recorded transfer with its qualification code.
  Use it to build transfer history deeper than the two sales carried on the NAL.
- **NAP** — the tangible personal property roll. Useful for confirming an
  operating business at an industrial address; not used by the screen.

Only the current year sits on the site. Prior years come by request — worth
doing, because year-over-year value movement is a distress signal in itself.

**Caveat that matters:** the roll is an *assessment* record. Just value is not
market value, it is a mass-appraisal estimate as of 1 January. It is excellent
for ranking and terrible for pricing. Never quote it to a buyer as a valuation.

### Land use codes

`DOR_UC` is the field that separates an apartment complex from a warehouse.

- `03` — **Multi-family, 10 units or more**. The primary target.
- `08` — multi-family under 10 units.
- `04` / `05` — condominia / co-ops (condo-conversion and deconversion plays).
- `10`–`39` — commercial. `39` is hotels and motels.
- `40`–`49` — industrial. `41` light manufacturing, `48` warehousing and
  distribution, `49` open storage and junk yards.
- `06`, `74`, `78` — retirement homes, homes for the aged, convalescent homes.

Published tables (county appraiser mirrors, all confirmed):
- https://www.manateepao.gov/data/downloads/DOR%20LAND%20USE%20CODES.pdf
- https://www.leepa.org/Docs/Codes/DOR_Code_List.pdf
- https://files.scpafl.org/files/Public/REALPROPERTY/DOR%20Use%20Code%20List.pdf

### Sale qualification codes — the part most people miss

When a property transfers, the appraiser stamps the deed with a code recording
whether it was an arm's-length sale usable for assessment. The **disqualified**
codes are a public register of distress:

| Code | What it means |
|---|---|
| **12** | Transfer to or from a **financial institution**, or a deed **in lieu of foreclosure** — including private lenders |
| **18** | Transfer to or from a government agency — explicitly including **FDIC, HUD, Fannie Mae and Freddie Mac** |
| **38** | Transfer that was **forced or under duress**, or made to prevent foreclosure |
| **11** | Corrective, quit-claim or **tax deed**; minimum documentary stamps |

A parcel carrying code 12 or 18 on its most recent transfer is, in the state's
own records, a property that went to a lender or an agency. That is the closest
thing to a published REO list that exists in Florida, and nobody has to give you
permission to read it.

- https://floridarevenue.com/property/Documents/salequalcodes_bef01012019.pdf
- https://floridarevenue.com/property/Documents/salequalcodes_bef01012016.pdf

### Parcel geometry

If mapping is wanted later:
- https://geodata.floridagio.gov/datasets/FGIO::florida-statewide-parcels/about
- https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0

---

## 2. HUD REAC inspection scores — published evidence of neglect

The best public proof that an owner has stopped maintaining a building. HUD
inspects assisted and insured multifamily stock and publishes the score by
property and address.

| Score | Consequence |
|---|---|
| **below 60** | "Troubled Performer". Referred to the Departmental Enforcement Centre; can constitute a violation or default under the Regulatory Agreement, HAP contract or Use Agreement |
| **30 or below** | Automatic referral for administrative review |
| **below 80** | Inspected annually instead of on the longer cycle |

An owner with consecutive sub-60 scores is facing enforcement, cannot refinance
cleanly, and is close to the most reliably motivated seller in the state.

- https://www.huduser.gov/portal/datasets/pis.html
- https://www.hud.gov/stat/mfh/inspection-scores
- https://catalog.data.gov/dataset/multifamily-housing-physical-inspection-scores
- https://catalog.data.gov/dataset/public-housing-physical-inspection-scores
- Scoring rule: https://www.federalregister.gov/documents/2023/07/07/2023-14362/national-standards-for-the-physical-inspection-of-real-estate-and-associated-protocols-scoring
- HUD OIG on weak oversight of low scorers: https://www.hudoig.gov/sites/default/files/2024-02/2024-CH-0001.pdf

Feed the export to `run.py --hud <file>`. It joins by address and lifts the
distress score of any match.

---

## 3. Sunbiz — piercing the LLC

The roll gives you `CORAL BAY HOLDINGS LLC`. Sunbiz gives you the managers, the
officers, the registered agent and their addresses — the human who can sign.

- Entity search: https://search.sunbiz.org/
- Bulk downloads: https://dos.fl.gov/sunbiz/other-services/data-downloads/
- Quarterly files: https://dos.fl.gov/sunbiz/other-services/data-downloads/quarterly-data/
- Daily files: https://dos.fl.gov/sunbiz/other-services/data-downloads/daily-data/
- Corporate file layout: https://dos.myflorida.com/sunbiz/other-services/data-downloads/corporate-data-file/
- Usage terms: https://dos.fl.gov/sunbiz/other-services/data-downloads/data-usage-guide/

Two things to look for beyond the name:
1. **Administratively dissolved** status — the entity cannot convey clean title
   until reinstated, and an owner who let the filing lapse has usually stopped
   paying attention to the asset generally.
2. **A shared registered agent or officer across many entities** — you have
   found a portfolio owner, and the conversation becomes about all of it.

Every row the screen exports carries a `sunbiz_lookup` link.

---

## 4. County clerks — mortgages, assignments, lis pendens

There is **no statewide index**. Each of the 67 clerks runs its own Official
Records search. This is where you confirm what the roll cannot tell you: who
holds the mortgage, whether it has been assigned to a special servicer, and
whether a **lis pendens** has been filed — meaning foreclosure is already under
way and the clock is running.

- Directory of all 67 offices: https://www.flclerks.com/page/publicrecords

Confirmed county entry points:

| County | Link |
|---|---|
| Miami-Dade | https://www.miamidadeclerk.gov/clerk/mortgage-foreclosures.page |
| Lee | https://www.leeclerk.org/departments/official-records-services/search-official-records |
| St. Lucie | https://stlucieclerk.gov/public-search-gen/official-records-search |
| Santa Rosa (lis pendens) | https://santarosaclerk.com/courts/foreclosures-tax-deeds/lis-pendens-foreclosures/ |
| Brevard (tax deeds) | https://www.brevardclerk.us/tax-deeds |
| Pasco (tax deeds) | https://www.pascoclerk.com/201/Tax-Deed-Sales |
| Marion (tax deeds) | https://www.marioncountyclerk.org/departments/records-recording/tax-deeds-and-lands-available-for-taxes/tax-deed-sales/ |
| Orange (tax deeds) | https://www.occompt.com/191/Tax-Deed-Sales |

**A lis pendens is the single most time-sensitive signal available.** It is
filed at the start of a foreclosure, it is public the day it lands, and it opens
the window before the auction that the whole strategy depends on.

---

## 5. Delinquent taxes and tax deeds

Florida's mechanics, which set the clock:

1. Taxes go delinquent 1 April.
2. On or before 1 June the collector holds a **tax certificate sale** — a public
   auction where the certificate goes to whoever accepts the lowest interest
   rate.
3. If the certificate is not redeemed within **two years**, the holder can apply
   for a **tax deed** and force the property to public auction.

Two years of delinquency on a 200-unit apartment complex means the owner has
either lost control of it or walked away. Both are workable.

Auction platforms used by the counties: **LienHub** (lienhub.com) and
**RealAuction** (county subdomains of realtaxdeed.com and realforeclose.com).

Confirmed collector pages:
- https://pinellastaxcollector.gov/property-tax/tax-certificate-and-tax-deed/
- https://octaxcol.com/taxes/about-property-tax/tax-certificate-deed-sales/
- https://www.sarasotataxcollector.gov/services/tax-services/property-tax/tax-cert-sale
- https://taxcollector.charlottecountyfl.gov/delinquent-tax

---

## 6. Market context, mid-2026

Numbers to use with buyers, and the reason the timing is good:

| Metric | Level | Source |
|---|---|---|
| Multifamily CMBS delinquency | **7.23%**, +28 bps m/m (June 2026) | Trepp |
| Multifamily CMBS special servicing | **8.23%** (June 2026) | Trepp |
| All-sector distress rate | **11.98%** (Jan 2026), +148% over 43 months | CRED iQ |
| Multifamily delinquency, FDIC-insured banks | **1.47%** (Q1 2026), +5 bps q/q | FDIC |

Reporting: https://www.multifamilydive.com/news/trepp-crediq-apartment-distress-/825333/ ·
https://www.multifamilydive.com/news/cre-servicers-increasingly-aggressive-distressed-assets/811987/

The read: roughly one apartment loan in twelve in CMBS is with a special
servicer, and servicers are reported to be moving on assets more aggressively
than at any point in this cycle. Bank multifamily delinquency is still low in
absolute terms, which is why balance-sheet REO is thin and CMBS is where the
volume is. Point the effort at the securitised book.

---

## Not free, and how to live without them

CoStar, Reonomy, ATTOM, PropertyRadar, Trepp and CRED iQ all resell versions of
what is above with better tooling. Two things they have that public records do
not:

- **Loan-level detail** — maturity dates, DSCR, occupancy from servicer
  reporting. The genuine gap. Partial substitute: the clerk's mortgage record
  gives you the original principal, the date and the term, which brackets the
  maturity well enough to time an approach.
- **Contact data.** Substitute with Sunbiz officers plus a skip-trace vendor.

Start free. Buy Trepp or CRED iQ only once deal flow justifies it — by then
you will know exactly which one you need.
