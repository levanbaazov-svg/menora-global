"""Detect lender, servicer and agency ownership from the roll's owner name.

When a lender takes an asset back, title moves into the name of the bank, the
CMBS indenture trustee, the special servicer's REO vehicle or a federal agency
-- and the property appraiser records that name in OWN_NAME. So the assessment
roll is, among other things, a public register of who currently holds REO.

The whole trick is precision. A naive search for "TRUST" or "BANK" returns tens
of thousands of family living trusts and every branch office in the state, and
a target list that is 95% noise gets thrown away. Detection is therefore tiered
by how much a match actually tells you, and personal estate-planning vehicles
are excluded before anything else runs.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Exclusions -- run first, they veto everything below
# ---------------------------------------------------------------------------
# "SMITH FAMILY TRUST" is not a lender. Neither is a church or a city.

_PERSONAL_VEHICLE = re.compile(
    r"\b("
    r"FAMILY\s+(TRUST|LP|LTD|PARTNERSHIP)|"
    r"REVOCABLE|IRREVOCABLE|LIVING\s+TRUST|"
    r"TRUST\s+(U/?A|U/?D|UNDER\s+AGREEMENT|DATED)|"
    r"(TESTAMENTARY|GRANTOR|CHARITABLE\s+REMAINDER)\s+TRUST|"
    r"ESTATE\s+OF|LIFE\s+ESTATE|"
    r"CHURCH|SYNAGOGUE|TEMPLE|MINISTR(Y|IES)|CONGREGATION|DIOCESE|PARISH"
    r")\b",
    re.IGNORECASE,
)

# A bare "<SURNAME> TRUST" with no institutional token anywhere.
_BARE_SURNAME_TRUST = re.compile(r"^[A-Z' -]{2,28}\s+TRUST(EE)?S?$", re.IGNORECASE)

_INSTITUTIONAL_TOKEN = re.compile(
    r"\b(NATIONAL\s+ASSOCIATION|N\.?\s?A\.?|BANK|BANKERS|BANCORP|BANCSHARES|"
    r"SAVINGS|FSB|F\.?S\.?B\.?|MORTGAGE|LOAN|SERVICING|SERVICER|CAPITAL|"
    r"FUNDING|FINANCIAL|FINANCE|CREDIT\s+UNION|INDENTURE|CERTIFICATES|"
    r"PASS-?\s?THROUGH|SERIES\s+\d{4}|REMIC|SPE|DEPOSITOR|SECURITIES)\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Tier 1 -- unambiguous. Title is held by an agency, a bank or a CMBS trust.
# ---------------------------------------------------------------------------

_AGENCY = re.compile(
    r"\b("
    r"FEDERAL\s+NATIONAL\s+MORTGAGE|FANNIE\s?MAE|"
    r"FEDERAL\s+HOME\s+LOAN\s+MORTGAGE|FREDDIE\s?MAC|"
    r"GOVERNMENT\s+NATIONAL\s+MORTGAGE|GINNIE\s?MAE|"
    r"FEDERAL\s+DEPOSIT\s+INSURANCE|F\.?D\.?I\.?C\.?|"
    r"SECRETARY\s+OF\s+HOUSING|"
    r"HOUSING\s+(AND|&)\s+URBAN\s+DEVELOPMENT|"
    r"SECRETARY\s+OF\s+VETERANS|VETERANS\s+AFFAIRS|"
    r"SMALL\s+BUSINESS\s+ADMINISTRATION|"
    r"RESOLUTION\s+TRUST|"
    r"FEDERAL\s+HOME\s+LOAN\s+BANK"
    r")\b",
    re.IGNORECASE,
)

# CMBS / securitisation trustees. In a securitised loan these hold title post-
# foreclosure and the special servicer is the party who can actually sell.
_CMBS_TRUSTEE = re.compile(
    r"\b("
    r"WILMINGTON\s+(TRUST|SAVINGS)|"
    r"DEUTSCHE\s+BANK\s+(NATIONAL\s+)?TRUST|"
    r"BANK\s+OF\s+NEW\s+YORK(\s+MELLON)?|BNY\s+MELLON|"
    r"U\.?\s?S\.?\s+BANK\s+(NATIONAL|TRUST)|"
    r"COMPUTERSHARE\s+TRUST|"
    r"HSBC\s+BANK\s+USA|"
    r"CHRISTIANA\s+TRUST|"
    r"WELLS\s+FARGO\s+BANK[, ]+N"
    r")\b",
    re.IGNORECASE,
)

# Securitisation-trust naming shrapnel: "... TRUST 2019-C4", "SERIES 2021-SB88",
# "PASS-THROUGH CERTIFICATES", "AS TRUSTEE FOR ...".
_SECURITISATION = re.compile(
    r"("
    r"\bAS\s+TRUSTEE\b|\bTRUSTEE\s+FOR\b|\bINDENTURE\s+TRUSTEE\b|"
    r"\bPASS-?\s?THROUGH\s+CERTIFICATES?\b|"
    r"\bCOMMERCIAL\s+MORTGAGE\s+(PASS|TRUST|SECURITIES)|"
    r"\bMORTGAGE\s+(LOAN\s+)?TRUST\b|"
    r"\bSERIES\s+\d{4}-[A-Z0-9]{1,6}\b|"
    r"\bTRUST\s+\d{4}-[A-Z0-9]{1,6}\b|"
    r"\bREMIC\b"
    r")",
    re.IGNORECASE,
)

# Named special servicers / REO-desk operators, and the LLCs they title into.
_SPECIAL_SERVICER = re.compile(
    r"\b("
    r"LNR\s+PARTNERS|LNR\s+FLORIDA|"
    r"RIALTO\s+CAPITAL|"
    r"CWCAPITAL|C-?III\s+ASSET|"
    r"MIDLAND\s+LOAN\s+SERVICES|"
    r"TRIMONT|SITUS\s+HOLDINGS|"
    r"KEYBANK\s+REAL\s+ESTATE|"
    r"GREYSTONE\s+SERVICING|"
    r"ARGENTIC\s+SERVICES|"
    r"TORCHLIGHT|"
    r"SABAL\s+(CAPITAL|SERVICING)|"
    r"BERKADIA\s+COMMERCIAL|"
    r"PNC\s+BANK\s+NATIONAL|"
    r"SPECIALIZED\s+LOAN\s+SERVICING|"
    r"SELECT\s+PORTFOLIO\s+SERVICING|"
    r"OCWEN|SHELLPOINT|NEWREZ|MR\.?\s+COOPER|NATIONSTAR|"
    r"CARRINGTON\s+MORTGAGE|PLANET\s+HOME\s+LENDING"
    r")\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Tier 2 -- strong. Named depositories and thrift institutions.
# ---------------------------------------------------------------------------

_NAMED_BANK = re.compile(
    r"\b("
    r"BANK\s+OF\s+AMERICA|WELLS\s+FARGO|JPMORGAN|JP\s+MORGAN|CHASE\s+(BANK|MANHATTAN)|"
    r"CITIBANK|CITIMORTGAGE|TRUIST|SUNTRUST|BB\s?&\s?T|"
    r"PNC\s+BANK|REGIONS\s+BANK|FIFTH\s+THIRD|SYNOVUS|"
    r"VALLEY\s+NATIONAL|CENTENNIAL\s+BANK|SEACOAST\s+(NATIONAL\s+)?BANK|"
    r"CITY\s+NATIONAL\s+BANK|AMERIS\s+BANK|HANCOCK\s+WHITNEY|IBERIABANK|"
    r"BANKUNITED|OCEAN\s+BANK|PROFESSIONAL\s+BANK|FIRSTBANK|FLAGSTAR|"
    r"NEW\s+YORK\s+COMMUNITY\s+BANK|SIGNATURE\s+BANK|"
    r"FIRST\s+HORIZON|SOUTH\s+STATE\s+BANK|CAPITAL\s+CITY\s+BANK|"
    r"TD\s+BANK|SANTANDER|HSBC|BARCLAYS|CREDIT\s+SUISSE|GOLDMAN\s+SACHS|"
    r"MORGAN\s+STANLEY|LADDER\s+CAPITAL|STARWOOD\s+MORTGAGE|BENEFIT\s+STREET|"
    r"ARBOR\s+(REALTY|AGENCY)|WALKER\s+(AND|&)\s+DUNLOP|LUMENT|"
    r"READY\s+CAPITAL|BRIDGE\s+INVESTMENT|MF1\s+CAPITAL"
    r")\b",
    re.IGNORECASE,
)

# Generic institutional suffixes -- only counted when nothing personal matched.
_GENERIC_INSTITUTION = re.compile(
    r"("
    r"\bBANK\b|\bBANCORP\b|\bBANCSHARES\b|\bBANKING\b|"
    r"\bSAVINGS\s+(BANK|(AND|&)\s+LOAN)\b|\bF\.?S\.?B\.?\b|"
    r"\bNATIONAL\s+ASSOCIATION\b|\bN\.\s?A\.\b|"
    r"\bCREDIT\s+UNION\b|\bTRUST\s+COMPANY\b|"
    r"\bMORTGAGE\s+(CORP|COMPANY|CO|INC|LLC|FUND|CAPITAL|HOLDINGS)\b|"
    r"\bLOAN\s+SERVICING\b|\bLOAN\s+TRUST\b|"
    r"\bASSET\s+(MANAGEMENT|RECOVERY|SOLUTIONS|HOLDINGS)\b|"
    r"\bREO\b|\bOREO\b|\bREAL\s+ESTATE\s+OWNED\b|"
    r"\bRECEIVER\b|\bRECEIVERSHIP\b|\bIN\s+RECEIVERSHIP\b"
    r")",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class LenderMatch:
    """Outcome of testing one owner name."""

    is_lender: bool
    confidence: str  # "certain" | "strong" | "possible" | "none"
    category: str    # agency | cmbs_trust | special_servicer | bank | receiver | none
    note: str

    @property
    def weight(self) -> float:
        return {"certain": 1.0, "strong": 0.75, "possible": 0.4}.get(self.confidence, 0.0)


_NO_MATCH = LenderMatch(False, "none", "none", "")


def classify_owner(owner_name: str) -> LenderMatch:
    """Decide whether an owner-of-record name denotes a lender or agency."""
    name = re.sub(r"\s+", " ", (owner_name or "")).strip()
    if len(name) < 3:
        return _NO_MATCH

    # Personal estate-planning vehicles and religious bodies are never REO,
    # unless the name also carries a hard institutional token.
    if _PERSONAL_VEHICLE.search(name) and not _INSTITUTIONAL_TOKEN.search(name):
        return _NO_MATCH
    if _BARE_SURNAME_TRUST.match(name) and not _INSTITUTIONAL_TOKEN.search(name):
        return _NO_MATCH

    if _AGENCY.search(name):
        return LenderMatch(True, "certain", "agency",
                           "Federal agency or GSE holds title -- disposition is by published process")
    if _SPECIAL_SERVICER.search(name):
        return LenderMatch(True, "certain", "special_servicer",
                           "Special servicer / REO desk holds title -- sale authority sits with the servicer")
    if _SECURITISATION.search(name):
        return LenderMatch(True, "certain", "cmbs_trust",
                           "Securitisation trust holds title -- approach the special servicer, not the trustee")
    if _CMBS_TRUSTEE.search(name):
        return LenderMatch(True, "certain", "cmbs_trust",
                           "CMBS indenture trustee of record")
    if _NAMED_BANK.search(name):
        return LenderMatch(True, "strong", "bank",
                           "Named depository or debt fund holds title -- likely REO on the balance sheet")
    if _GENERIC_INSTITUTION.search(name):
        matched = _GENERIC_INSTITUTION.search(name)
        token = matched.group(0).strip() if matched else ""
        category = "receiver" if re.search(r"RECEIVER", name, re.IGNORECASE) else "bank"
        return LenderMatch(True, "possible", category,
                           f"Institutional owner name (matched {token!r}) -- verify before working")

    return _NO_MATCH


# ---------------------------------------------------------------------------
# Entity-owner detection (for the non-REO half of the list)
# ---------------------------------------------------------------------------

_ENTITY_SUFFIX = re.compile(
    r"\b(LLC|L\.L\.C\.|INC|CORP|CORPORATION|LP|L\.P\.|LLP|LTD|COMPANY|CO|"
    r"PARTNERS|PARTNERSHIP|HOLDINGS|ASSOCIATES|PROPERTIES|REALTY|"
    r"INVESTMENTS?|GROUP|VENTURES?|CAPITAL|MANAGEMENT|APARTMENTS?)\b",
    re.IGNORECASE,
)


def is_entity_owner(owner_name: str) -> bool:
    """True when the owner is a company rather than a natural person.

    Entity owners are the ones worth chasing through Sunbiz to find a human
    with signing authority.
    """
    return bool(_ENTITY_SUFFIX.search(owner_name or ""))


def sunbiz_search_url(owner_name: str) -> str:
    """Deep link into the Florida Division of Corporations entity search."""
    from urllib.parse import quote_plus

    cleaned = re.sub(r"[^A-Za-z0-9 &-]", " ", owner_name or "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return (
        "https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults"
        f"?inquiryType=EntityName&searchTerm={quote_plus(cleaned)}"
    )
