# Online Cheder — agent handbook

**Read this file first.** It is the entry point for any agent (Claude Code, Codex, Cursor, or a human developer) taking over this project. Everything needed to continue is in this repository — no external context required.

Owner: **Siman Tov** (levanbaazov@gmail.com). Writes in Russian, so answer him in Russian; the codebase, UI and docs are English.
Spiritual authority: **Rabbi Adi Khanukaev** (Chabad). Home base: **Miami, Florida**; first in-person hub: Chabad House, Hollywood FL.

---

## 1. What this project is

An online cheder — a full Jewish primary school delivered online, aiming to be **top-tier, not a budget substitute**. Boys, grades 1–5 at launch. English UI + Hebrew learning content.

Three non-negotiable ideas (the reason the product exists — do not dilute them):

1. **People are the core.** Live tefilla, daily chavrusa, a mashpia per 10–15 children, live shiurim, monthly in-person meetups at local Chabad Houses. A child alone with an iPad is not a cheder. (Research basis: Alpha School's own data — adaptive platforms alone produce ordinary results.)
2. **Every child has a personal program.** Level per subject, mastery gate ≥80% first-try, weekly replan, same-day flag to a human when a child dips.
3. **Everything is alive.** Word-tap Hebrew text, sugya maps, diagram puzzles, "bring it to life" scene generation, and a **speaking animated Rebbe** who guides the child by voice.

Hard rules that come from halacha and the Rav, not from design taste:
- **No AI-generated content reaches a child without human review** (the Rav's standard).
- Generation happens **only inside scene templates the Rav approved**; no depictions of Chazal/gedolim, no free-form illustration of holy texts.
- **Kavanah is never gamified.** Points apply to skills around davening (fluency, word meanings, order) — never to prayer itself.
- **No surveillance of children.** No cameras watching, no monitoring software; oversight comes from mentors and learning data.
- Watch the visual language: a previous door illustration accidentally read as a cross and had to be redrawn. Check every new icon/vignette for unintended religious symbolism.

## 2. Where everything lives

| Path | What |
|---|---|
| `docs/PLATFORM_SPEC.md` | **The build bible** (v1.1). Full target-platform specification — pillars, screens, personalization engine, curriculum, AI subsystems, architecture, quality gates, roadmap, Chabad-House franchise model (§15), glossary of Jewish terms. Build from this. |
| `docs/strategy/` | Business context: concept in Russian (`КОНЦЕПЦИЯ_онлайн-хедер_v0.1.md`), the English concept given to the Rav (`CONCEPT_online-cheder_EN_v0.1.md`), general-studies stack decisions (`СВЕТСКИЙ_СТЕК.md`), decision log & project history (`HANDOFF_контекст_проекта.md`), deferred work (`TODOS.md`). |
| `app/cheder/` | The application. Routes below. |
| `app/cheder/_components/` | `rebbe.tsx` (character + voice provider + artwork), `voice.ts` (speech layer), `rooms.tsx` (campus room data + vignettes), `lesson.tsx` (lesson shell, mastery quiz), `scenes.tsx` (animated "bring it to life" scenes), `state.tsx` (demo state), `shell.tsx` (chrome). |

Routes: `/cheder` (voice onboarding) → `/cheder/school` (campus + guided tour) → `/cheder/room/[id]` (classroom: board, shelf, today's task) · `/cheder/today` (schedule) · `/cheder/lesson/{tefilla,chumash,mishna,math}` · `/cheder/live` (chavrusa) · `/cheder/play` (recess) · `/cheder/create` (scene studio) · `/cheder/store` (tickets/raffle) · `/cheder/progress` (desk + parent view).

## 3. Stack & conventions

Next.js 16 (App Router, all routes static), React 19, Tailwind v4, TypeScript strict. No backend, no database — demo state is in `localStorage` via `useCheder()`. Icons: `lucide-react`. Hebrew dates: `@hebcal/core`.

- Design tokens are in `app/globals.css`: white surface, ink buttons, and per-subject accents (`--ch-blue` Chumash, `--ch-violet` Mishna, `--ch-teal` math, `--ch-amber` tickets, `--ch-rose` live, `--ch-green` success, `--ch-sky` tefilla). **Use the tokens, never raw hex.** The owner explicitly rejected beige/gold "AI-looking" palettes.
- Animations are CSS keyframes in `globals.css` (`cheder-*`, `rb-*`). Keep animation in CSS, not JS loops.
- Hebrew text: always `dir="rtl"`, with nikud, in the Hebrew-capable font stack already configured.
- Every screen should feel like a place in a school, not a form.

Commands: `npm install` · `npm run dev` (localhost:3000 → redirects to `/cheder`) · `npm run typecheck` · `npm run build`.
Before pushing: **typecheck and build must be green**, and the change should be clicked through in a browser.

## 4. Deployment

GitHub `levanbaazov-svg/online-cheder` (branch `main`) → Vercel project **online-cheder** (team `siman-tov-s-projects`, Pro plan, Vercel Agent enabled) → **https://online-cheder.vercel.app**. Every push to `main` auto-deploys.

`vercel.json` pins `"framework": "nextjs"` — **do not delete it**; without it Vercel built the project frameworkless and served 404 on every route.

A mirror of this codebase also lives in `levanbaazov-svg/menora-global` on branch `cheder-standalone` (historical; the strategy docs also live there under `docs/online-school/`). Pushing to `online-cheder:main` is what matters.

## 5. Current state — what is real and what is next

Working today: voice onboarding dialogue, campus of 10 rooms with a spoken guided tour, classrooms with class board and shelf, animated speaking Rebbe (blink, wave, lip-sync) with voice commands, four interactive lessons with mastery gates, chavrusa room, recess catalog, scene studio with three hand-animated approved scenes, tickets/raffle/store, desk dashboard with parent view.

Deliberately simplified for the demo (upgrade paths are in `docs/PLATFORM_SPEC.md`):
- **Voice** uses the browser's `speechSynthesis` (offline, no keys). Production: swap `app/cheder/_components/voice.ts` for a realtime voice model (OpenAI Realtime / Gemini Live). The interface is designed so only that file changes. **Needs an API key from the owner.**
- **"Bring it to life"** scenes are hand-animated SVG; production connects a generation API behind the Rav-approved template mechanism (spec §8.1) with a moderation queue.
- **Live video** rooms are mocked; production uses LiveKit/Daily/Zoom SDK with roster-gated rooms (spec §5.3).
- **State** is `localStorage`; production needs the single progress store (Postgres) + real accounts (spec §11).
- The **guide character** is vector art in `rebbe.tsx`; the owner may supply his own artwork (drop a PNG and swap the `RebbeArt` usage).

Open questions for the owner: realtime-voice API key · his own character artwork · the character's name (currently "Reb Nachum") · exact first hub address.

Priority order suggested by the spec roadmap: real accounts + progress store → live video rooms → realtime voice → generation API with moderation → content studio with Rav review workflow.

## 6. Working agreements

- Ask before changing anything that touches halachic content, the Rav's boundaries, or the three pillars in §1. Everything else: proceed and show the result.
- Keep `docs/strategy/HANDOFF_контекст_проекта.md` updated when a significant decision is made — it is the project's decision log.
- Commit messages in Russian are fine (existing history is Russian); code and comments in English.
- The owner reviews by looking at the deployed site. Push early, push often — that is his feedback loop.
