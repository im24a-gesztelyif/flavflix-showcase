import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import * as introdb from "../src/lib/introdb.js";
import * as providers from "../src/lib/providers.js";
import * as events from "../src/lib/provider-events.js";

const query = { mediaType: "tv", tmdbId: 1396, season: 1, episode: 1, durationMs: 3480000 };
const media = { tmdb_id: 1396, type: "tv", season: 1, episode: 1 };
const params = (overrides = {}) => new URLSearchParams({ ...query, ...overrides });

test("lookup validates identifiers, episode position and measured duration", () => {
  assert.deepEqual(introdb.parseIntroDbParams(params()), query);
  for (const overrides of [
    { tmdbId: "" }, { tmdbId: "1.2" }, { tmdbId: "-1" }, { tmdbId: "10000001" },
    { mediaType: "person" }, { season: 0 }, { episode: "NaN" }, { durationMs: 0 },
    { durationMs: 21600001 }, { durationMs: "Infinity" },
  ]) assert.equal(introdb.parseIntroDbParams(params(overrides)), null);
  const movie = introdb.parseIntroDbParams(params({ mediaType: "movie" }));
  const url = new URL(introdb.buildIntroDbUrl(movie));
  assert.equal(url.origin, "https://api.theintrodb.org");
  assert.equal(url.pathname, "/v3/media");
  assert.equal(url.searchParams.get("tmdb_id"), "1396");
  assert.equal(url.searchParams.has("season"), false);
  assert.equal(url.searchParams.has("episode"), false);
  assert.equal(new URL(introdb.buildIntroDbUrl(query)).searchParams.get("episode"), "1");
});

test("all usable intervals convert milliseconds; open credits retain coverage without a seek target", () => {
  assert.deepEqual(introdb.normalizeIntroDbSegments({ ...media,
    recap: [{ start_ms: null, end_ms: 60000 }],
    intro: [{ start_ms: 228664, end_ms: 246143 }, { start_ms: 600000, end_ms: 620000 }],
    credits: [{ start_ms: 3431000, end_ms: null }],
    preview: [{ start_ms: 3400000, end_ms: 3470000 }],
  }, query), [
    { type: "recap", label: "Skip recap", start: 0, end: 60 },
    { type: "intro", label: "Skip intro", start: 228.664, end: 246.143 },
    { type: "intro", label: "Skip intro", start: 600, end: 620 },
    { type: "credits", label: "Skip credits", start: 3431, end: 3480, openEnded: true },
    { type: "preview", label: "Skip preview", start: 3400, end: 3470 },
  ]);
});

test("mismatched media and malformed or out-of-duration segments are rejected", () => {
  for (const overrides of [{ tmdb_id: 1 }, { type: "movie" }, { season: 2 }, { episode: 2 }]) {
    assert.deepEqual(introdb.normalizeIntroDbSegments({ ...media, ...overrides, intro: [{ start_ms: 0, end_ms: 1000 }] }, query), []);
  }
  const bad = [null, {}, { start_ms: -1, end_ms: 1000 }, { start_ms: 1000, end_ms: 1000 },
    { start_ms: 0, end_ms: 3480001 }, { start_ms: "0", end_ms: 1000 }, { start_ms: 0, end_ms: null }];
  assert.deepEqual(introdb.normalizeIntroDbSegments({ ...media, intro: bad, recap: {} }, query), []);
  assert.deepEqual(introdb.normalizeIntroDbSegments(null, query), []);
});

test("credits use their timestamps, not 90 percent, and upcoming previews use their start", () => {
  const segments = introdb.normalizeIntroDbSegments({ ...media,
    credits: [{ start_ms: 3300000, end_ms: null }],
    preview: [{ start_ms: 3400000, end_ms: 3440000 }],
  }, query);
  assert.deepEqual(introdb.getCreditsPlayback(segments, 3200), { hasCredits: true, inCredits: false, previewStart: null, paused: false });
  assert.deepEqual(introdb.getCreditsPlayback(segments, 3300), { hasCredits: true, inCredits: true, previewStart: 3400, paused: false });
  assert.equal(introdb.getCreditsPlayback(segments, 3400).inCredits, false);
  assert.equal(introdb.getCreditsPlayback(segments, 3440).inCredits, true);
  assert.equal(introdb.getCreditsPlayback(segments, 3480).inCredits, true);
  assert.equal(introdb.getCreditsPlayback(segments, 3300, true).paused, true);
  assert.equal(introdb.getCreditsPlayback([], 3300).hasCredits, false);
});

test("button interval is start-inclusive, end-exclusive and absent outside coverage", () => {
  const segment = { start: 228.664, end: 246.143 };
  for (const time of [0, 228.663, 246.143, NaN, undefined]) assert.equal(introdb.findIntroDbSegment([segment], time), null);
  for (const time of [228.664, 240]) assert.equal(introdb.findIntroDbSegment([segment], time), segment);
});

test("seeking uses each supported provider's exact command in seconds", () => {
  assert.deepEqual(providers.buildProviderSeekCommand("cinesrc", 246.143), { type: "cinesrc:command", command: "seek", args: [246.143] });
  assert.deepEqual(providers.buildProviderSeekCommand("vidfast", 246.143), { command: "seek", time: 246.143 });
  assert.deepEqual(providers.buildProviderSeekCommand("vidlove", 246.143), { type: "SET_TIME", time: 246.143 });
  for (const id of ["vixsrc", "vidsrc", "unknown", "vidlink"]) assert.equal(providers.buildProviderSeekCommand(id, 10), null);
  for (const time of [-1, NaN, Infinity, "10"]) assert.equal(providers.buildProviderSeekCommand("cinesrc", time), null);
});

const routeSource = (await readFile(new URL("../src/app/api/introdb/route.js", import.meta.url), "utf8"))
  .replace('import { NextResponse } from "next/server";', "const NextResponse = { json: (body, init) => ({ body, ...init }) };")
  .replace('from "@/lib/introdb"', `from "${new URL("../src/lib/introdb.js", import.meta.url).href}"`);
const { GET } = await import(`data:text/javascript;base64,${Buffer.from(routeSource).toString("base64")}`);

test("server route caches public coverage and empty results, not failures", async () => {
  const originalFetch = globalThis.fetch;
  const request = { url: `http://localhost/api/introdb?${params()}` };
  try {
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, introdb.buildIntroDbUrl(query));
      assert.equal(options.next.revalidate, 86400);
      assert.ok(options.signal instanceof AbortSignal);
      return { ok: true, status: 200, json: async () => ({ ...media, intro: [{ start_ms: 0, end_ms: 1000 }] }) };
    };
    const good = await GET(request);
    assert.equal(good.body.segments.length, 1);
    assert.equal(good.headers["Cache-Control"], "public, max-age=86400");
    const invalid = await GET({ url: "http://localhost/api/introdb?tmdbId=1" });
    assert.equal(invalid.status, 400);
    assert.equal(calls, 1);
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    const missing = await GET(request);
    assert.deepEqual(missing.body.segments, []);
    assert.equal(missing.headers["Cache-Control"], "public, max-age=3600");
    for (const status of [429, 500]) {
      globalThis.fetch = async () => ({ ok: false, status });
      const failure = await GET(request);
      assert.equal(failure.status, 503);
      assert.equal(failure.headers["Cache-Control"], "no-store");
    }
    globalThis.fetch = async () => { throw new Error("timeout"); };
    assert.equal((await GET(request)).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

const require = createRequire(import.meta.url);
const { transform } = require("next/dist/build/swc");
const componentSource = await readFile(new URL("../src/components/intro-skip-button.js", import.meta.url), "utf8");
const compiled = await transform(componentSource, {
  filename: "intro-skip-button.js",
  jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
  module: { type: "commonjs" },
});

function buttonHarness(providerId, fetchImpl, onPlaybackChange) {
  let state = null;
  let cleanup;
  let listener;
  let effectInstalled = false;
  const refs = [];
  let refIndex = 0;
  const commands = [];
  const iframe = { postMessage: (command, origin) => commands.push({ command, origin }) };
  const props = { ...query, id: query.tmdbId, providerId, iframeRef: { current: { contentWindow: iframe } }, onPlaybackChange };
  const exports = {};
  const element = (type, props) => ({ type, props });
  vm.runInNewContext(compiled.code, {
    exports, URLSearchParams, AbortController, fetch: fetchImpl,
    window: { addEventListener: (_type, fn) => { listener = fn; }, removeEventListener: () => { listener = null; } },
    require: (id) => {
      if (id === "react") return {
        useState: () => [state, (value) => { state = typeof value === "function" ? value(state) : value; }],
        useRef: (value) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
        useEffect: (fn) => { if (!effectInstalled) { effectInstalled = true; cleanup = fn(); } },
      };
      if (id === "react/jsx-runtime") return { jsx: element, jsxs: element };
      if (id === "lucide-react") return { SkipForward: "svg" };
      if (id === "@/lib/introdb") return introdb;
      if (id === "@/lib/providers") return providers;
      if (id === "@/lib/provider-events") return events;
      throw new Error(id);
    },
  });
  return {
    commands,
    render: (overrides) => { refIndex = 0; return exports.IntroSkipButton({ ...props, ...overrides }); },
    send: (time, extra = {}) => listener?.({
      source: iframe, origin: providers.getProviderMetadata(providerId).origin,
      data: providerId === "cinesrc" ? { type: "cinesrc:timeupdate", currentTime: time, duration: 3480 }
        : { type: "PLAYER_EVENT", data: { event: "timeupdate", currentTime: time, duration: 3480 } },
      ...extra,
    }),
    cleanup: () => cleanup?.(),
  };
}

test("live events load once, skip correctly, hide completely and clean up for all seek providers", async () => {
  for (const providerId of ["cinesrc", "vidfast", "vidlove"]) {
    let calls = 0;
    let signal;
    const harness = buttonHarness(providerId, async (url, options) => {
      calls++;
      signal = options.signal;
      assert.equal(new URL(url, "http://localhost").pathname, "/api/skip-segments");
      assert.equal(new URL(url, "http://localhost").searchParams.get("durationMs"), "3480000");
      return { ok: true, json: async () => ({ segments: [{ type: "intro", label: "Skip intro", start: 228, end: 246 }] }) };
    });
    assert.equal(harness.render(), null);
    harness.send(230, { origin: "https://evil.example" });
    harness.send(230, { source: {} });
    assert.equal(calls, 0);
    harness.send(230);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(harness.render().props.children[1], "Skip intro");
    assert.equal(harness.render({ hidden: true }), null);
    harness.render().props.onClick();
    assert.equal(harness.commands[0].origin, providers.getProviderMetadata(providerId).origin);
    assert.equal(JSON.stringify(harness.commands[0].command), JSON.stringify(providers.buildProviderSeekCommand(providerId, 246)));
    assert.equal(harness.render(), null);
    harness.send(231);
    assert.equal(harness.render(), null);
    harness.send(246);
    harness.send(230);
    assert.ok(harness.render());
    harness.send(247);
    assert.equal(harness.render(), null);
    assert.equal(calls, 1);
    harness.cleanup();
    assert.equal(signal.aborted, true);
  }
});

test("unsupported sources and API errors never create a skip control", async () => {
  for (const providerId of ["vixsrc", "vidsrc"]) {
    const harness = buttonHarness(providerId, () => { throw new Error("must not fetch"); });
    assert.equal(harness.render(), null);
    harness.send(230);
    assert.equal(harness.render(), null);
  }
  const harness = buttonHarness("cinesrc", async () => ({ ok: false }));
  harness.render();
  harness.send(230);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.render(), null);
  harness.cleanup();
});

test("cached player progress does not activate skips or request timestamps", () => {
  for (const providerId of ["vidfast", "vidlove"]) {
    const harness = buttonHarness(providerId, () => { throw new Error("must not fetch"); });
    harness.render();
    harness.send(230, { data: { type: "MEDIA_DATA", data: {
      id: 1396, type: "tv", last_season_watched: 1, last_episode_watched: 1,
      progress: { watched: 230, duration: 3480 },
    } } });
    assert.equal(harness.render(), null);
    harness.cleanup();
  }
});

test("late responses cannot revive a control after the iframe changes", async () => {
  let complete;
  const harness = buttonHarness("cinesrc", () => new Promise((resolve) => { complete = resolve; }));
  harness.render();
  harness.send(230);
  harness.cleanup();
  complete({ ok: true, json: async () => ({ segments: [{ start: 228, end: 246, label: "Skip intro" }] }) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.render(), null);
});

test("credits replace the generic skip button, even on progress-only VixSrc", async () => {
  for (const providerId of ["cinesrc", "vidfast", "vidlove", "vixsrc"]) {
    let playback;
    const harness = buttonHarness(providerId, async () => ({ ok: true, json: async () => ({ segments: [
      { type: "credits", label: "Skip credits", start: 3000, end: 3480, openEnded: true },
      { type: "preview", label: "Skip preview", start: 3400, end: 3440 },
    ] }) }), (next) => { playback = next; });
    harness.render();
    harness.send(3100);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(playback.inCredits, true);
    assert.equal(playback.previewStart, 3400);
    assert.equal(harness.render(), null);
    harness.send(3410);
    assert.equal(playback.inCredits, false);
    assert.equal(harness.render(), null);
    harness.cleanup();
  }
});
