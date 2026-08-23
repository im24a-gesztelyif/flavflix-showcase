const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const ALLOWED_PATH_PREFIXES = [
  "configuration",
  "search/",
  "discover/",
  "trending/",
  "movie/",
  "tv/",
  "person/",
  "collection/",
  "company/",
  "genre/",
];

export function assertTmdbPath(path) {
  if (!path || path.includes("..") || path.includes("://")) {
    throw new Error("Invalid TMDB path.");
  }

  const isAllowed = ALLOWED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));

  if (!isAllowed) {
    throw new Error(`TMDB path not allowed: ${path}`);
  }
}

export async function tmdbGet(path, params = {}, options = {}) {
  assertTmdbPath(path);

  const token = process.env.TMDB_READ_TOKEN;

  if (!token) {
    throw new Error("TMDB_READ_TOKEN is not configured.");
  }

  const url = new URL(`${TMDB_BASE_URL}/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  const isSearch = path.startsWith("search/");
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    next: {
      revalidate: options.revalidate ?? (isSearch ? 60 : 1800),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TMDB ${response.status}: ${text}`);
  }

  return response.json();
}
