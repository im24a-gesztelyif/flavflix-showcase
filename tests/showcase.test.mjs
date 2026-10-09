import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("showcase retains browser profiles without cloud authentication", async () => {
  const state = await read("src/lib/app-state.js");
  assert.match(state, /localStorage/);
  assert.match(state, /isShowcase: true/);
  assert.doesNotMatch(state, /supabase|signInWithPassword|signUp\(/i);
  assert.doesNotMatch(await read("package.json"), /@supabase/);
  await assert.rejects(access(new URL("../src/middleware.js", import.meta.url)));
});

test("showcase keeps its persistent five-minute preview gate", async () => {
  const player = await read("src/components/player-shell.js");
  const watch = await read("src/components/screens/watch-screen.js");
  assert.match(player, /const budget = 300;/);
  assert.match(player, /localStorage.getItem\(previewKey\)/);
  assert.match(player, /remaining === 0/);
  assert.match(watch, /previewKey=\{`flavflix-showcase-preview:/);
  assert.match(watch, /key=\{`\$\{activeProfile\?\.id/);
});

test("showcase defaults, disclaimer and zoom-safe detail layout survive syncing", async () => {
  assert.match(await read("src/lib/storage.js"), /defaultProvider: "cinesrc"/);
  assert.match(await read("src/lib/providers.js"), /id: "cinesrc", label: "Source 1"/);
  assert.match(await read("src/app/globals.css"), /zoom: 1\.1/);
  assert.match(await read("README.md"), /## Disclaimer/);
  const detail = await read("src/components/screens/detail-screen.js");
  assert.doesNotMatch(detail, /-mx-\[50vw\]/);
  assert.match(detail, /relative -mx-4 -mt-24/);
  assert.match(detail, /External ratings are unavailable right now/);
});
