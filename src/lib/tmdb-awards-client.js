"use client";

const DEFAULT_AWARDS_CACHE_TTL = 1000 * 60 * 60 * 24;

function getCacheKey({ mediaType, id, language }) {
  return `tmdb-awards:${mediaType}:${id}:${language}`;
}

function readCachedResponse(key) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedResponse(key, data, ttl) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        expiresAt: Date.now() + ttl,
        data,
      }),
    );
  } catch {
    // Ignore localStorage quota errors.
  }
}

export async function tmdbAwardsClientGet({ mediaType, id, language = "en-US" }, options = {}) {
  const cacheKey = getCacheKey({ mediaType, id, language });
  const ttl = options.ttl ?? DEFAULT_AWARDS_CACHE_TTL;

  if (!options.forceFresh) {
    const cached = readCachedResponse(cacheKey);

    if (cached !== null) {
      return cached;
    }
  }

  const query = new URLSearchParams({
    mediaType,
    id: String(id),
    language,
  });
  const response = await fetch(`/api/tmdb-awards?${query.toString()}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `TMDB awards proxy error ${response.status}`);
  }

  const payload = await response.json();
  writeCachedResponse(cacheKey, payload.awards ?? null, ttl);
  return payload.awards ?? null;
}
