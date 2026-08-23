"use client";

import { serializeParams } from "@/lib/utils";

const DEFAULT_CACHE_TTL = 1000 * 60 * 15;
const CONFIG_CACHE_TTL = 1000 * 60 * 60 * 12;

function getCacheKey(path, params) {
  return `tmdb-cache:${path}?${serializeParams(params)}`;
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
    // Ignore quota errors for the MVP.
  }
}

export async function tmdbClientGet(path, params = {}, options = {}) {
  const ttl = options.ttl ?? DEFAULT_CACHE_TTL;
  const cacheKey = getCacheKey(path, params);

  if (!options.forceFresh) {
    const cached = readCachedResponse(cacheKey);

    if (cached) {
      return cached;
    }
  }

  const query = new URLSearchParams({
    path,
    ...Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    ),
  });

  const response = await fetch(`/api/tmdb?${query.toString()}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `TMDB proxy error ${response.status}`);
  }

  const data = await response.json();
  writeCachedResponse(cacheKey, data, ttl);
  return data;
}

export function getTmdbConfiguration() {
  return tmdbClientGet("configuration", {}, { ttl: CONFIG_CACHE_TTL });
}
