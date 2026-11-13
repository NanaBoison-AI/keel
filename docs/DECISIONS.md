# Decisions

Short log of non-obvious decisions.

- **Tailwind v3** chosen over v4 for stable PostCSS/config-based setup.
- **Routing:** hash routing (`createHashRouter`) so offline/PWA works without server config; `_redirects` still added for Cloudflare.
- **`tsx` as dev dependency** to run validator/index scripts.
- **Meditations quotes** were checked verbatim against the Project Gutenberg text of George Long's 1862 translation (ebook #15877). Gutenberg #2680 is the 1634 Casaubon translation and must not be used.
- **Meditations `year`** is set to 180 (year of Marcus's death); the work has no publication date.
- **Standalone seed cards** contain no direct quotes; refs cite book/chapter only where confident, otherwise the Part or principle name.
