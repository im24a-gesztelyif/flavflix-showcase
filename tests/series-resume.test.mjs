import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isEpisodeFinished, resolveSeriesResume } from "../src/lib/series-resume.js";

const entry = (season, episode, percent = 0.95, extra = {}) => ({ id: 1396, mediaType: "tv", season, episode, percent, updatedAt: "2026-10-01T12:00:00Z", ...extra });
const ep = (episode_number, air_date = "2020-01-01") => ({ episode_number, air_date });
const seasons = [
  { season_number: 0, episode_count: 3 }, { season_number: 1, episode_count: 3 },
  { season_number: 2, episode_count: 2 }, { season_number: 4, episode_count: 1 },
];
function resolve(progress, overrides = {}) {
  return resolveSeriesResume({ id: 1396, progress, seasons, today: "2026-10-09", loadSeason: async (season_number) => ({
    season_number, episodes: season_number === 1 ? [ep(3), ep(1), ep(2)] : season_number === 2 ? [ep(1), ep(2)] : [ep(1)],
  }), ...overrides });
}

test("completion uses the existing 90% threshold, explicit completion or measured playback", () => {
  assert.equal(isEpisodeFinished(entry(1, 1, 0.9)), true);
  assert.equal(isEpisodeFinished(entry(1, 1, 0.899)), false);
  assert.equal(isEpisodeFinished({ watchedComplete: true }), true);
  assert.equal(isEpisodeFinished({ currentTime: 95, duration: 100 }), true);
  for (const value of [null, {}, { duration: 0, currentTime: 10 }]) assert.equal(isEpisodeFinished(value), false);
});

test("new viewers start normally; unfinished latest episode resumes without metadata requests", async () => {
  assert.deepEqual(await resolve({}), { season: 1, episode: 1, restart: false });
  assert.deepEqual(await resolve({ a: entry(1, 2, 0.5), b: entry(2, 1, 0.95, { id: 1 }) }, {
    loadSeason: () => { throw new Error("must not fetch"); },
  }), { season: 1, episode: 2, restart: false });
});

test("95% resumes next episode, across season boundaries and non-contiguous seasons", async () => {
  assert.deepEqual(await resolve({ a: entry(1, 1) }), { season: 1, episode: 2, restart: false });
  assert.deepEqual(await resolve({ a: entry(1, 3) }), { season: 2, episode: 1, restart: false });
  assert.deepEqual(await resolve({ a: entry(2, 2) }), { season: 4, episode: 1, restart: false });
});

test("already-watched successors are skipped but partially-watched successors retain position", async () => {
  const older = { updatedAt: "2026-09-01T12:00:00Z" };
  const progress = { a: entry(1, 1), b: entry(1, 2, 1, older), c: entry(1, 3, 0.4, older) };
  assert.deepEqual(await resolve(progress), { season: 1, episode: 3, restart: false });
});

test("unaired/undated successors, finale, missing season data and outages never resume credits or wrap", async () => {
  const progress = { a: entry(1, 3) };
  const fallback = { season: 1, episode: 3, restart: true };
  for (const episodes of [[ep(1, "2027-01-01")], [ep(1, null)], [ep(1, "2027-01-01"), ep(2)]]) {
    assert.deepEqual(await resolve(progress, { loadSeason: async (season_number) => ({ season_number, episodes }) }), fallback);
  }
  assert.deepEqual(await resolve(progress, { loadSeason: async () => { throw new Error("offline"); } }), fallback);
  assert.deepEqual(await resolve(progress, { loadSeason: async () => ({ season_number: 99, episodes: [ep(1)] }) }), fallback);
  assert.deepEqual(await resolve(progress, { loadSeason: async (season_number) => ({ season_number, episodes: [] }) }), fallback);
  assert.deepEqual(await resolve({ a: entry(4, 1) }), { season: 4, episode: 1, restart: true });
});

test("watch entry points resolve once before embedding; explicit episode links stay explicit", async () => {
  const watch = await readFile(new URL("../src/components/screens/watch-screen.js", import.meta.url), "utf8");
  const detail = await readFile(new URL("../src/components/screens/detail-screen.js", import.meta.url), "utf8");
  assert.match(detail, /const watchHref = getWatchHref\(mediaType, id\)/);
  assert.match(detail, /getWatchHref\("tv", id, \{ season: selectedSeason, episode: episode.episode_number \}\)/);
  assert.match(watch, /initialSeason \|\| initialEpisode \|\| !ready/);
  assert.match(watch, /resumeSelectionRef.current === id/);
  assert.match(watch, /resumeSelectionId !== id/);
  assert.match(watch, /isEpisodeFinished\(resumeEntry\) \? 0/);
});
