const SEGMENT_LABELS = {
  recap: "Skip recap",
  intro: "Skip intro",
  credits: "Skip credits",
  preview: "Skip preview",
};

function integerParam(value, min, max) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

export function parseIntroDbParams(params) {
  const mediaType = params.get("mediaType");
  const tmdbId = integerParam(params.get("tmdbId"), 1, 10_000_000);
  const durationMs = integerParam(params.get("durationMs"), 1, 21_600_000);
  if (!["movie", "tv"].includes(mediaType) || tmdbId === null || durationMs === null) return null;
  const season = mediaType === "tv" ? integerParam(params.get("season"), 1, Number.MAX_SAFE_INTEGER) : undefined;
  const episode = mediaType === "tv" ? integerParam(params.get("episode"), 1, Number.MAX_SAFE_INTEGER) : undefined;
  if (season === null || episode === null) return null;
  return { mediaType, tmdbId, durationMs, season, episode };
}

export function buildIntroDbUrl(query) {
  const url = new URL("https://api.theintrodb.org/v3/media");
  url.searchParams.set("tmdb_id", query.tmdbId);
  url.searchParams.set("duration_ms", query.durationMs);
  if (query.mediaType === "tv") {
    url.searchParams.set("season", query.season);
    url.searchParams.set("episode", query.episode);
  }
  return url.toString();
}

export function normalizeIntroDbSegments(data, query) {
  if (data?.tmdb_id !== query.tmdbId || data?.type !== query.mediaType ||
      (query.mediaType === "tv" && (data.season !== query.season || data.episode !== query.episode))) return [];

  return Object.entries(SEGMENT_LABELS).flatMap(([type, label]) => {
    if (!Array.isArray(data[type])) return [];
    return data[type].flatMap((interval) => {
      const startMs = interval?.start_ms === null ? 0 : interval?.start_ms;
      const openEnded = interval?.end_ms === null;
      if (openEnded && !["credits", "preview"].includes(type)) return [];
      const endMs = openEnded ? query.durationMs : interval?.end_ms;
      if (!Number.isInteger(startMs) || !Number.isInteger(endMs) || startMs < 0 ||
          endMs <= startMs || endMs > query.durationMs) return [];
      return [{ type, label, start: startMs / 1000, end: endMs / 1000, ...(openEnded ? { openEnded: true } : {}) }];
    });
  });
}

export function findIntroDbSegment(segments, currentTime) {
  if (!Number.isFinite(currentTime) || currentTime < 0) return null;
  return segments.find((segment) => currentTime >= segment.start && currentTime < segment.end) ?? null;
}

export function getCreditsPlayback(segments, currentTime, paused = false) {
  const credits = segments.filter((segment) => segment.type === "credits");
  const previews = segments.filter((segment) => segment.type === "preview");
  const inPreview = previews.some((segment) => currentTime >= segment.start && currentTime < segment.end);
  const inCredits = Number.isFinite(currentTime) && !inPreview && credits.some(
    (segment) => currentTime >= segment.start && currentTime <= segment.end,
  );
  const previewStart = inCredits ? previews.filter((segment) => segment.start > currentTime)
    .sort((a, b) => a.start - b.start)[0]?.start ?? null : null;
  return { hasCredits: credits.length > 0, inCredits, previewStart, paused };
}
