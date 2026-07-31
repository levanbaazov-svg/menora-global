# Compliance notes

Not legal advice. These are the four places this specific business model touches
Florida law, flagged so you can structure around them from the start. Get a
Florida real estate lawyer to confirm before the first deal, not after the
tenth.

---

## 1. The licensing line — the one that actually matters here

The brief describes getting "to the ownership", taking the property "as a
listing", and selling it to your buyers. Read literally, that is brokerage.

Under Chapter 475, Florida Statutes, selling, offering, negotiating or
advertising real property **for another**, for compensation, requires a Florida
real estate licence. Unlicensed practice is prosecutable as a felony — this is
not a technicality that gets waved through.

The distinction that decides which side of the line you land on:

| | Brokerage (needs a licence) | Principal (does not) |
|---|---|---|
| What you hold | Someone else's authority to sell | Your own contractual interest |
| What you market | The property | Your contract |
| How you are paid | Commission on their sale | The spread on your own position |

Four ways to run this compliantly. Pick one before you start calling:

1. **Get licensed**, or bring in a licensed broker as a partner and split. Least
   friction, and you keep the "listing" model intact.
2. **Act as principal — contract, then assign.** Put the property under contract
   yourself, then assign that contract for a fee. Legal in Florida. The trap is
   in the marketing: you may advertise **your equitable interest in the
   contract**, not the property itself. Advertising the building as though you
   can sell it is unlicensed brokerage even with a contract in hand. This is
   precisely the line the model as described walks over, and it is entirely
   avoidable by changing what you say, not what you do.
3. **Double close.** Buy it, then sell it. Cleanest, needs capital or
   transactional funding.
4. **Buy the note.** You are purchasing a debt instrument, not brokering real
   property. Different regime — see below.

Note that a "finder's fee" is generally **not** a safe harbour in Florida. Do
not rely on it.

---

## 2. Note purchasing

Buying defaulted commercial mortgages is not real estate brokerage and the
licensing analysis above does not apply. Two things to check with counsel:

- **Servicing.** Collecting on a loan you own may bring you inside Florida's
  consumer collection and mortgage servicing rules. Most buyers appoint a
  licensed sub-servicer and avoid the question entirely.
- **Collateral type.** Notes secured by residential property of one to four
  units attract materially more regulation than commercial and 5+ unit
  multifamily. Staying in commercial and large multifamily keeps this simple —
  which is where the brief is pointed anyway.

---

## 3. Data use

- **DOR rolls** are public records, published for exactly this kind of reuse.
  No restriction on commercial use.
- **Sunbiz bulk data** has published usage terms — read them:
  https://dos.fl.gov/sunbiz/other-services/data-downloads/data-usage-guide/
- **County appraiser and clerk sites** sometimes restrict bulk scraping or
  commercial redistribution in their own terms even though the underlying
  records are public. Check per county before automating against them. Pulling
  the statewide DOR file avoids this entirely, which is another reason the
  screen is built on it.
- **Do not resell the raw data** as a product. Using it to source your own deals
  is not the same thing as redistributing it, and the second one gets attention.

---

## 4. Outreach

You will be cold-contacting property owners. Three regimes apply:

- **TCPA.** Autodialed or prerecorded calls and texts to mobile numbers need
  prior express consent. Skip-traced mobile numbers do not come with consent.
  This is the most-litigated statute in the space and the plaintiff bar is
  organised.
- **Do Not Call.** The federal registry covers residential and, in practice,
  personal mobile numbers. An individual owner's personal line is exposed even
  though the property is commercial.
- **Florida Telephone Solicitation Act.** Florida's own mini-TCPA. It was
  narrowed by amendment in 2023 but remains live, and Florida is an active
  venue. Get current advice before running any phone campaign at volume.

Practical consequence: **direct mail to the owner's roll mailing address is the
safe default**, and it works unusually well here. The mailing address in the
roll is a verified address the owner actually receives post at — that is why it
is in the file. Manually dialled calls to a published business number for a
commercial counterparty are lower risk than autodialed calls to a personal
mobile, but "lower" is not "none".

For lender and servicer contacts, none of this bites — those are business lines
and business counterparties.

---

## 5. What to say about the data itself

When you take a screened property to a buyer, be precise about what the numbers
are:

- Just value is a **mass-appraisal assessment**, not an appraisal and not market
  value. Presenting it as a valuation is misrepresentation.
- Unit counts, year built and building area come from the assessment roll and
  are frequently stale or wrong. Verify before they appear in anything a buyer
  relies on.
- A lender detected from the owner name is an **inference from a public record**,
  not confirmation. Confirm at the clerk before telling anyone a property is
  bank-owned.

The screen's own output is deliberately worded this way — every dossier carries
a verification section for exactly this reason. Keep it attached when you pass
material on.
