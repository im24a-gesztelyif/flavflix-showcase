import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { classifyPath, assertSafeContent, mergeContent, synchronize } from "../scripts/sync-from-upstream.mjs";

test("sync excludes private auth/docs and stops on bespoke state, unknown code and dependencies", () => {
  assert.equal(classifyPath("src/app/api/auth/sign-in/route.js"), "ignore");
  assert.equal(classifyPath(".env.local"), "ignore");
  assert.equal(classifyPath(".github/workflows/ci.yml"), "ignore");
  assert.equal(classifyPath("src/lib/app-state.js"), "review");
  assert.equal(classifyPath("scripts/showcase-sync.mjs"), "review");
  assert.equal(classifyPath("../.env"), "review");
  assert.equal(classifyPath("package.json"), "dependencies");
  assert.equal(classifyPath("src/lib/series-resume.js"), "sync");
});

test("incremental merge retains showcase customizations and refuses conflicts", () => {
  const base = Buffer.from("first\nsecond\nthird\nfourth\nfifth\nsixth\nlast\n");
  const current = Buffer.from(base.toString().replace("first", "showcase"));
  const incoming = Buffer.from(base.toString().replace("last", "latest"));
  assert.match(mergeContent(current, base, incoming, "src/example.js").toString(), /showcase[\s\S]*latest/);
  assert.throws(() => mergeContent(current, base, Buffer.from(base.toString().replace("first", "conflict")), "src/example.js"), /conflict/);
  assert.throws(() => mergeContent(null, base, incoming, "src/example.js"));
});

test("credential and cloud-auth guards fail closed", () => {
  assert.throws(() => assertSafeContent("src/example.js", Buffer.from(`const token = 'ghp_${"A".repeat(35)}';`)), /credential/);
  assert.throws(() => assertSafeContent("src/example.js", Buffer.from('import { createClient } from "@supabase/supabase-js";')), /authentication/);
  assert.doesNotThrow(() => assertSafeContent("src/example.js", Buffer.from("const token = process.env.TMDB_READ_TOKEN;")));
});

test("real Git sync is incremental, idempotent, and leaves source untouched", () => {
  const root = mkdtempSync(join(tmpdir(), "showcase-sync-test-"));
  const source = join(root, "source");
  const target = join(root, "target");
  const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const save = (cwd, path, content) => { mkdirSync(join(cwd, path, ".."), { recursive: true }); writeFileSync(join(cwd, path), content); };
  const commit = (cwd) => { git(cwd, "add", "."); git(cwd, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-m", "fixture"); };
  try {
    for (const dir of [source, target]) { mkdirSync(dir); git(dir, "init"); }
    save(source, "src/example.js", "export const value = 1;\n"); commit(source);
    const base = git(source, "rev-parse", "HEAD");
    save(target, "src/example.js", "export const value = 1;\n");
    save(target, ".showcase-sync.json", JSON.stringify({ sourceCommit: base })); commit(target);
    save(source, "src/example.js", "export const value = 2;\n");
    save(source, "src/app/api/auth/route.js", "private auth code\n"); commit(source);
    const sourceHead = git(source, "rev-parse", "HEAD");
    const result = synchronize({ source, target });
    assert.equal(result.changed, true);
    assert.deepEqual(result.files, ["src/example.js"]);
    assert.match(readFileSync(join(target, "src/example.js"), "utf8"), /value = 2/);
    assert.equal(git(source, "status", "--porcelain"), "");
    assert.equal(git(source, "rev-parse", "HEAD"), sourceHead);
    commit(target);
    assert.equal(synchronize({ source, target }).changed, false);
    save(source, "src/example.js", "export const value = 3;\n");
    save(source, "src/lib/app-state.js", "requires manual adaptation\n"); commit(source);
    assert.throws(() => synchronize({ source, target }), /manual adaptation/);
    assert.match(readFileSync(join(target, "src/example.js"), "utf8"), /value = 2/);
    assert.equal(JSON.parse(readFileSync(join(target, ".showcase-sync.json"))).sourceCommit, sourceHead);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
