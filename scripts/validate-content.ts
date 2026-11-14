import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PACK_FOLDERS } from "../schema/content";
import {
  validateCurriculum,
  validatePacks,
  validateQueue,
  formatProblem,
  type LoadedPack,
  type Problem,
} from "./validate-lib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "content");

export function loadPacks(): { files: LoadedPack[]; problems: Problem[] } {
  const files: LoadedPack[] = [];
  const problems: Problem[] = [];
  for (const folder of Object.values(PACK_FOLDERS)) {
    const dir = join(root, folder);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
      const file = `${folder}/${name}`;
      try {
        files.push({ file, folder, raw: JSON.parse(readFileSync(join(dir, name), "utf8")) });
      } catch (e) {
        problems.push({ file, rule: `invalid JSON: ${(e as Error).message}` });
      }
    }
  }
  return { files, problems };
}

function main() {
  const { files, problems } = loadPacks();
  const result = validatePacks(files);
  problems.push(...result.problems);

  const queuePath = join(root, "queue.json");
  if (existsSync(queuePath)) {
    try {
      problems.push(
        ...validateQueue(
          JSON.parse(readFileSync(queuePath, "utf8")),
          new Set(result.packs.map((p) => p.id)),
        ),
      );
    } catch (e) {
      problems.push({ file: "queue.json", rule: `invalid JSON: ${(e as Error).message}` });
    }
  }

  const curriculumPath = join(root, "mentor-curriculum.json");
  if (existsSync(curriculumPath)) {
    try {
      problems.push(
        ...validateCurriculum(JSON.parse(readFileSync(curriculumPath, "utf8")), result.packs),
      );
    } catch (e) {
      problems.push({
        file: "mentor-curriculum.json",
        rule: `invalid JSON: ${(e as Error).message}`,
      });
    }
  }

  if (problems.length) {
    console.error(
      `Content validation failed (${problems.length} problem${problems.length > 1 ? "s" : ""}):`,
    );
    for (const p of problems) console.error(`  ✗ ${formatProblem(p)}`);
    process.exit(1);
  }
  console.log(
    `Content OK: ${result.packs.length} pack(s), ${result.packs.reduce((n, p) => n + p.cards.length, 0)} card(s).`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
