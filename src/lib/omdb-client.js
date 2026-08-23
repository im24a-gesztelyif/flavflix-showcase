"use client";

import { serializeParams } from "@/lib/utils";

const DEFAULT_OMDB_CACHE_TTL = 1000 * 60 * 60 * 24;
const EPISODE_OMDB_CACHE_TTL = 1000 * 60 * 60 * 24 * 7;

function getCacheKey(params) {
  return `omdb-cache:${serializeParams(params)}`;
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

export async function omdbClientGet({ imdbId, season, episode }, options = {}) {
  const params = {
    imdbId,
    ...(season ? { season } : {}),
    ...(episode ? { episode } : {}),
  };
  const cacheKey = getCacheKey(params);
  const ttl = options.ttl ?? (season || episode ? EPISODE_OMDB_CACHE_TTL : DEFAULT_OMDB_CACHE_TTL);

  if (!options.forceFresh) {
    const cached = readCachedResponse(cacheKey);

    if (cached) {
      return cached;
    }
  }

  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")),
  );

  const response = await fetch(`/api/omdb?${query.toString()}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `OMDb proxy error ${response.status}`);
  }

  const data = await response.json();
  writeCachedResponse(cacheKey, data, ttl);
  return data;
}
