import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const MEDIA_EXTENSIONS = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".ico", ".mov", ".mp4", ".webm"]);

export function createStaticAssetVersions(publicDirectory) {
  const versions = {};
  function visit(directory, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(directory, entry.name);
      const pathname = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        visit(file, pathname);
      } else if (entry.isFile() && MEDIA_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        versions[pathname] = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 20);
      }
    }
  }
  visit(publicDirectory);
  return versions;
}

export function createStaticAssetHeaders(versions, development = false) {
  // Only a URL with the current content hash may receive immutable caching.
  return Object.entries(versions).flatMap(([pathname, version]) => [
    {
      source: pathname,
      headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
    },
    {
      source: pathname,
      has: [{ type: "query", key: "v", value: version }],
      headers: [{
        key: "Cache-Control",
        value: development ? "public, max-age=0, must-revalidate" : "public, max-age=31536000, immutable",
      }],
    },
  ]);
}
