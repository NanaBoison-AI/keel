import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPacks } from "./validate-content";
import { Pack, PACK_FOLDERS, type ContentIndex } from "../schema/content";

const base = join(dirname(fileURLToPath(import.meta.url)), "..");
const { files } = loadPacks();
const out = join(base, "dist", "content");
mkdirSync(out, { recursive: true });

const packs: ContentIndex["packs"] = [];
for (const f of files) {
  const pack = Pack.parse(f.raw);
  const dest = join(out, f.folder);
  mkdirSync(dest, { recursive: true });
  cpSync(join(base, "content", f.file), join(dest, `${pack.id}.json`));
  packs.push({
    id: pack.id,
    type: pack.type,
    title: pack.title,
    author: pack.author,
    pillar: pack.pillar,
    version: pack.version,
    path: `/content/${PACK_FOLDERS[pack.type]}/${pack.id}.json`,
    cardCount: pack.cards.length,
    estMinutes: pack.estMinutes,
    expiresAt: pack.expiresAt,
  });
}
const index: ContentIndex = { generatedAt: new Date().toISOString(), packs };
writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 2));
console.log(`Index written: ${packs.length} pack(s).`);
