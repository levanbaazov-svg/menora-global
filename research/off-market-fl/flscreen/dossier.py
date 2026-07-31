"""Per-target dossier: everything needed to open a conversation about one asset.

Each dossier is the sheet you work from before picking up the phone -- what the
asset is, who is on title, why the screen flagged it, what still has to be
verified from primary sources, and who actually has authority to sell.

Only source links that have been confirmed to exist are emitted. Florida has 67
separate clerks and 67 separate property appraisers on unrelated domains, and
guessing at those URLs would put dead links in front of a seller. Where a
verified deep link is not available the dossier names the office and points at
the statewide directory instead.
"""

from __future__ import annotations

import re
from pathlib import Path

from .lenders import is_entity_owner, sunbiz_search_url
from .score import Parcel, metro_tier, tier_label

# Statewide entry points -- all confirmed live.
FL_CLERK_DIRECTORY = "https://www.flclerks.com/page/publicrecords"
SUNBIZ_SEARCH = "https://search.sunbiz.org/"
FDOR_DATA_PORTAL = (
    "https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx"
)

# County offices confirmed during source verification. Deliberately partial.
VERIFIED_CLERK_LINKS: dict[int, str] = {
    23: "https://www.miamidadeclerk.gov/clerk/mortgage-foreclosures.page",
    46: "https://www.leeclerk.org/departments/official-records-services/search-official-records",
    66: "https://stlucieclerk.gov/public-search-gen/official-records-search",
    67: "https://santarosaclerk.com/courts/foreclosures-tax-deeds/lis-pendens-foreclosures/",
    15: "https://www.brevardclerk.us/tax-deeds",
    61: "https://www.pascoclerk.com/201/Tax-Deed-Sales",
    52: ("https://www.marioncountyclerk.org/departments/records-recording/"
         "tax-deeds-and-lands-available-for-taxes/tax-deed-sales/"),
    58: "https://www.occompt.com/191/Tax-Deed-Sales",
}

VERIFIED_TAX_LINKS: dict[int, str] = {
    62: "https://pinellastaxcollector.gov/property-tax/tax-certificate-and-tax-deed/",
    58: "https://octaxcol.com/taxes/about-property-tax/tax-certificate-deed-sales/",
    68: "https://www.sarasotataxcollector.gov/services/tax-services/property-tax/tax-cert-sale",
    18: "https://taxcollector.charlottecountyfl.gov/delinquent-tax",
}


def _money(value: float | None) -> str:
    return f"${value:,.0f}" if value else "not stated"


def _slug(text: str, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "-", (text or "")).strip("-").lower()
    return cleaned[:60] or fallback


def render(parcel: Parcel, rank: int) -> str:
    """Render one dossier as markdown."""
    site = parcel.site_addr or "(no situs address in roll)"
    city = parcel.site_city or parcel.county
    lender = parcel.lender
    lender_held = bool(lender and lender.is_lender)

    lines: list[str] = []
    add = lines.append

    add(f"# #{rank} — {site}, {city}")
    add("")
    add(f"**{tier_label(parcel.opportunity)}**  ·  "
        f"opportunity {parcel.opportunity} · distress {parcel.distress} · "
        f"location {parcel.location}")
    add("")

    # --- the asset -------------------------------------------------------
    add("## Asset")
    add("")
    add("| | |")
    add("|---|---|")
    add(f"| County | {parcel.county} (CO_NO {parcel.county_no}, tier {metro_tier(parcel.county_no)}) |")
    add(f"| Parcel ID | `{parcel.parcel_id}` |")
    add(f"| Use | {parcel.dor_use_code} — {parcel.use_description} |")
    if parcel.n_units:
        add(f"| Units | {parcel.n_units} |")
    if parcel.living_area:
        add(f"| Building area | {parcel.living_area:,.0f} sq ft |")
    if parcel.n_buildings:
        add(f"| Buildings | {parcel.n_buildings} |")
    year = parcel.act_year_built or parcel.eff_year_built
    if year:
        add(f"| Year built | {year} ({parcel.age} years old) |")
    add(f"| Just value | {_money(parcel.just_value)} |")
    add(f"| Land value | {_money(parcel.land_value)} |")
    if parcel.value_per_unit:
        add(f"| Value per unit | {_money(parcel.value_per_unit)} |")
    if parcel.peer_ratio is not None:
        add(f"| vs county peers | {parcel.peer_ratio:.0%} of the median for this use class |")
    add("")

    # --- ownership -------------------------------------------------------
    add("## Ownership of record")
    add("")
    add(f"- **{parcel.owner_name}**")
    mailing = ", ".join(
        x for x in (parcel.owner_addr, parcel.owner_city, parcel.owner_state, parcel.owner_zip) if x
    )
    if mailing:
        add(f"- Mailing address: {mailing}")
    if parcel.owner_state and parcel.owner_state.upper() != "FL":
        add(f"- Absentee — owner mails to {parcel.owner_state.upper()}, not Florida")
    if parcel.sale_year_1:
        held = f"{parcel.years_held} years" if parcel.years_held is not None else "unknown"
        add(f"- Acquired {parcel.sale_year_1} for {_money(parcel.sale_price_1)} (held {held})")
        if parcel.qual_code_1 is not None:
            add(f"- Transfer qualification code on that deed: `{parcel.qual_code_1}`")
    else:
        add("- No qualified sale on record — long-held, and the basis is probably very low")
    add("")

    # --- why it is on the list ------------------------------------------
    add("## Why it surfaced")
    add("")
    for signal in parcel.signals:
        add(f"- {signal}")
    add("")

    # --- how to approach -------------------------------------------------
    add("## Route to the decision-maker")
    add("")
    if lender_held:
        add(f"- Title sits with a **{lender.category.replace('_', ' ')}** "
            f"({lender.confidence} match).")
        add(f"- {lender.note}")
        if lender.category == "cmbs_trust":
            add("- The trustee named on title has no authority to sell. Read the deal name out "
                "of the owner string, look the deal up, and find the **special servicer** — "
                "that is the only party who can negotiate a note or REO sale.")
        add("- Ask for the asset manager by name and by asset, not the general line. "
            "Request the broker opinion of value and the most recent rent roll and T-12.")
    elif is_entity_owner(parcel.owner_name):
        add("- Entity on title. Pull the Sunbiz record for the managers, officers and "
            "registered agent, then approach the principal directly.")
        add(f"- Sunbiz lookup: {sunbiz_search_url(parcel.owner_name)}")
    else:
        add("- Individually owned. The roll mailing address is the owner's own — "
            "direct mail there first, then skip-trace for a phone number.")
    add("")

    # --- verification ----------------------------------------------------
    add("## Verify before you spend money on this")
    add("")
    add("The roll is an assessment record, not a title report. Everything below has to be "
        "confirmed at the primary source:")
    add("")
    add(f"1. **Open mortgages, assignments and any lis pendens** — {parcel.county} Clerk of the "
        "Circuit Court, Official Records. A lis pendens on the parcel means foreclosure is "
        "already filed and the clock is running.")
    clerk = VERIFIED_CLERK_LINKS.get(parcel.county_no or -1)
    add(f"   - {clerk}" if clerk else f"   - Find the office via {FL_CLERK_DIRECTORY}")
    add(f"2. **Delinquent taxes and outstanding certificates** — {parcel.county} Tax Collector. "
        "Two years of delinquency lets a certificate holder force a tax deed sale.")
    tax = VERIFIED_TAX_LINKS.get(parcel.county_no or -1)
    if tax:
        add(f"   - {tax}")
    add(f"3. **Code enforcement and open permits** — the municipality, not the county, where the "
        f"parcel sits inside city limits ({parcel.site_city or 'city unknown'}).")
    add("4. **Current condition and occupancy** — drive it. The roll will never tell you the "
        "building is half empty.")
    add(f"5. **Owner entity standing** — {SUNBIZ_SEARCH} (an administratively dissolved LLC "
        "cannot convey clean title until it is reinstated).")
    add("")
    add("---")
    add("")
    add(f"_Screened from the Florida DOR assessment roll ({FDOR_DATA_PORTAL}). "
        "Assessment data is a lead-generation source; it is not title, and just value is not "
        "market value._")
    add("")
    return "\n".join(lines)


def write_all(parcels: list[Parcel], destination: Path, limit: int = 50) -> int:
    """Write one markdown dossier per target. Returns how many were written."""
    destination.mkdir(parents=True, exist_ok=True)
    written = 0
    for rank, parcel in enumerate(parcels[:limit], start=1):
        stem = _slug(parcel.site_addr or parcel.parcel_id, f"parcel-{rank}")
        path = destination / f"{rank:03d}-{parcel.county.lower().replace(' ', '-')}-{stem}.md"
        path.write_text(render(parcel, rank), encoding="utf-8")
        written += 1
    return written
