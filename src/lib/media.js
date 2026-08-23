import { formatYear } from "@/lib/utils";

export function detectMediaType(item, fallbackType) {
  if (fallbackType === "movie" || fallbackType === "tv") {
    return fallbackType;
  }

  if (item?.media_type === "movie" || item?.title || item?.release_date) {
    return "movie";
  }

  if (item?.media_type === "tv" || item?.name || item?.first_air_date) {
    return "tv";
  }

  return fallbackType || "movie";
}

export function getMediaTitle(item, mediaType) {
  if (!item) {
    return "Untitled";
  }

  const resolvedType = detectMediaType(item, mediaType);

  if (resolvedType === "movie") {
    return item.title || item.original_title || item.name || item.original_name || "Untitled";
  }

  return item.name || item.original_name || item.title || item.original_title || "Untitled";
}

export function getMediaYear(item, mediaType) {
  const resolvedType = detectMediaType(item, mediaType);
  return formatYear(
    resolvedType === "movie"
      ? item.release_date || item.releaseDate || item.first_air_date || item.year
      : item.first_air_date || item.releaseDate || item.release_date || item.year,
  );
}

export function normalizeMediaItem(item, fallbackType) {
  if (!item) {
    return null;
  }

  const mediaType = detectMediaType(item, fallbackType);

  return {
    id: item.id,
    mediaType,
    title: getMediaTitle(item, mediaType),
    overview: item.overview || "No synopsis available yet.",
    posterPath: item.poster_path || item.posterPath || item.profile_path || item.profilePath,
    backdropPath: item.backdrop_path || item.backdropPath || item.poster_path || item.posterPath,
    year: getMediaYear(item, mediaType),
    voteAverage: item.vote_average ?? item.voteAverage,
    voteCount: item.vote_count ?? item.voteCount,
    genreIds: item.genre_ids || item.genres?.map((genre) => genre.id) || [],
    popularity: item.popularity,
    releaseDate:
      mediaType === "movie"
        ? item.release_date || item.releaseDate || item.first_air_date || item.year
        : item.first_air_date || item.releaseDate || item.release_date || item.year,
    runtime:
      item.runtime ||
      item.episode_run_time?.[0] ||
      item.last_episode_to_air?.runtime ||
      item.runtimeMinutes ||
      null,
  };
}

export function isUpcomingMedia(item, fallbackType) {
  const normalized = normalizeMediaItem(item, fallbackType);

  if (!normalized?.releaseDate) {
    return false;
  }

  const releaseDate = new Date(normalized.releaseDate);

  if (Number.isNaN(releaseDate.getTime())) {
    return false;
  }

  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return releaseDate.getTime() > todayAtMidnight;
}

export function isPlayableMedia(item, fallbackType) {
  return !isUpcomingMedia(item, fallbackType);
}

export function createMediaSnapshot(item, fallbackType) {
  const normalized = normalizeMediaItem(item, fallbackType);

  if (!normalized) {
    return null;
  }

  return {
    id: normalized.id,
    mediaType: normalized.mediaType,
    title: normalized.title,
    overview: normalized.overview,
    posterPath: normalized.posterPath,
    backdropPath: normalized.backdropPath,
    year: normalized.year,
    voteAverage: normalized.voteAverage,
    runtime: normalized.runtime,
    releaseDate: normalized.releaseDate,
  };
}

function clampUnitInterval(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function getSnapshotRuntimeSeconds(snapshot) {
  const runtimeMinutes = Number(snapshot?.runtime);

  if (!Number.isFinite(runtimeMinutes) || runtimeMinutes <= 0) {
    return null;
  }

  return runtimeMinutes * 60;
}

export function normalizeProgressMetrics({ mediaType, currentTime, duration, percent, snapshot }) {
  const normalizedCurrentTime = Number.isFinite(Number(currentTime)) ? Math.max(0, Number(currentTime)) : 0;
  const normalizedDuration = Number.isFinite(Number(duration)) ? Math.max(1, Number(duration)) : 1;
  const explicitPercent = Number.isFinite(Number(percent)) ? clampUnitInterval(Number(percent)) : null;
  const runtimeSeconds = mediaType === "movie" ? getSnapshotRuntimeSeconds(snapshot) : null;

  const hasClearlyBrokenMovieDuration =
    mediaType === "movie" &&
    runtimeSeconds &&
    normalizedCurrentTime > 0 &&
    normalizedDuration > 0 &&
    Math.abs(normalizedDuration - normalizedCurrentTime) <= 1 &&
    runtimeSeconds > normalizedCurrentTime + 30;

  const effectiveDuration = hasClearlyBrokenMovieDuration ? runtimeSeconds : normalizedDuration;
  const effectivePercent =
    explicitPercent !== null && !hasClearlyBrokenMovieDuration
      ? explicitPercent
      : clampUnitInterval(normalizedCurrentTime / effectiveDuration);

  return {
    currentTime: normalizedCurrentTime,
    duration: effectiveDuration,
    percent: effectivePercent,
    watchedComplete: effectivePercent >= 0.9,
  };
}

export function shouldShowInContinueWatching(entry) {
  if (!entry) {
    return false;
  }

  const currentTime = Number(entry.currentTime || 0);
  const percent = Number(entry.percent);

  if (!Number.isFinite(currentTime) || currentTime <= 0) {
    return false;
  }

  if (!Number.isFinite(percent)) {
    return true;
  }

  return entry.mediaType === "tv" || percent < 0.9;
}

export function getDetailHref(mediaType, id) {
  return `/${mediaType}/${id}`;
}

export function getWatchHref(mediaType, id, options = {}) {
  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  const query = params.toString();
  return `/watch/${mediaType}/${id}${query ? `?${query}` : ""}`;
}

export function createProgressKey({ mediaType, id, season, episode }) {
  const keyParts = [mediaType, id];

  if (mediaType === "tv") {
    keyParts.push(season || 1, episode || 1);
  }

  return keyParts.join(":");
}

export function createMediaActivityKey({ mediaType, id }) {
  return `${mediaType}:${id}`;
}

export function findEpisodeAfter(episodes = [], episodeNumber) {
  return episodes.find((episode) => episode.episode_number > Number(episodeNumber));
}
