const SESSION_KEY_PREFIX = "flavflix-session:";
const LEGACY_STORAGE_KEY = "flavflix-state";
const LEGACY_DATABASE_NAME = "flavflix";

export const DEFAULT_SETTINGS = {
  defaultProvider: "vidlink",
  fallbackEnabled: true,
  autoplayNextEpisode: true,
  language: process.env.NEXT_PUBLIC_TMDB_LANGUAGE || "en-US",
  region: process.env.NEXT_PUBLIC_TMDB_REGION || "US",
};

const DEFAULT_SESSION_STATE = {
  selectedProfileId: null,
};

function getSessionKey(userId) {
  return userId ? `${SESSION_KEY_PREFIX}${userId}` : null;
}

function measureBytes(value) {
  if (value === undefined || value === null) {
    return 0;
  }

  const normalized = typeof value === "string" ? value : JSON.stringify(value);

  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(normalized).length;
  }

  return normalized.length * 2;
}

function deleteLegacyDatabase() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }

    try {
      const request = indexedDB.deleteDatabase(LEGACY_DATABASE_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function loadSessionState(userId) {
  if (typeof window === "undefined") {
    return DEFAULT_SESSION_STATE;
  }

  const sessionKey = getSessionKey(userId);

  if (!sessionKey) {
    return DEFAULT_SESSION_STATE;
  }

  try {
    const raw = localStorage.getItem(sessionKey);
    return raw
      ? {
          ...DEFAULT_SESSION_STATE,
          ...JSON.parse(raw),
        }
      : DEFAULT_SESSION_STATE;
  } catch {
    return DEFAULT_SESSION_STATE;
  }
}

export function saveSessionState(userId, state) {
  if (typeof window === "undefined") {
    return;
  }

  const sessionKey = getSessionKey(userId);

  if (!sessionKey) {
    return;
  }

  localStorage.setItem(
    sessionKey,
    JSON.stringify({
      ...DEFAULT_SESSION_STATE,
      ...state,
    }),
  );
}

export function clearSessionState(userId) {
  if (typeof window === "undefined") {
    return;
  }

  if (userId) {
    const sessionKey = getSessionKey(userId);

    if (sessionKey) {
      localStorage.removeItem(sessionKey);
    }

    return;
  }

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(SESSION_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

export function clearTmdbCache() {
  if (typeof window === "undefined") {
    return;
  }

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("tmdb-cache:")) {
      localStorage.removeItem(key);
    }
  });
}

export async function clearLegacyPersonalStorage() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(LEGACY_STORAGE_KEY);
  await deleteLegacyDatabase();
}

export async function getStorageUsage() {
  if (typeof window === "undefined") {
    return {
      cacheBytes: 0,
      sessionBytes: 0,
      legacyBytes: 0,
    };
  }

  let cacheBytes = 0;
  let sessionBytes = 0;
  let legacyBytes = 0;

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);

    if (!key) {
      continue;
    }

    const value = localStorage.getItem(key) || "";
    const bytes = measureBytes(key) + measureBytes(value);

    if (key.startsWith("tmdb-cache:")) {
      cacheBytes += bytes;
    }

    if (key.startsWith(SESSION_KEY_PREFIX)) {
      sessionBytes += bytes;
    }

    if (key === LEGACY_STORAGE_KEY) {
      legacyBytes += bytes;
    }
  }

  return {
    cacheBytes,
    sessionBytes,
    legacyBytes,
  };
}
