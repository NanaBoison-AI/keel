# CLAUDE.md — Keel

> **Keel** — the part of a ship that keeps it steady in rough water.
> A swipe-to-read app that replaces doomscrolling with short, real, well-sourced
> reading on what makes a man: family, character, mind, money, the world, and more.

This file is the single source of truth for building and maintaining Keel.
It is read by **Claude Code** (building the app) and by **scheduled Claude tasks**
(generating content). Follow it exactly. If something here is ambiguous, choose the
simplest option that respects the Product Principles, and note the decision in
`docs/DECISIONS.md`.

---

## 1. Product principles (non-negotiable)

1. **Real books, real content.** Every book card summarizes an actual, well-known book.
   No invented quotes, statistics, studies, chapters or anecdotes. If unsure, leave it out.
2. **It has an end.** The daily stack finishes with "You're done for today." No infinite feed.
3. **Never boring, never a chore.** Hooks first, varied formats, no guilt mechanics
   (no punishing streaks, no red badges, no nagging notifications).
4. **Reading only.** No audio. Optimized for one-handed reading on a train or bus.
5. **Offline-first.** Commutes lose signal. Everything already downloaded must work offline.
6. **Private by default.** Personal data stays on the device. No accounts, no analytics,
   no third-party trackers.
7. **No AI at runtime.** The app has no API keys and makes no LLM calls. All content is
   generated ahead of time by scheduled Claude tasks and committed as JSON.

---

## 2. Pillars

Every card belongs to exactly one pillar. IDs are fixed; do not rename them.

| id           | Label                  | Default weight | Covers                                                         |
| ------------ | ---------------------- | -------------: | -------------------------------------------------------------- |
| `family`     | Family & Relationships |             25 | Marriage, fatherhood, friendship, communication, conflict      |
| `mind`       | Mind                   |             10 | Mental models, decision-making, logic, biases                  |
| `psychology` | Psychology             |             10 | Emotions, motivation, behavior, self-understanding             |
| `character`  | Character              |             10 | Discipline, courage, integrity, Stoicism, purpose              |
| `money`      | Money                  |             10 | Personal finance, investing, income                            |
| `world`      | The World              |             10 | Economy, geopolitics, history; weekly briefing                 |
| `work`       | Work & Productivity    |             10 | Focus, career, leadership, negotiation, habits                 |
| `body`       | Body                   |              8 | Strength, sleep, nutrition, energy                             |
| `competence` | Competence             |              7 | Practical skills: home repair, cooking, first aid, car, crisis |

Weights are user-adjustable in Settings (they must always sum to 100; the UI normalizes).

---

## 3. Tech stack

| Concern             | Choice                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Language            | TypeScript (strict)                                                                              |
| Framework           | React 18+ with Vite                                                                              |
| Styling             | Tailwind CSS                                                                                     |
| Gestures / motion   | `motion` (Framer Motion) + `@use-gesture/react`                                                  |
| Routing             | `react-router` (hash or browser routing; Cloudflare Pages SPA fallback)                          |
| Local data          | IndexedDB via `dexie` (+ `dexie-react-hooks`)                                                    |
| PWA / offline       | `vite-plugin-pwa` (Workbox)                                                                      |
| Schema / validation | `zod`                                                                                            |
| Fonts               | Self-hosted via `@fontsource` — body serif: **Literata** (or Source Serif 4); UI sans: **Inter** |
| Tests               | `vitest` + `@testing-library/react`                                                              |
| Lint / format       | ESLint + Prettier                                                                                |
| Hosting             | Cloudflare Pages (auto-deploy on push to `main`)                                                 |
| CI                  | GitHub Actions (validate + test + build on every push and PR)                                    |

Node version: 22 (pin in `.nvmrc` and `package.json` `engines`).

No backend. No database server. No environment secrets.

---

## 4. Repository layout

```
/
├── CLAUDE.md                 ← this file
├── docs/
│   └── DECISIONS.md          ← short log of non-obvious decisions
├── content/                  ← ALL app content (written mostly by scheduled tasks)
│   ├── books/                ← one JSON pack per book, e.g. meditations.json
│   ├── briefings/            ← weekly briefings, e.g. 2026-w46.json
│   ├── series/               ← multi-card themed series, e.g. better-listener.json
│   ├── standalone/           ← loose cards grouped by pillar, e.g. family.json
│   └── queue.json            ← books waiting to be generated (NOT shipped to the app)
├── schema/
│   └── content.ts            ← zod schemas (single source of truth for content shape)
├── scripts/
│   ├── validate-content.ts   ← validates every pack + cross-file rules
│   └── build-index.ts        ← generates dist content + index.json at build time
├── public/                   ← icons, manifest assets
├── src/
│   ├── app/                  ← routes/screens
│   ├── components/           ← Card, CardStack, TabBar, PillarChip, ...
│   ├── lib/
│   │   ├── content.ts        ← fetching/caching packs, index handling
│   │   ├── db.ts             ← Dexie schema
│   │   ├── mix.ts            ← daily mix algorithm (pure, unit-tested)
│   │   └── backup.ts         ← export/import personal data
│   └── styles/
├── .github/workflows/ci.yml
└── package.json
```

### npm scripts (must exist)

| Script        | Does                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `dev`         | Vite dev server                                                                                     |
| `validate`    | `tsx scripts/validate-content.ts` — exits non-zero on any error                                     |
| `build:index` | `tsx scripts/build-index.ts` — copies packs to `dist/content/` and writes `dist/content/index.json` |
| `build`       | `npm run validate && vite build && npm run build:index`                                             |
| `test`        | vitest run                                                                                          |
| `lint`        | eslint                                                                                              |

**Important:** `index.json` is **generated at build time**, never hand-written and never
committed. Scheduled tasks only add or edit pack files. This removes a whole class of errors.

---

## 5. Content schema

Define these in `schema/content.ts` with zod and export the inferred TS types.
The app, the validator and the scheduled tasks all use this shape.

```ts
const PillarId = z.enum([
  "family",
  "mind",
  "psychology",
  "character",
  "money",
  "world",
  "work",
  "body",
  "competence",
]);

const CardFormat = z.enum([
  "hook", // opening card of a deck: why this matters
  "idea", // one core idea, explained
  "story", // a story / example / historical anecdote from the source
  "quote", // a quote (public-domain sources freely; modern sources: rules in §9)
  "fact", // a surprising, sourced fact
  "challenge", // "try this today" — a small concrete action
  "conversation", // a question to ask your partner / kids / friend
  "reflection", // a question to think about
  "howto", // practical steps (mostly the competence pillar)
  "recap", // closing card: the 3 things to remember
]);

const Card = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), // `${packId}-${nn}`, permanent, never reused
  pillar: PillarId,
  format: CardFormat,
  hook: z.string().min(10).max(140), // the first line the reader sees
  body: z.string().min(20).max(900), // ~40–140 words; light markdown: **bold**, *italic*, lists
  deeper: z.string().max(2200).optional(), // revealed on tap; ~100–350 words
  quote: z
    .object({
      text: z.string().max(400),
      attribution: z.string(), // e.g. "Marcus Aurelius, Meditations 2.1 (trans. George Long)"
    })
    .optional(),
  source: z
    .object({
      ref: z.string().optional(), // e.g. "Book 2, §1" or "Ch. 3: The Four Horsemen"
      url: z.string().url().optional(), // required for briefing cards
    })
    .optional(),
  mixable: z.boolean().default(true), // may appear in the daily mix outside its deck
  version: z.number().int().min(1).default(1),
});

const Pack = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/), // must equal the filename without .json
  type: z.enum(["book", "briefing", "series", "standalone"]),
  title: z.string(),
  author: z.string().optional(), // required for books
  year: z.number().int().optional(), // original publication year (books)
  pillar: PillarId, // primary pillar of the pack
  publicDomain: z.boolean().default(false),
  translation: z.string().optional(), // e.g. "George Long (1862)" for public-domain translations
  summary: z.string().max(200), // one line shown in Library
  estMinutes: z.number().int().min(1), // ~ cards × 0.75
  version: z.number().int().min(1), // bump on ANY change to the pack
  createdAt: z.string(), // ISO date
  updatedAt: z.string(), // ISO date
  expiresAt: z.string().optional(), // briefings only: createdAt + 21 days
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })).optional(), // briefings
  cards: z.array(Card).min(1),
});
```

### Cross-file rules enforced by `validate-content.ts`

- Filename (without `.json`) equals `pack.id`; pack is in the folder matching its `type`.
- Every card id is unique across **all** packs and starts with `${pack.id}-`.
- Books: `author` and `year` required; 10–20 cards; first card `format: "hook"`,
  last card `format: "recap"`; `hook` and `recap` cards have `mixable: false`.
- Briefings: `expiresAt` required; every card has `source.url`; `sources` non-empty;
  id format `YYYY-wNN`.
- Standalone packs: `pillar` matches every card's pillar.
- Card `quote` on a pack with `publicDomain: false` → `quote.text` must be ≤ 15 words,
  and at most **one** quote card per pack (see §9).
- No duplicate `hook` text across all packs.
- `queue.json` validates against its own schema (below) and every `done` entry has a pack file.
- Fail with a clear, human-readable message naming file, card id and rule.

### `content/queue.json`

```ts
const QueueItem = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), // becomes the pack id / filename
  title: z.string(),
  author: z.string(),
  year: z.number().int(),
  pillar: PillarId,
  publicDomain: z.boolean(),
  translation: z.string().optional(),
  status: z.enum(["queued", "in_progress", "done", "skipped"]),
  note: z.string().optional(), // e.g. why skipped
});
const Queue = z.array(QueueItem); // processed top to bottom
```

---

## 6. The app

### Screens (bottom tab bar, 4 tabs + settings in header)

1. **Today** — the daily stack (Quick mode).
   - 12 cards by default (user setting 8–15), built by the mix algorithm (§7).
   - Progress dots at top. Final screen: **"You're done for today."** with options:
     "Start a Journey" and "See what you saved". No auto-refill.
   - The stack is deterministic for the day: reopening the app shows the same stack
     and resumes position.
2. **Journey** — for long sessions (commutes).
   - **Continue** the current deck (resume at last card).
   - **This week** — latest non-expired briefing, if any.
   - **Up Next** — 3 suggested unstarted decks, ranked by pillar weight × affinity,
     favoring pillars underrepresented in recent reading.
   - In-deck view: same card UI, "Card 7 of 16", finish screen with recap and "Next deck".
3. **Library** — browse all packs, grouped/filterable by pillar and type.
   Show title, author, year, minutes, progress bar, "Public domain" badge where true.
4. **Notebook** — saved cards, grouped by pack, filterable by pillar. Saved cards store a
   **snapshot** of the card text, so they survive briefing expiry or pack edits.
5. **Settings** — pillar weights (sliders, auto-normalized to 100), daily stack size,
   text size (4 steps), theme (system / light / dark), reset "less like this" signals,
   **Backup** (export JSON file) and **Restore** (import JSON file), About.

### Card interaction

| Gesture    | Action                                                                 | Visible button equivalent |
| ---------- | ---------------------------------------------------------------------- | ------------------------- |
| Swipe up   | Next card                                                              | ↓ arrow                   |
| Swipe down | Previous card                                                          | —                         |
| Tap card   | Expand/collapse `deeper` (if present)                                  | "Read more"               |
| Double-tap | Save to Notebook (brief bookmark animation)                            | Bookmark icon             |
| Swipe left | "Less like this" (records feedback, advances, shows Undo toast for 4s) | ⋯ menu                    |

- Every gesture must have a visible button alternative (accessibility).
- Card footer shows: pillar chip, pack title (tappable → opens deck), and `source.ref`.
- Daily-mix cards from a book show "From _Deep Work_ → Continue the book".
- Respect `prefers-reduced-motion` (crossfade instead of slide).

### Reading experience (this is the product — get it right)

- Body text: serif, ~18–20px base, line-height ~1.6, max ~38em measure, generous padding.
- Hook in larger, bolder type at the top of the card.
- Card fits on one screen; `deeper` scrolls inside the card.
- Dark mode is first-class (early mornings on trains), not an afterthought.
- One-handed: primary controls in the bottom third of the screen.

### Visual identity

- Calm, nautical, understated. Palette: deep ink navy, warm off-white "paper",
  one accent (brass/amber). Each pillar gets a muted chip color; never loud.
- App icon: a simple, original abstract keel/hull mark (draw an SVG; no stock icons).
- No emojis in UI chrome.

### Mobile-native polish (required)

- `viewport-fit=cover`, honor safe-area insets (notch, home indicator).
- Use `100dvh`, not `100vh`.
- `overscroll-behavior: none` on the card stack (no pull-to-refresh hijack).
- `-webkit-tap-highlight-color: transparent`; `user-select: none` on controls only
  (body text stays selectable).
- Inputs ≥16px font (no iOS zoom). No hover-only affordances.
- `theme-color` meta matches the current theme.

---

## 7. Daily mix algorithm (`src/lib/mix.ts`)

Pure function, fully unit-tested:

```ts
buildDailyStack({ date, packs, weights, affinity, seen, size }): CardRef[]
```

1. **Seeded RNG** from the date string (`YYYY-MM-DD`) so the stack is stable for the day.
2. **Candidate pool:** all cards with `mixable: true` from non-expired packs, excluding
   cards seen in the last 90 days and cards with "less like this" feedback.
   The latest briefing contributes at most 2 cards per day.
3. **Effective weight per pillar** = user weight × affinity, where affinity is in
   **[0.7, 1.3]** (clamped, so balance is preserved). Affinity rises with saves/expands
   and falls with "less like this"; decays slowly toward 1.0 over ~30 days.
4. **Allocate slots** to pillars by largest-remainder method on effective weights.
   Family always gets ≥ 1 slot when it has candidates.
5. **Pick cards** within each pillar randomly (seeded), preferring formats not yet used today.
6. **Order:** no two consecutive cards from the same pillar or same format where avoidable;
   start with an `idea`, `story` or `fact`; end with a `challenge`, `conversation` or `reflection`.
7. If a pillar has no candidates, redistribute its slots to the others.
8. If the total pool is smaller than `size`, return what exists (the "done" screen still shows).

---

## 8. Data, offline and updates

### Content delivery

- Build step copies all packs (except `queue.json`) to `dist/content/...` and writes
  `dist/content/index.json`:
  `{ generatedAt, packs: [{ id, type, title, author, pillar, version, path, cardCount, estMinutes, expiresAt? }] }`.
- On app launch (and when returning to foreground, at most every 30 min):
  fetch `index.json` (network-first, fall back to cache), then download any pack whose
  `version` is newer than the cached one. Packs are small; download all of them.
- Workbox: precache the app shell; runtime-cache `/content/**` with
  StaleWhileRevalidate; keep `index.json` NetworkFirst with a 3s timeout.
- Store downloaded packs in IndexedDB too (source of truth for reading offline).
- Show a subtle "Updated: 2 new decks" toast when new content arrives. No modal.
- Removed packs: keep the user's progress and Notebook snapshots; hide the pack.

### Personal data (Dexie, `src/lib/db.ts`)

```
packs     : id, version, json                    (cached content)
progress  : packId, cardIndex, startedAt, completedAt?
seen      : cardId, seenAt
saves     : cardId, packId, savedAt, snapshot (hook, body, deeper, quote, source, packTitle, pillar)
feedback  : cardId, pillar, signal ("less" | "expand" | "save"), at
daily     : date, cardIds[], position
settings  : key, value
```

- **Backup:** export all personal tables (not `packs`) as `keel-backup-YYYY-MM-DD.json`.
- **Restore:** validate with zod, then replace. Confirm before overwriting.
- Request `navigator.storage.persist()` on first run.

---

## 9. Content rules (for scheduled tasks and any content edits)

### Accuracy

- Only widely read, well-documented books. Cover the **core arguments, frameworks and
  stories** of the book — not page-level trivia.
- **Never invent** quotes, numbers, studies, names, chapter titles or anecdotes.
  If you are not confident a detail is in the book, leave it out.
- `source.ref` must point to a real part of the book (book/chapter/section). If unsure of
  the exact chapter, use a broader ref (e.g. "Part II") rather than guessing.
- **Verification pass (mandatory):** after drafting a pack, re-read every card as a skeptical
  editor and check each claim against what is reliably known about the source (search the
  web for confirmation where useful). Delete or soften anything that cannot be backed up.
- Briefings: only facts from sources fetched that week; every card has `source.url`.
  Present contested topics neutrally. No predictions stated as fact, no investment advice.

### Copyright

- **Public-domain works** (published before 1929 in the US, or public-domain translations
  such as George Long's 1862 _Meditations_): quotes from the public-domain text are fine.
  Set `publicDomain: true` and `translation` where relevant. Never quote a modern,
  copyrighted translation (e.g. do not use Gregory Hays' _Meditations_).
- **Modern books:** explain ideas **in your own words**. At most **one** direct quote per
  pack, **under 15 words**. Do not mirror the book's sentences or reproduce its
  passages. Summaries of ideas, frameworks and stories in original wording are fine.
- Briefings: paraphrase news; never copy article text. At most one quote per source,
  under 15 words.

### Voice and craft

- **Every card opens with a hook** — tension, surprise, or a question. Not a title.
  Bad: "Gottman's Four Horsemen." Good: "Couples who divorce don't argue more. They argue _differently_."
- Plain, direct, warm. Talk to a capable adult man; no lecturing, no hustle-bro tone,
  no clichés ("in today's fast-paced world").
- One idea per card. Short paragraphs. `body` ~40–140 words; `deeper` for the rest.
- Make it usable: books should include at least one `challenge` and, for family /
  relationship books, at least one `conversation` card.

### Book deck structure (10–20 cards)

1. `hook` — why this book matters to you, in 2–3 sentences (`mixable: false`)
2. 6–14 × `idea` / `story` / `quote` / `fact` — the core ideas in the book's order
3. 1–2 × `challenge` / `conversation` / `reflection` — apply it
4. `recap` — the 3 things to remember (`mixable: false`)

### Weekly briefing structure (15–25 cards)

- Card 1 `hook`: "The week in 60 seconds" — 3–5 headline bullets.
- Sections: global economy & markets, central banks/rates/inflation, geopolitics,
  business & technology, one "why it matters to your money" card, one
  history/context card that explains a story from the week.
- Final card `recap`: 3 things to watch next week.
- `pillar: "world"` for most cards; the money-impact card may be `pillar: "money"`.

---

## 10. Content pipeline (how scheduled tasks use this repo)

Scheduled Claude tasks clone this repo, read this file, and do one job per run.

**Library builder (2–3× per week)**

1. Pick the first `queued` item in `content/queue.json`; set it to `in_progress`.
2. Write `content/books/<id>.json` per §5 and §9. Run the verification pass.
3. Set the queue item to `done`. Run `npm ci && npm run validate`. Fix until it passes.
4. Branch `content/book-<id>`, commit `content: add book <title>`, push, open a PR
   titled `Book: <title> — <author>` with a short summary of the deck in the description.

**Weekly briefing (Sunday evening UTC)**

1. Research the past 7 days' economy and world news from reputable sources.
2. Write `content/briefings/<YYYY-wNN>.json` (ISO week). Verification pass.
3. `npm ci && npm run validate`. Commit `content: briefing <YYYY-wNN>` and push directly
   to `main` (so it deploys for Monday).

**Rules for tasks:** never modify app code, schemas or workflows; only `content/`.
If validation can't be made to pass, open a PR (or issue) describing the problem instead
of pushing broken content. Never delete existing packs.

---

## 11. CI and deployment

- `.github/workflows/ci.yml`: on push and PR → `npm ci`, `npm run lint`, `npm test`,
  `npm run build`.
- **Cloudflare Pages settings:** framework preset _None_ (or Vite), build command
  `npm run build`, output directory `dist`, env `NODE_VERSION=22`.
  Production branch `main`; PRs get preview deployments (useful for reviewing new books).
- Add `public/_redirects` with `/* /index.html 200` for SPA routing.
- A failed validation fails the build, so Cloudflare keeps serving the previous version.

---

## 12. Seed content (build with the app)

1. **`content/books/meditations.json`** — Marcus Aurelius, _Meditations_,
   `publicDomain: true`, `translation: "George Long (1862)"`, pillar `character`,
   16–18 cards following §9. Quotes must come from the Long translation.
2. **`content/standalone/<pillar>.json`** for all 9 pillars — 4–6 cards each, every
   card grounded in a real book from the queue below (put the book and chapter in
   `source.ref`, e.g. "Gottman, _The Seven Principles…_, Ch. 2"). Competence cards
   may be `howto` cards based on widely established practice (first aid basics
   following Red Cross guidance, etc.).
3. **No seeded briefing.** Do not invent news. The Journey screen shows a friendly empty
   state ("Your first weekly briefing arrives Sunday evening.").
4. **`content/queue.json`** pre-filled in this order (all `queued` except Meditations `done`):

| id                              | Title                                                      | Author                                | Year | Pillar     | PD                                         |
| ------------------------------- | ---------------------------------------------------------- | ------------------------------------- | ---- | ---------- | ------------------------------------------ |
| seven-principles-marriage       | The Seven Principles for Making Marriage Work              | John Gottman & Nan Silver             | 1999 | family     | no                                         |
| how-to-talk-so-kids-will-listen | How to Talk So Kids Will Listen & Listen So Kids Will Talk | Adele Faber & Elaine Mazlish          | 1980 | family     | no                                         |
| mans-search-for-meaning         | Man's Search for Meaning                                   | Viktor Frankl                         | 1946 | psychology | no                                         |
| psychology-of-money             | The Psychology of Money                                    | Morgan Housel                         | 2020 | money      | no                                         |
| thinking-fast-and-slow          | Thinking, Fast and Slow                                    | Daniel Kahneman                       | 2011 | mind       | no                                         |
| letters-from-a-stoic            | Letters from a Stoic (Moral Letters to Lucilius)           | Seneca                                | 65   | character  | yes (Richard Mott Gummere trans., 1917–25) |
| whole-brain-child               | The Whole-Brain Child                                      | Daniel Siegel & Tina Payne Bryson     | 2011 | family     | no                                         |
| deep-work                       | Deep Work                                                  | Cal Newport                           | 2016 | work       | no                                         |
| richest-man-in-babylon          | The Richest Man in Babylon                                 | George S. Clason                      | 1926 | money      | yes                                        |
| nonviolent-communication        | Nonviolent Communication                                   | Marshall Rosenberg                    | 1999 | family     | no                                         |
| as-a-man-thinketh               | As a Man Thinketh                                          | James Allen                           | 1903 | character  | yes                                        |
| influence                       | Influence: The Psychology of Persuasion                    | Robert Cialdini                       | 1984 | mind       | no                                         |
| how-to-win-friends              | How to Win Friends and Influence People                    | Dale Carnegie                         | 1936 | family     | no                                         |
| atomic-habits                   | Atomic Habits                                              | James Clear                           | 2018 | work       | no                                         |
| outlive                         | Outlive                                                    | Peter Attia                           | 2023 | body       | no                                         |
| courage-to-be-disliked          | The Courage to Be Disliked                                 | Ichiro Kishimi & Fumitake Koga        | 2013 | psychology | no                                         |
| extreme-ownership               | Extreme Ownership                                          | Jocko Willink & Leif Babin            | 2015 | character  | no                                         |
| intelligent-investor            | The Intelligent Investor                                   | Benjamin Graham                       | 1949 | money      | no                                         |
| never-split-the-difference      | Never Split the Difference                                 | Chris Voss                            | 2016 | work       | no                                         |
| wealth-of-nations               | The Wealth of Nations                                      | Adam Smith                            | 1776 | world      | yes                                        |
| effective-executive             | The Effective Executive                                    | Peter Drucker                         | 1967 | work       | no                                         |
| poor-charlies-almanack          | Poor Charlie's Almanack                                    | Charles T. Munger (ed. Peter Kaufman) | 2005 | mind       | no                                         |
| guns-germs-and-steel            | Guns, Germs, and Steel                                     | Jared Diamond                         | 1997 | world      | no                                         |
| spark                           | Spark                                                      | John Ratey                            | 2008 | body       | no                                         |
| salt-fat-acid-heat              | Salt, Fat, Acid, Heat                                      | Samin Nosrat                          | 2017 | competence | no                                         |
| enchiridion                     | Enchiridion                                                | Epictetus                             | 125  | character  | yes (Elizabeth Carter trans., 1758)        |
| art-of-war                      | The Art of War                                             | Sun Tzu                               | -500 | mind       | yes (Lionel Giles trans., 1910)            |
| autobiography-of-franklin       | The Autobiography of Benjamin Franklin                     | Benjamin Franklin                     | 1791 | character  | yes                                        |

---

## 13. Build milestones (do them in order; each ends green: lint + test + build)

1. **Scaffold** — Vite + React + TS + Tailwind + ESLint/Prettier + Vitest, `.nvmrc`,
   CI workflow, `_redirects`, `docs/DECISIONS.md`.
2. **Schema + validator + index builder** — `schema/content.ts`, `scripts/*`, tests for
   every cross-file rule (include failing fixtures).
3. **Seed content** — Meditations, standalone cards for all pillars, queue (§12).
4. **Card + stack UI** — reading-quality card, gestures with button equivalents,
   expand, save, less-like-this with undo, reduced motion.
5. **Local data** — Dexie schema, progress, seen, saves with snapshots, feedback, settings.
6. **Today** — mix algorithm (unit-tested: determinism, weights, constraints, empty pools),
   daily stack, "done for today" screen.
7. **Journey + Library + Notebook + Settings** — including weights UI, backup/restore.
8. **PWA + offline** — manifest, icons, service worker, content sync, update toast,
   persistent storage. Verify in airplane mode after first load.
9. **Polish pass** — safe areas, dark mode, typography, empty states, Lighthouse PWA and
   accessibility ≥ 90, test on a real phone (iOS Safari + Android Chrome).

## 14. Definition of done

- Installs to the home screen on iOS and Android and opens full-screen.
- Works fully offline after the first load.
- A new JSON pack pushed to `main` appears in the app after the next deploy without
  any code change.
- Invalid content fails CI and the Cloudflare build, never reaching users.
- No network requests except to the app's own origin.
