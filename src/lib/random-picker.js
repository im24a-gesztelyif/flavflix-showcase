export const DEFAULT_RANDOM_PREFERENCES = {
  mediaType: "mixed",
  moods: [],
  runtime: "any",
  quality: "popular",
  rating: "6",
  genre: "",
  language: "",
  yearFrom: "",
  yearTo: "",
};

export const RANDOM_MOODS = [
  { id: "feel-good", label: "Feel-good" },
  { id: "intense", label: "Intense" },
  { id: "mind-bending", label: "Mind-bending" },
  { id: "emotional", label: "Emotional" },
  { id: "dark", label: "Dark" },
  { id: "funny", label: "Funny" },
  { id: "adventurous", label: "Adventurous" },
  { id: "romantic", label: "Romantic" },
  { id: "suspenseful", label: "Suspenseful" },
  { id: "family", label: "Family night" },
  { id: "real", label: "True stories" },
  { id: "nostalgic", label: "Nostalgic" },
];

const MOOD_GENRES = {
  "feel-good": { movie: "35,10751,10402", tv: "35,10751" },
  intense: { movie: "28,12,53", tv: "10759,80" },
  "mind-bending": { movie: "878,9648,53", tv: "10765,9648" },
  emotional: { movie: "18,10749", tv: "18" },
  dark: { movie: "27,80,53", tv: "80,9648" },
  funny: { movie: "35", tv: "35" },
  adventurous: { movie: "12,14", tv: "10759,10765" },
  romantic: { movie: "10749", tv: "18" },
  suspenseful: { movie: "53,9648", tv: "9648,80" },
  family: { movie: "10751,16", tv: "10751,16" },
  real: { movie: "99,36", tv: "99" },
  nostalgic: { movie: "10751,35,18", tv: "10751,35,18" },
};

function getReleaseField(mediaType) {
  return mediaType === "movie" ? "primary_release_date" : "first_air_date";
}

function parseYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1870 && year <= 2200 ? year : null;
}

function getYearRange(preferences) {
  const from = parseYear(preferences.yearFrom);
  const to = parseYear(preferences.yearTo);
  if (from && to) return from <= to ? [from, to] : [to, from];
  return [from, to];
}

function getMoodGenres(moods, mediaType) {
  const genreIds = (moods || []).flatMap((mood) => MOOD_GENRES[mood]?.[mediaType]?.split(",") || []);
  return [...new Set(genreIds)].join("|") || undefined;
}

export function buildRandomDiscoverParams({ preferences, mediaType, genreId, language, region, page, today }) {
  const date = today || new Date().toISOString().slice(0, 10);
  const releaseField = getReleaseField(mediaType);
  const [yearFrom, yearTo] = getYearRange(preferences);
  const quality = preferences.quality;
  const ratingFloor = Number(preferences.rating) || undefined;
  const params = {
    include_adult: false,
    language,
    region,
    page,
    sort_by: quality === "acclaimed" ? "vote_average.desc" : quality === "biggest" && mediaType === "movie" ? "revenue.desc" : "popularity.desc",
    with_genres: genreId || getMoodGenres(preferences.moods, mediaType),
    with_original_language: preferences.language || undefined,
    "vote_average.gte": Math.max(ratingFloor || 0, quality === "acclaimed" ? 7.5 : 0) || undefined,
    "vote_count.gte": quality === "acclaimed" ? 350 : quality === "biggest" ? 500 : 150,
    [`${releaseField}.gte`]: yearFrom ? `${yearFrom}-01-01` : undefined,
    [`${releaseField}.lte`]: yearTo && `${yearTo}-12-31` < date ? `${yearTo}-12-31` : date,
  };

  if (preferences.runtime === "quick") params["with_runtime.lte"] = mediaType === "movie" ? 90 : 30;
  if (preferences.runtime === "standard") {
    params["with_runtime.gte"] = mediaType === "movie" ? 80 : 31;
    params["with_runtime.lte"] = mediaType === "movie" ? 125 : 60;
  }
  if (preferences.runtime === "epic") params["with_runtime.gte"] = mediaType === "movie" ? 126 : 61;

  return params;
}

function getMediaKey(item) {
  return `${item.media_type || (item.title ? "movie" : "tv")}:${item.id}`;
}

function isReleased(item, today) {
  const releaseDate = item.release_date || item.first_air_date;
  return releaseDate && releaseDate <= today;
}

export function selectRandomCandidates(items, recentKeys = [], count = 4, random = Math.random, today) {
  const date = today || new Date().toISOString().slice(0, 10);
  const recent = new Set(recentKeys);
  const unique = [];
  const seen = new Set();

  for (const item of items) {
    const key = getMediaKey(item);
    if (!item?.id || seen.has(key) || !item.poster_path || !item.backdrop_path || !isReleased(item, date)) continue;
    seen.add(key);
    unique.push(item);
  }

  const fresh = unique.filter((item) => !recent.has(getMediaKey(item)));
  const pool = fresh.length >= count ? fresh : unique;

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, count);
}

export function getRandomPickReason(preferences) {
  const reasons = [];
  (preferences.moods || []).slice(0, 2).forEach((moodId) => {
    const mood = RANDOM_MOODS.find((item) => item.id === moodId);
    if (mood) reasons.push(mood.label);
  });
  if (preferences.runtime === "quick") reasons.push("Quick watch");
  if (preferences.runtime === "standard") reasons.push("Standard length");
  if (preferences.runtime === "epic") reasons.push("Long-form");
  if (preferences.quality === "acclaimed") reasons.push("Highly rated");
  if (preferences.quality === "biggest") reasons.push("Biggest hits");
  if (preferences.rating) reasons.push(`${preferences.rating}+ rating`);
  if (preferences.yearFrom || preferences.yearTo) reasons.push(`${preferences.yearFrom || "1870"}-${preferences.yearTo || "now"}`);
  if (preferences.genre) reasons.push(preferences.genre);
  return reasons.length ? reasons : ["Popular right now", "A little unexpected"];
}
