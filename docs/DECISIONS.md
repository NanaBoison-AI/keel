# Decisions

Short log of non-obvious decisions.

- **Tailwind v3** chosen over v4 for stable PostCSS/config-based setup.
- **Routing:** hash routing (`createHashRouter`) so offline/PWA works without server config; `_redirects` still added for Cloudflare.
- **`tsx` as dev dependency** to run validator/index scripts.
- **Meditations quotes** were checked verbatim against the Project Gutenberg text of George Long's 1862 translation (ebook #15877). Gutenberg #2680 is the 1634 Casaubon translation and must not be used.
- **Meditations `year`** is set to 180 (year of Marcus's death); the work has no publication date.
- **Standalone seed cards** contain no direct quotes; refs cite book/chapter only where confident, otherwise the Part or principle name.
- **Swipe vs. scrolling:** when a card's text overflows, vertical swipes scroll it natively (a fade hints at more text). A swipe that _starts_ with the text already at its top/bottom edge chains to previous/next card; otherwise the ↑/↓ buttons do it. When the card fits, `@use-gesture` handles all directions. Left swipe works in both cases.
- **Tap handling:** single tap expands (`deeper`), double tap saves. The single tap waits 260 ms to rule out a double tap. Controls marked `data-nogesture` bypass use-gesture's click suppression.
- **Pillar weights** are stored as independent values (0–100, step 5) set with − / + steppers; changing one never touches the others. Sliders were dropped because they changed by accident while scrolling. The mix algorithm only uses relative weights, and Settings shows each pillar's derived share of the stack (`normalizeWeights`, so the shown shares always sum to 100). "Cards per day" uses a stepper for the same reason.
- **Daily stack** is persisted in the `daily` table on first open of the day, so later syncs or setting changes never reshuffle it. Cards are marked `seen` when displayed; the 90-day window is applied when the next day's stack is built.
- **Progress** has an optional `updatedAt` (not in the original spec) so "Continue" can pick the most recently read deck.
- **Removed packs:** a successful sync deletes cached packs no longer in `index.json`; progress and Notebook snapshots remain.
- **Dev server** serves `/content/*` from `./content` through a small Vite middleware (the production build does this in `build:index`).
- **Icons** are drawn as SVG (`public/icon.svg`) and rasterised to PNG with Chromium (192, 512, maskable 512, apple-touch 180).
- **Standalone pack titles** read "<Pillar>: Quick Reads" so the Library and card footers are unambiguous.
- **Audit (local, mobile):** Lighthouse accessibility 100 / best-practices 100; axe (WCAG A/AA) clean on all screens in light and dark. Offline verified with Chromium: after the first online load, Today, Library and decks render with the network disabled. Still to do: real-device check on iOS Safari and Android Chrome.
