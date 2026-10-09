const TYPES = { recap: "recap", intro: "intro", outro: "credits", preview: "preview" };

export function buildSkipDbUrl(imdbId, query) {
  if (!/^tt\d{6,10}$/.test(imdbId || "")) return null;
  const url = new URL("https://api.skipdb.tv/api/segments");
  url.searchParams.set("imdb_id", imdbId);
  url.searchParams.set("duration", Math.max(1, Math.round(query.durationMs / 1000)));
  url.searchParams.set("adjust", "conservative");
  if (query.mediaType === "tv") {
    url.searchParams.set("season", query.season);
    url.searchParams.set("episode", query.episode);
  }
  return url.toString();
}

export function normalizeSkipDbSegments(data, query, imdbId) {
  const result = { segments: [], coveredTypes: [] };
  if (data?.imdb_id !== imdbId ||
      (query.mediaType === "tv" ? data.season !== query.season || data.episode !== query.episode
        : data.season != null || data.episode != null)) return result;

  for (const [remoteType, type] of Object.entries(TYPES)) {
    const interval = data.segments?.[remoteType];
    if (!interval || !["exact", "shifted", "agnostic"].includes(interval.match)) continue;
    const { start_ms: start, end_ms: end } = interval;
    // Some deployments expose absence sentinels; others return null for these.
    if (start === 0 && end === 0) {
      result.coveredTypes.push(type);
      continue;
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > query.durationMs) continue;
    result.coveredTypes.push(type);
    result.segments.push({
      type, label: `Skip ${type}`, start: start / 1000, end: end / 1000,
      source: "skipdb", match: interval.match,
      ...(Number.isFinite(interval.confidence) ? { confidence: interval.confidence } : {}),
    });
  }
  return result;
}

export function mergeSkipSegments(skipdb, introdb) {
  const covered = new Set(skipdb.coveredTypes);
  return [...skipdb.segments, ...introdb.filter((segment) => !covered.has(segment.type))]
    .sort((a, b) => a.start - b.start);
}
