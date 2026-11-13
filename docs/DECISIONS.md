# Decisions

Short log of non-obvious decisions.

- **Tailwind v3** chosen over v4 for stable PostCSS/config-based setup.
- **Routing:** hash routing (`createHashRouter`) so offline/PWA works without server config; `_redirects` still added for Cloudflare.
- **`tsx` as dev dependency** to run validator/index scripts.
