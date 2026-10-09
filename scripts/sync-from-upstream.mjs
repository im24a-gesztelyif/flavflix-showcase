import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

function git(cwd, args, allowFailure = false) {
  const result = spawnSync("git", args, { cwd, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0 && !allowFailure) throw new Error(`Git operation failed: ${args[0]}`);
  return result;
}

const text = (buffer) => buffer.toString("utf8").replace(/\r\n/g, "\n");
const same = (a, b) => a === null || b === null ? a === b :
  a.includes(0) || b.includes(0) ? a.equals(b) : text(a) === text(b);

export function classifyPath(path) {
  if (path.startsWith("/") || path.split("/").some((part) => part === ".." || !part)) return "review";
  // Private-only features and documentation never belong in the showcase.
  if (/^(\.github\/|\.env|README|docs\/|Documentation\/|AI\/|\.agents\/)/i.test(path)) return "ignore";
  if (/^(src\/middleware\.|src\/lib\/(supabase\/|signup-allowlist\.)|src\/app\/(auth\/|api\/(auth|account)\/)|src\/components\/screens\/auth-screen\.)/.test(path)) return "ignore";
  if (/^src\/lib\/(app-state|account-store)\./.test(path)) return "review";
  if (/^(src\/|public\/)/.test(path) && /(?:auth|supabase|credentials|secrets|\.env|\.pem|\.key)/i.test(path)) return "review";
  if (/^src\/.*\.(js|jsx|ts|tsx|css|json)$/.test(path)) return "sync";
  if (/^public\/.*\.(png|jpe?g|webp|avif|gif|ico|svg|mov|mp4|webm|woff2?)$/i.test(path)) return "sync";
  if (/^(next\.config\.mjs|scripts\/static-asset-cache\.mjs|tests\/(introdb|skipdb|series-resume)\.test\.mjs)$/.test(path)) return "sync";
  if (path === "package.json" || path === "package-lock.json") return "dependencies";
  if (/^(src\/|public\/|scripts\/|tests\/)/.test(path)) return "review";
  return "ignore";
}

export function assertSafeContent(path, content) {
  if (!content || content.includes(0)) return;
  const value = text(content);
  if (/(?:gh[pousr]_[A-Za-z0-9_]{25,}|github_pat_[A-Za-z0-9_]{25,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s:/]+:[^\s@]+@|AKIA[A-Z0-9]{16})/.test(value)) {
    throw new Error(`Possible credential in ${path}; manual review required.`);
  }
  if (path.startsWith("src/") && /(?:from\s*["']@supabase\/|require\(["']@supabase\/|https:\/\/[^\s"']+\.supabase\.co|signInWithPassword\s*\(|signUp\s*\()/.test(value)) {
    throw new Error(`Cloud authentication in ${path}; manual adaptation required.`);
  }
}

function blob(source, ref, path) {
  const info = git(source, ["ls-tree", ref, "--", path]).stdout.toString();
  if (!info) return null;
  if (!/^100(?:644|755) blob /.test(info)) throw new Error(`Unsupported file type: ${path}`);
  return git(source, ["show", `${ref}:${path}`]).stdout;
}

export function mergeContent(current, base, incoming, path) {
  if (same(current, incoming) || same(base, incoming)) return current;
  if (same(current, base)) return incoming;
  if (current === null || base === null || incoming === null || [current, base, incoming].some((value) => value.includes(0))) {
    throw new Error(`Conflicting addition/deletion/binary change: ${path}`);
  }
  const temp = mkdtempSync(join(tmpdir(), "showcase-merge-"));
  try {
    const files = [current, base, incoming].map((value, index) => {
      const file = join(temp, String(index));
      writeFileSync(file, text(value));
      return file;
    });
    const result = spawnSync("git", ["merge-file", "-p", ...files], { maxBuffer: 32 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`Showcase/upstream conflict: ${path}; production left unchanged.`);
    return result.stdout;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

export function synchronize({ source, target, dryRun = false }) {
  source = resolve(source);
  target = resolve(target);
  if (source === target) throw new Error("Source and showcase must be separate checkouts.");
  if (!dryRun && git(target, ["status", "--porcelain"]).stdout.length) throw new Error("Showcase checkout must be clean.");
  const marker = JSON.parse(readFileSync(join(target, ".showcase-sync.json"), "utf8"));
  const base = marker.sourceCommit;
  const head = git(source, ["rev-parse", "HEAD"]).stdout.toString().trim();
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error("Invalid sync marker.");
  if (git(source, ["merge-base", "--is-ancestor", base, head], true).status !== 0) throw new Error("Source history changed; review required.");
  if (head === base) return { changed: false, sourceCommit: head, files: [] };

  const paths = git(source, ["diff", "--name-only", "--no-renames", "-z", base, head]).stdout.toString().split("\0").filter(Boolean);
  const plan = [];
  for (const path of paths) {
    const policy = classifyPath(path);
    if (policy === "ignore") continue;
    if (policy === "review") throw new Error(`Sensitive or unknown change requires manual adaptation: ${path}`);
    if (policy === "dependencies") {
      const before = JSON.parse(blob(source, base, "package.json").toString());
      const after = JSON.parse(blob(source, head, "package.json").toString());
      for (const key of ["dependencies", "devDependencies", "overrides", "engines"]) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw new Error("Dependency changes require manual showcase review.");
      }
      if (path === "package-lock.json") throw new Error("Dependency lock changes require manual showcase review.");
      continue;
    }
    const destination = join(target, path);
    const current = existsSync(destination) ? readFileSync(destination) : null;
    const merged = mergeContent(current, blob(source, base, path), blob(source, head, path), path);
    assertSafeContent(path, merged);
    if (!same(current, merged)) plan.push({ path, content: merged });
  }
  // Plan every file first: conflicts/credential findings must never partially apply a sync.
  if (!dryRun) {
    for (const { path, content } of plan) {
      const destination = join(target, path);
      if (content === null) unlinkSync(destination);
      else { mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, content); }
    }
    writeFileSync(join(target, ".showcase-sync.json"), `${JSON.stringify({ ...marker, sourceCommit: head, syncedOn: new Date().toISOString().slice(0, 10) }, null, 2)}\n`);
  }
  return { changed: true, sourceCommit: head, files: plan.map(({ path }) => path) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const index = process.argv.indexOf("--source");
    if (index < 0 || !process.argv[index + 1]) throw new Error("Use --source <private-checkout> [--dry-run]");
    const target = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const result = synchronize({ source: process.argv[index + 1], target, dryRun: process.argv.includes("--dry-run") });
    console.log(JSON.stringify(result));
    if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `changed=${result.changed}\nsource_sha=${result.sourceCommit}\n`, { flag: "a" });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
