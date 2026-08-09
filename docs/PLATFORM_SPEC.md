# Online Cheder — Platform Specification v1.1

*Prepared by Siman Tov and the founding team · August 2026.*

This document is a complete, self-contained specification of the Online Cheder platform. A development team — human or AI-agent-driven — should be able to build the entire product from this document alone, step by step, without access to the authors. A working visual reference of the intended look, tone and interaction style is deployed at **https://online-cheder.vercel.app** (source: `github.com/levanbaazov-svg/online-cheder`).

Requirement language: **MUST** = non-negotiable; **SHOULD** = strong default, deviate only with a documented reason; **MAY** = optional.

**Authority.** The school operates under the spiritual leadership of **Rabbi Adi Khanukaev** (Chabad). **Home base: Miami, Florida** — first cohorts anchor to Eastern Time; the first in-person hub is the Chabad House in Hollywood, FL. Every content rule, visual boundary, and halachic question in this document ultimately routes to him ("the Rav"). His written guidelines override any default stated here.

---

## 1. Vision

Build the finest Jewish primary education ever offered — not a budget substitute for families priced out of day school, but a **top-tier school** that technology finally makes possible:

1. **Every learning material is alive.** Text can be opened word by word, argued with, mapped, assembled, animated, and turned by the child into pictures and short videos — always inside boundaries the Rav approves.
2. **Every child has a personal program.** No child waits for the class; no child sinks silently. The program adapts continuously to each child's pace and level in every subject independently.
3. **People remain the core.** The single most important research finding behind this product (Alpha School's own data): adaptive platforms alone produce ordinary results — the value is the combination *platform + live mentor + motivation*. Online Cheder is a school with a living social fabric, delivered online; it is not a content app.

Affordability (tuition inside state-voucher amounts) is a consequence of the model, not its point.

**Scale goal:** from ~30 boys in one city to thousands of talmidim worldwide.

## 2. Audience & Scope

| Dimension | Launch scope | Later |
|---|---|---|
| Students | Boys, grades 1–5 (ages ~6–11) | Girls' cohorts (separate); grades 6–8; mesivta track |
| Families | Religious (Chabad and close), incl. shluchim families and small communities without a Jewish school | Wider Orthodox spectrum |
| Languages | English UI + Hebrew learning content; full RTL support | Russian UI; Yiddish content options |
| Time zones | US East/Central/West cohorts | EU/IL cohorts |
| Devices | iPad-first (managed/school mode), desktop browser | Android tablets |

Every cohort is a real class: same daily live anchors, same rebbi, stable chavrusa pairs.

## 3. Product Pillars (non-negotiable)

### P1 — Live human fabric

Rule: **every school day, each child meets live people at least three times.**

- **Live tefilla every morning** — the whole cohort in one video room with the rebbi; the interactive siddur runs synchronized on each child's screen.
- **Daily chavrusa** — a stable pair (matched by level and time zone, stable for the term), 15–20 minutes on video, with a structured mission generated from that morning's learning.
- **Live shiur with the rebbi** — 2–3 times per week per cohort.
- **Mashpia (mentor)** — one adult per 10–15 children; a scheduled weekly 30-minute 1:1 with each child; reachable via in-app messaging between sessions.
- **City hubs** — monthly in-person gatherings at the local Chabad House (farbrengen, melave malka, the raffle draw); the platform manages hub locations, RSVPs and attendance.
- **Seasonal events** — Shabbatons 2–3×/year, summer program; managed in-platform (registration, logistics comms).

### P2 — A personal program for every child

- Entry **diagnostic** per subject → the child starts at a real level per subject ("kriah level 4, Chumash level 2, math level 5"), not at a grade.
- **Mastery gates:** a unit is passed only at ≥80% first-try accuracy on its check; failed items return until answered correctly; the next unit stays locked until mastery.
- **Weekly replan:** every week the system rebuilds each child's plan from actual data. Strong performance → depth and acceleration (next sugya, more meforshim, harder problem sets), never busywork. Weak performance → automatic same-day flag to the mashpia and rebbi, added 1:1 time, an easier ramp.
- Live anchors (tefilla, shiur, chavrusa, holidays) remain school-paced — personalization must never dissolve the class.

### P3 — Immersive materials

- **Sugya maps** — every Mishna/Gemara unit ships with an interactive map of the machlokes: who holds what, who argues with whom, who quotes whom. The child explores it, then reassembles it as an exercise. Maps are authored editorially, never generated on the fly.
- **Word-level interactive text** — Chumash, Mishna and siddur text opens word by word on tap: translation, shoresh, Rashi's comment where relevant.
- **"Bring it to life"** — after finishing a unit the child generates an illustration or a 20–30-second video of what he just learned (see §8.1 for the strict template mechanism).
- **Diagram puzzles** — sefiros, seder hishtalshelus, mishkan layout, halachic processes (e.g., hagalas keilim): canonical diagrams the child assembles like a puzzle.
- **Guide character** — a fully animated, *speaking* melamed mascot accompanies the child everywhere (see §5.0 and §5.10).

### P4 — Motivation economy

Digitizes the ticket-and-raffle culture every cheder already runs (see §10 for full rules): tickets earned automatically for mastered units, streaks, chavrusa attendance and davening *skills*; a monthly raffle **drawn live** at the city hub or all-school video assembly; a cheder store with real prizes and a tzedakah option the school matches.

Hard rule: **kavanah is never converted to points.** Gamification applies to skills around davening (fluency, knowing the meaning of words, order of tefillos) — never to prayer itself.

### P5 — Guardrails & trust

- **No AI content reaches a child without human review**; for this school the reviewing standard is the Rav's.
- The Rav maintains one **written guidelines document** (what may be depicted, generation boundaries, tutor rules, game/prize boundaries); the platform enforces it everywhere mechanically.
- **No cameras watching children, no surveillance software.** Oversight comes from mentors and learning data. (Live video rooms are classes, not monitoring.)
- **Locked-down experience:** on managed iPads the child cannot leave the school environment during school hours; no open internet, no external video, no social features beyond the school's own rooms.
- **Child-data minimization:** collect only what learning requires; no ads, no third-party trackers; COPPA-compliant parental consent; full data export for every family.

## 4. The Student Day

The scheduling engine composes each child's day from school-paced anchors (fixed per cohort) and student-paced blocks (filled from the child's personal plan). Blocks are **≤30 minutes**. Reference day (grade 3):

| Time | Block | Type |
|---|---|---|
| 8:00 | Tefilla with the whole class | Live · school-paced |
| 8:40 | Chumash unit (personal level) | Lesson · student-paced |
| 9:15 | Recess — approved games | Break |
| 9:35 | Mishna unit + sugya map | Lesson · student-paced |
| 10:10 | Chavrusa (stable pair, structured mission) | Live |
| 10:40 | Math — adaptive platform + fluency sprint | General studies · student-paced |
| 11:30 | Lunch & outside — **screens off** | Off-screen |
| 1:00 | English reading — adaptive platform | General studies · student-paced |
| 1:45 | Chassidus story + diagram puzzle | Lesson |
| 2:15 | Bring it to life — scene studio | Creative |
| 2:30 | Shiur with the rebbi (M/W/F) or mashpia 1:1 (T/Th) | Live |
| 3:15 | Mincha + day recap, tickets counted | Live |

Rules:
- The engine MUST show one clear "Up next" at all times; completed blocks show green checks; live blocks display a LIVE badge and one-tap join.
- Screens-off blocks are first-class citizens: rendered in the schedule, not skippable silently; a parent-visible "went outside" check-in MAY be used.
- The day header shows the Hebrew date and the week's parsha (computed, e.g. via `@hebcal/core`).
- Weekly recurring items (mashpia 1:1, Sunday city meetup) are pinned below the day.

## 5. Experience Specification

### 5.0 Voice-first interaction layer
The school talks. This is a platform-wide layer, not a feature of one screen:
- **The Rebbe speaks.** Every guidance moment — onboarding, the school tour, entering a room, starting a lesson, praise on mastery — is delivered by the guide character with real speech and lip-synced animation. Implementation today: on-device speech synthesis (works offline, no keys); production: a realtime voice model (e.g. GPT-realtime / Gemini Live class) behind the same `voice` module, so the swap touches one file.
- **Voice commands.** A microphone button on the character listens and navigates: "Chumash", "math", "my day", "store" — the child steers the school by talking to the Rebbe. Production upgrades this to free conversation with the AI-tutor rules of §8.2.
- **Everything can be heard.** Every Hebrew phrase and word carries a "hear it" control (transliteration + meaning read aloud); lesson texts are narrated; the siddur reads along.
- Voice defaults ON with a one-tap mute, persisted per device. No audio is ever recorded or stored (P5).

### 5.1 Accounts & onboarding
- **Family account** (parent email/password + OAuth), children as sub-profiles; one login per child on his device via magic link / device profile — a child never types passwords daily.
- Enrollment flow: family application → intake call scheduling → payment/voucher/scholarship setup → child diagnostic (§6.1) → cohort & chavrusa assignment → device setup guide (managed mode).
- Roles: child, parent, rebbi, mashpia, content editor, Rav (reviewer), admin.

### 5.2 The school campus (child home)
The child lands in a **school**, not a menu: a campus of illustrated classroom doors — Beis Midrash, Chumash Room, Mishna & Gemara, Chassidus Corner, Math Lab, Library & English, Art Studio, the Yard, the Cheder Store, and My Desk. Each door shows its Hebrew name, a hand-drawn vignette and a live status line ("Today: Bereishis 1:1").
- **First-visit tour:** the Rebbe walks the child door to door with voice — exactly like being shown around a new school — ending at "start my day". Re-playable anytime ("Tour again").
- **Classrooms:** entering a room gives a subject home, like a physical classroom: the day's task front and center (into the lesson player), a **class board** (moderated discussion with classmates — the rebbi reads everything), a **shelf** of extra materials (stories, maps, audio, puzzles), and one-tap **"Ask the Rebbi"**.
- Onboarding is conversational: the character greets the child by voice, asks his name, grade and favorite subject step by step — the school knows him before he walks in.

### 5.2a My Day (schedule view)
The schedule of §4. Greeting by name, Hebrew date + parsha, day progress (n of m blocks), ticket balance always visible in the header, one-tap navigation to store and progress.

### 5.3 Live rooms
- Integrated video rooms (SDK-based — e.g. LiveKit/Daily/Zoom SDK) for: cohort tefilla/shiur/mincha (rebbi-moderated, children default-muted with raise-hand), chavrusa (2 children, auto-created at the scheduled time), mashpia 1:1.
- Tefilla room runs the **synchronized siddur**: the rebbi's current line is highlighted on every child's screen; children read aloud together.
- Chavrusa room shows the **mission card** (3 structured steps generated from the morning's unit, e.g. "Say the Mishna to your chavrusa in your own words → he says it back → agree on the din") with checkboxes both children tick; completing all steps ends the session and credits tickets to both.
- Recordings: shiurim MAY be recorded for absent children; chavrusas and 1:1s are never recorded (P5).

### 5.4 Lesson player
One player renders all unit types from a declarative unit definition (JSON) produced by the content studio (§5.13):
- **Word-tap text** (Chumash/Mishna/siddur): RTL Hebrew with nikud; tap → meaning panel; "all words opened" gates progress.
- **Question stage** (e.g., Rashi's question): multiple choice with wrong-answer feedback written by the editor.
- **Sugya map**: node graph (speakers, claims, questions, din) — explore stage then reassembly exercise (drag/tap "who said this?").
- **Diagram puzzle**: assemble a canonical chart from parts; snap-and-glow feedback.
- **Media stage**: short editorial video/animation.
- **Mastery check**: item bank per unit; ≥80% first-try gate; failed items recycle; result written to the progress store.
- Every unit ends with a completion screen: reward, next-unit teaser, and (where relevant) a "Bring it to life" shortcut.

### 5.5 Interactive siddur
Standalone module and the engine of the tefilla room: full nusach text (grade-appropriate scope), line highlighting, word-tap meanings, transliteration toggle, reading-fluency practice mode with streaks. Skills tracked: fluency, vocabulary, order. (See P4 rule on kavanah.)

### 5.6 "Bring it to life" studio
The child turns today's learning into a picture or a 20–30-second video. Full mechanism in §8.1. Available both as a daily schedule block and as a side button on every eligible lesson ("watch this Mishna happen").

### 5.7 Recess
A walled-garden game catalog (school-approved only): fluency games (math sprint, sight-word race), chess vs. classmates, parsha puzzles, drawing studio. Games open only during recess blocks; everything else stays locked. The catalog is curated by the school, and additions require Rav sign-off if content-bearing.

### 5.8 Tickets, store & raffle
See §10. Screens: balance + earning history; monthly raffle card (prize, live-draw date/location, entries); store grid (physical prizes shipped, experiences, tzedakah with school matching); parent-visible ledger.

### 5.9 Progress
- Child view: per-subject **levels** (not one grade), mastery bars, davening streak, "the plan rebuilds weekly" explainer. Tone: encouraging, never comparative between children; no public leaderboards.
- Data comes from the single progress store (§11), including general-studies platform results via their APIs.

### 5.10 Guide character
- An animated melamed mascot (established asset: warm chassidic melamed with black hat, glasses, beard, holding a tablet) present on every screen: floating idle animation, context-aware speech-bubble tips per screen and per state ("Five in a row and the level jumps!", "Want to SEE this Mishna? Tap Bring it to life"), tap to cycle tips, dismissible.
- The character voices the platform: hints, praise on mastery, gentle nudges on returns after absence. It MUST NOT nag, shame, or interrupt live rooms.
- All character lines ship from a reviewed script file (no free-form LLM text to children outside the tutor, §8.2).

### 5.11 Parent portal
- Weekly report **generated automatically from the progress store** (no teacher hand-writes reports): units mastered with first-try %, davening/chavrusa attendance, level changes, what the mashpia will address next.
- Live view of the child's schedule and progress; ticket ledger; billing/voucher status; consent and data controls; contact channel to mashpia.
- Parent controls: schedule window, recess game visibility, tzedakah matching opt-in.

### 5.12 Staff console (rebbi / mashpia)
- Cohort dashboard: today's attendance, mastery flow, children flagged by the replan engine (same-day dips), chavrusa health (missed sessions, imbalance).
- 1:1 view per child: full learning history, notes (private, minimal), flag resolution.
- Review queues route here for editors and the Rav (§5.13, §8).

### 5.13 Content studio (internal)
- Authoring of units as structured documents (the **master scenario**: one source file per lesson with language variants; EN is derived from the master, Hebrew content embedded) → preview in the real lesson player → **review workflow**: editor → pedagogic reviewer → the Rav (for kodesh content) → publish.
- **Versioning:** every unit carries a version (v1, v1.1) and a change log; published changes never silently alter a child's in-progress unit.
- **Template library** for generation (§8.1) lives here with the same review workflow.
- Item banks, siddur scope per grade, character script, raffle/store catalog — all managed here.

## 6. Personalization Engine

### 6.1 Diagnostic
Per subject, adaptive, short (≤15 min/subject, spread over the first week). Output: starting level per subject + specific gaps. Reviewed by the mashpia in the first-week call.

### 6.2 Mastery model
- Content is a directed graph of units per subject with prerequisites.
- Unit state per child: locked / available / in-progress / mastered (with first-try %).
- Mastery gate ≥80% first-try; retries change state to mastered but preserve the original first-try score for planning.

### 6.3 Weekly replan
Runs weekly per child (plus immediate triggers on strong signals):
- Ahead of pace + high mastery → schedule depth/enrichment units and acceleration.
- Below gate or slowing → schedule remediation ramps, add tutor time, and **flag the mashpia and rebbi the same day** with a one-line reason ("Mishna dipped: 62% on Shnayim Ochazin retry").
- Output feeds the schedule engine and the parent report. Every replan decision is logged and inspectable by staff (no silent black box).

### 6.4 Chavrusa matching
Pairs by subject level + time zone; stable for the term; rebalanced only by mashpia decision. The mission generator produces each day's 3-step chavrusa card from the pair's morning units.

## 7. Curriculum Framework

### 7.1 Limudei kodesh (produced in-house, Rav-reviewed)
By grade (boys 1–5 at launch): kriah → Chumash with Rashi → Mishna (from grade 4) → Gemara (grade 5+) → halacha/minhagim by calendar → Chassidus (stories + concepts with diagrams) → tefilla skills. Structure per subject: units of 10–25 minutes in the lesson player, mapped to the mastery graph. The Jewish calendar drives a school-paced overlay (Yamim Tovim units for the whole cohort).

### 7.2 General studies (assembled, not produced)
Framed exactly as strong Chabad schools frame it (reference: Lubavitch Educational Center, Miami): dual curriculum, secular block ~1.5–2 hours in the afternoon; math, English reading + a real writing program, light project-based science/social studies; after 8th grade the secular program becomes optional (state-required only).
- Delivery via best-in-class adaptive platforms integrated into the schedule and ticket economy: **math** — Beast Academy-class depth (with a fluency-game layer of our own); **reading** — Lexia-class adaptive; IXL-class as an administrative backbone where useful. Platform results MUST flow into the single progress store (API/export), and platform sessions launch from our schedule inside the managed device.
- Writing is ours: units + the AI tutor as a Socratic editor (§8.2).

### 7.3 Content operations
- **Buffer rule:** at any moment, ≥4 weeks of upcoming calendar-paced content is fully published ahead; at launch, 8 weeks ahead.
- One master scenario per lesson (single source of truth); translations derived, never forked.

## 8. AI Subsystems

### 8.1 Generation inside approved templates ("Bring it to life")
- The child never types free prompts. He picks a **scene template** tied to what he just learned; templates are authored in the content studio and **individually approved by the Rav** before any child sees them.
- A template fixes: subject scene, allowed style, what may and may not be depicted. Standing restrictions (Rav may tighten): no depictions of Chazal/gedolim as identifiable figures; no free-form illustration of holy texts; no shem Hashem in generated output; modest, warm, children's-book styles only.
- Pipeline: template + child's unit context → generation API (image / short video) → **automated content filter → human moderation queue** (staff console) for any output outside the pre-cleared style envelope → delivery to the child, saved to his gallery, shareable to the family only.
- Every generated asset is watermarked internally with template ID + version for audit.
- Latency target: image ≤20s, video ≤90s, with the guide character narrating the wait.

### 8.2 AI tutor
- A **separate mini-app** beside the LMS (shared login via magic link), Socratic by design: leads with questions, never does the child's work, never contradicts the school's derech.
- **Written tutor rules** (part of the Rav's guidelines document) before the first child uses it: forbidden topics, escalation to an adult (mashpia notified in-app), absolute ban on collecting personal information, tone, hashkafic boundaries.
- **Eval suite:** ~40 scripted conversations — typical questions plus provocations ("does G-d exist?", "my mother doesn't keep Shabbos", attempts to extract personal data, attempts to get answers to mastery checks). The suite runs on **every** prompt/model change; regressions block release.
- **Limits:** ~30 tutor messages/day per child; per-family API cost counter visible to admin; all dialogs logged and sampled weekly by a human reviewer during beta.

## 9. Safety, Privacy & Compliance
- COPPA-compliant consent; child PII minimized (name, grade, cohort, learning data only); no third-party ad/analytics trackers on child surfaces.
- Data export (full family record) and deletion on request; families own their data.
- Live rooms: staff-moderated; join restricted to rosters; no recordings of chavrusa/1:1.
- Managed-device guide for parents (Apple School/Guided Access profiles) shipped as part of onboarding.
- Legal posture: homeschool-support program (AFA model); voucher/ESA compatibility tracked per state (Florida PEP-class programs cover online curricula today; school-status vouchers require separate registration — out of platform scope).

## 10. Motivation Economy Rules
- Earning (automatic, from the progress store — never hand-entered): mastered unit (+10), fluency streaks (+2/day), chavrusa completed (+5), davening-skills progress (+5), weekly plan completed (+15). Exact values tunable by admin; anti-farming caps per day.
- **Raffle:** monthly; entries purchased with tickets (e.g., 5/entry, capped); the draw happens **live** at the city-hub gathering or all-school assembly — the mechanic deliberately feeds P1 attendance.
- **Store:** physical prizes (shipped), experiences (pizza party with the class), seforim; **tzedakah option** — the child gives tickets' value as tzedakah in his name and the school matches it 1:1.
- The Rav approves the catalog and may cap competitiveness (no public rankings; a child sees his own history only).

## 11. Architecture & Integration (reference)
- **Frontend:** Next.js (App Router) + Tailwind; white, clean UI with per-subject color accents (blue Chumash, violet Mishna, teal math, amber tickets, rose live, green success); Hebrew via proper RTL rendering and a Hebrew-capable font stack; iPad-first responsive.
- **Backend:** managed Postgres as the **single progress store** ("the glue"): profiles, unit states, mastery scores, tickets ledger, flags, schedules, chavrusa pairs, content versions. All reports and dashboards read from it; nothing is assembled by hand.
- **Auth:** family-account model of §5.1 (e.g., NextAuth-class), children via magic-link device profiles; single login across LMS and tutor mini-app.
- **Live video:** embedded SDK (LiveKit/Daily/Zoom SDK) with roster-gated rooms and the synchronized-siddur data channel.
- **Content:** units as versioned structured documents in the content studio; published to a CDN-backed content service consumed by the lesson player.
- **Integrations:** general-studies platforms (progress pull via API/exports), generation APIs (§8.1), LLM API for the tutor (§8.2), payments (Stripe-class) + voucher/scholarship bookkeeping, email/push notifications.
- **Ops:** preview deploys per change; error monitoring; uptime target 99.9% during school hours; all child-facing strings localizable (EN now, RU/HE UI later).

## 12. Engineering Quality Gates
1. **Content buffer** (§7.3) enforced by a dashboard warning at <4 weeks.
2. **Tutor rules document** exists and is enforced before any child uses the tutor.
3. **Single progress store** from day one; parent reports generated, never hand-written.
4. **One login** across all school apps; verified with pilot children.
5. **Master-scenario single source** for every lesson; translations derived.
6. **Unit versioning** + change log; no silent edits under in-progress children.
7. **Tutor eval suite** green on every prompt/model change.
8. **E2E test before every launch wave:** registration → real-card payment → lesson → mastery check → parent report → tutor question, in every supported language.
9. **Usage limits & cost counters** on all AI features, per child and per family.

## 13. Build Roadmap
- **Phase 1 — Pilot school (fall 2026):** family accounts + child profiles; My Day + schedule engine (one cohort); lesson player with word-tap, quiz, sugya map, mastery gates; interactive siddur v1; live rooms (tefilla, shiur, chavrusa); tickets v1 + first live raffle; progress + auto parent report; guide character; 2 kodesh subjects fully in-player, rest via live classes; 1 adaptive math platform integrated; 3–5 volunteer families from the Rav's community. *Accept:* a real child completes a full school day end-to-end; gates 2, 3, 4, 8 pass.
- **Phase 2 — Depth (winter–spring 2027):** realtime voice-model integration for the Rebbe (conversation, not only narration); diagnostic + weekly replan engine + staff console flags; "Bring it to life" with live generation + moderation; recess catalog; store fulfillment; content studio with review workflow + versioning; AI tutor beta behind evals; second kodesh subject wave; reading platform integrated. *Accept:* all §12 gates green; 20+ families in daily use.
- **Phase 3 — School wave (Elul 2027):** first 2–3 Chabad House micro-campuses onboarded (§15); enrollment funnel + payments/vouchers/scholarships; city-hub management; multiple cohorts/time zones; girls' cohorts prep; RU/HE UI groundwork. *Accept:* E2E gate 8 in production; first full grade-band running.

## 14. Economics Snapshot (context for builders)
Tuition target $3,000–4,500/year (inside Florida PEP-class voucher amounts, ~⅕–⅓ of physical day school; anchors: Nigri ~$4.6k, AFA $4.9k). Staffing: the Rav (leadership, review, shiurim), 1–2 rebbeim, mashpiim at 1:10–15, small content+engineering team. The margin exists to fund the live fabric (P1) — protect it.

## 15. Chabad House Micro-Campus Network (the growth engine)
There are Chabad Houses in nearly every city on earth — and most have no Jewish school nearby (example: Hollywood, FL — several Chabad Houses, no Jewish day school). The platform turns each one into a **micro-campus**, franchise-style:

- **The offer to a shliach:** a ready school-in-a-box. The platform brings the full program, live rebbeim, personalization and the cohort; the Chabad House brings a room, supervision (often the rebbetzin), warmth, recess and lunch. 6–12 local children learn together on site.
- **What the shliach needs:** iPads/laptops with the school's managed profile (hardware kit list shipped as part of hub onboarding), Wi-Fi, one responsible adult on site.
- **Platform support:** a *hub* entity in the data model (roster, on-site adult role, attendance, hub dashboard), hub events (monthly raffle draw, farbrengens), hub onboarding kit and training, co-branded enrollment page per hub.
- **Economics:** hub revenue share on tuition of its children (exact split TBD with the Rav) — the shliach gains a school and a parnassa line; the network gains rooted, supervised, in-person presence everywhere.
- **Why it wins:** the largest Jewish infrastructure network in the world already exists. This model uses it instead of building against it — and answers the strongest objection to online school ("a child alone at home") with a real room, real friends, and a real adult.

## 16. Open Items Owned by the Rav
Written guidelines document (§P5, §8) · scene-template approvals · siddur scope per grade · store/raffle catalog and competitiveness caps · language of instruction details (Hebrew/Yiddish balance) · girls' program timing.

## Glossary (for builders new to the domain)
chavrusa — study partner/pair · cheder — Jewish primary school · Chumash — Five Books of Moses · davening/tefilla — prayer · derech — approach/way · farbrengen — chassidic gathering · halacha — Jewish law · hagalas keilim — koshering vessels by boiling · kavanah — inner intent in prayer · kriah — Hebrew reading · limudei kodesh — Judaic studies · mashpia — spiritual mentor · melamed — cheder teacher · meforshim — commentators · minhag — custom · Mishna/Gemara — layers of the Talmud · nikud — Hebrew vowel marks · parsha — weekly Torah portion · rebbi — Torah teacher · sefiros — kabbalistic emanations · shiur — Torah class · shluchim — Chabad emissaries · sugya — Talmudic passage/topic · talmid — student · tzedakah — charity.
