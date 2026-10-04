import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
      ),
    )
  ).flat();
}
const files = await walk("dist");
const assets = await Promise.all(
  files
    .filter((f) =>
      /^(assets\/|models\/|data\/|icons\/|index.html$|manifest.webmanifest$)/.test(
        relative("dist", f),
      ),
    )
    .map(async (f) => {
      const b = await readFile(f);
      return {
        path: "/" + relative("dist", f),
        bytes: b.length,
        sha256: createHash("sha256").update(b).digest("hex"),
      };
    }),
);
await writeFile(
  "dist/offline-assets.json",
  JSON.stringify({ version: "app-1", assets }, null, 2),
);
