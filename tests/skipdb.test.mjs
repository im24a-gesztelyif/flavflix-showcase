import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildSkipDbUrl, normalizeSkipDbSegments, mergeSkipSegments } from "../src/lib/skipdb.js";
import * as introdb from "../src/lib/introdb.js";

const query = { mediaType: "tv", tmdbId: 1396, season: 1, episode: 1, durationMs: 3500000 };
const imdbId = "tt0903747";
const interval = (start_ms, end_ms, match = "exact") => ({ start_ms, end_ms, match, confidence: 0.9 });
const payload = (segments = {}, identity = {}) => ({ imdb_id: imdbId, season: 1, episode: 1, segments, ...identity });

test("SkipDB sends show IMDb, all segment types, conservative adjustment and rounded seconds", () => {
  const url = new URL(buildSkipDbUrl(imdbId, { ...query, durationMs: 3500499 }));
  assert.equal(url.origin, "https://api.skipdb.tv");
  assert.equal(url.pathname, "/api/segments");
  assert.equal(url.searchParams.get("duration"), "3500");
  assert.equal(url.searchParams.get("adjust"), "conservative");
  assert.equal(url.searchParams.get("imdb_id"), imdbId);
  assert.equal(url.searchParams.get("season"), "1");
  assert.equal(url.searchParams.has("type"), false);
  const movie = new URL(buildSkipDbUrl(imdbId, { ...query, mediaType: "movie" }));
  assert.equal(movie.searchParams.has("season"), false);
  assert.equal(movie.searchParams.has("episode"), false);
  for (const id of [null, "", "1396", "tt123", "https://attacker.test"]) assert.equal(buildSkipDbUrl(id, query), null);
});

test("SkipDB normalizes all four types and never reapplies an already-adjusted offset", () => {
  const data = normalizeSkipDbSegments(payload({
    recap: interval(0, 60000), intro: { ...interval(229500, 246500, "shifted"), adjusted: true, offset_ms: -10000 },
    outro: interval(3434000, 3500000), preview: interval(3400000, 3430000, "agnostic"),
  }), query, imdbId);
  assert.deepEqual(data.coveredTypes, ["recap", "intro", "credits", "preview"]);
  assert.equal(data.segments[1].start, 229.5);
  assert.equal(data.segments[2].label, "Skip credits");
  assert.equal(data.segments[2].end, 3500);
  assert.equal(data.segments[1].confidence, 0.9);
});

test("wrong media, cuts, malformed clocks and out-of-bounds segments cannot drive skipping", () => {
  for (const identity of [{ imdb_id: "tt1234567" }, { season: 2 }, { episode: 2 }]) {
    assert.deepEqual(normalizeSkipDbSegments(payload({ intro: interval(0, 10000) }, identity), query, imdbId).segments, []);
  }
  const movie = { ...query, mediaType: "movie" };
  assert.equal(normalizeSkipDbSegments(payload({ intro: interval(0, 10000) }), movie, imdbId).segments.length, 0);
  for (const value of [null, {}, interval(-1, 5000), interval(5000, 5000), interval(0, 3500001),
    interval("0", 5000), interval(0, null), interval(0, 5000, "out-of-range"), interval(0, 5000, "unknown")]) {
    assert.deepEqual(normalizeSkipDbSegments(payload({ intro: value }), query, imdbId).segments, []);
  }
});

test("per-type precedence fills missing/bad cuts without duplicates; absence suppresses fallback", () => {
  const intro = [{ type: "intro", start: 10, end: 20 }, { type: "credits", start: 3000, end: 3500 }, { type: "recap", start: 0, end: 5 }];
  const skip = normalizeSkipDbSegments(payload({ intro: interval(20000, 30000), outro: interval(3000000, 3500000, "out-of-range"), recap: interval(0, 0) }), query, imdbId);
  const combined = mergeSkipSegments(skip, intro);
  assert.equal(combined.length, 2);
  assert.equal(combined[0].source, "skipdb");
  assert.equal(combined[1], intro[1]);
  assert.equal(introdb.getCreditsPlayback(combined, 3100).inCredits, true);
  assert.deepEqual(mergeSkipSegments({ segments: [], coveredTypes: [] }, intro), [intro[2], intro[0], intro[1]]);
});

const routeSource = (await readFile(new URL("../src/app/api/skip-segments/route.js", import.meta.url), "utf8"))
  .replace('import { NextResponse } from "next/server";', "const NextResponse = { json: (body, init) => ({ body, ...init }) };")
  .replace('from "@/lib/introdb"', `from "${new URL("../src/lib/introdb.js", import.meta.url).href}"`)
  .replace('from "@/lib/skipdb"', `from "${new URL("../src/lib/skipdb.js", import.meta.url).href}"`)
  .replace('import { tmdbGet } from "@/lib/tmdb-server";', "const tmdbGet = (...args) => globalThis.__skipDbTmdb(...args);");
const { GET } = await import(`data:text/javascript;base64,${Buffer.from(routeSource).toString("base64")}`);

test("combined route validates input, maps IMDb, handles partial/total outages and empty coverage", async () => {
  const originalFetch = globalThis.fetch;
  const request = { url: `http://localhost/api/skip-segments?${new URLSearchParams(query)}` };
  let introFails = false, skipFails = false, mappingFails = false, empty = false, missingImdb = false;
  let skipCalls = 0;
  globalThis.__skipDbTmdb = async (path, params, options) => {
    assert.equal(path, "tv/1396/external_ids");
    assert.equal(options.revalidate, 86400);
    assert.ok(options.signal instanceof AbortSignal);
    if (mappingFails) throw new Error("TMDB timeout");
    return { imdb_id: missingImdb ? null : imdbId };
  };
  globalThis.fetch = async (url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.next.revalidate, 86400);
    const skip = new URL(url).hostname === "api.skipdb.tv";
    if (skip) skipCalls++;
    if (skip ? skipFails : introFails) throw new Error("Network timeout");
    return { ok: true, status: 200, json: async () => skip ? payload(empty ? {} : { intro: interval(20000, 30000) }) : {
      tmdb_id: 1396, type: "tv", season: 1, episode: 1,
      intro: empty ? [] : [{ start_ms: 10000, end_ms: 15000 }],
      credits: empty ? [] : [{ start_ms: 3400000, end_ms: 3500000 }],
    } };
  };
  try {
    assert.equal((await GET({ url: "http://localhost/api/skip-segments?tmdbId=1" })).status, 400);
    let result = await GET(request);
    assert.equal(result.status, 200);
    assert.equal(result.body.segments.length, 2);
    assert.equal(result.body.segments[0].source, "skipdb");
    assert.match(result.headers["Cache-Control"], /86400/);
    skipFails = true;
    result = await GET(request);
    assert.equal(result.body.segments.length, 2);
    assert.equal(result.headers["Cache-Control"], "no-store");
    introFails = true;
    assert.equal((await GET(request)).status, 503);
    skipFails = false;
    assert.equal((await GET(request)).body.segments[0].source, "skipdb");
    introFails = false;
    mappingFails = true;
    assert.equal((await GET(request)).body.segments.length, 2);
    mappingFails = false;
    empty = true;
    result = await GET(request);
    assert.equal(result.status, 200);
    assert.match(result.headers["Cache-Control"], /3600/);
    missingImdb = true;
    const calls = skipCalls;
    assert.equal((await GET(request)).status, 200);
    assert.equal(skipCalls, calls);
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.__skipDbTmdb;
  }
});
