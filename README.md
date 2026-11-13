# Keel

Quiet, strong, and about character more than show.

A swipe-to-read PWA: a short daily stack of real, well-sourced reading on family, character, mind, money, the world and more. It has an end, works offline, keeps everything on your device, and makes no AI calls at runtime.

See [CLAUDE.md](CLAUDE.md) for the product spec and content rules.

## Develop

```bash
nvm use        # Node 22
npm ci
npm run dev    # http://localhost:5173 (serves ./content in dev)
npm run validate
npm test
npm run lint
npm run build  # validate + typecheck + vite build + content index
```

Content lives in `content/` as JSON packs (see `schema/content.ts`). Add or edit a pack and `npm run validate`; `index.json` is generated at build time.
