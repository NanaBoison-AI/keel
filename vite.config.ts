/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
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
  plugins: [
    react(),
    devContent(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Keel",
        short_name: "Keel",
        description: "Short, real, well-sourced reading on what makes a man.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f6f1e7",
        theme_color: "#0e1b2c",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/content\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/content/index.json",
            handler: "NetworkFirst",
            options: { cacheName: "keel-index", networkTimeoutSeconds: 3 },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/content/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "keel-content" },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
  },
});
