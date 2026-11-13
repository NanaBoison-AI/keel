/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { loadPacks } from "./scripts/validate-content";
import { Pack, PACK_FOLDERS, type ContentIndex } from "./schema/content";

/** In dev, serve /content/index.json and packs straight from ./content (build does this in build:index). */
function devContent(): Plugin {
  return {
    name: "keel-dev-content",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (!url.startsWith("/content/")) return next();
        const { files } = loadPacks();
        res.setHeader("content-type", "application/json");
        if (url === "/content/index.json") {
          const packs = files.map((f) => {
            const p = Pack.parse(f.raw);
            return {
              id: p.id,
              type: p.type,
              title: p.title,
              author: p.author,
              pillar: p.pillar,
              version: p.version,
              path: `/content/${PACK_FOLDERS[p.type]}/${p.id}.json`,
              cardCount: p.cards.length,
              estMinutes: p.estMinutes,
              expiresAt: p.expiresAt,
            };
          });
          const index: ContentIndex = { generatedAt: new Date().toISOString(), packs };
          res.end(JSON.stringify(index));
          return;
        }
        const rel = url.replace("/content/", "");
        if (/^[a-z]+\/[a-z0-9-]+\.json$/.test(rel)) {
          try {
            res.end(readFileSync(join(__dirname, "content", rel)));
            return;
          } catch {
            /* fall through */
          }
        }
        res.statusCode = 404;
        res.end("{}");
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devContent()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
  },
});
