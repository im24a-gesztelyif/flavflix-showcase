import { getProviderMetadata } from "./providers.js";

const PROGRESS_EVENTS = new Set(["play", "pause", "seeked", "ended", "timeupdate", "playerstatus"]);

function objectData(value) {
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return null; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function seconds(value) {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function matchesIdentity(payload, context) {
  const id = payload.tmdbId ?? payload.mtmdbId ?? payload.id;
  const type = payload.mediaType ?? payload.type;
  if (id !== undefined && Number(id) !== Number(context.id)) return false;
  if (type !== undefined && type !== context.mediaType) return false;
  if (context.mediaType === "tv") {
    if (payload.season !== undefined && Number(payload.season) !== Number(context.season)) return false;
    if (payload.episode !== undefined && Number(payload.episode) !== Number(context.episode)) return false;
  }
  return true;
}

function mediaDataProgress(data, context) {
  const record = data.id !== undefined ? data : Object.values(data).find(
    (item) => objectData(item) && item.id !== undefined && matchesIdentity(item, context),
  );
  if (!record || !matchesIdentity(record, context)) return null;
  let progress = record.progress;
  if (context.mediaType === "tv") {
    const episodeProgress = record.show_progress?.[`s${context.season}e${context.episode}`];
    if (episodeProgress) {
      progress = episodeProgress.progress ?? episodeProgress;
    } else if (
      Number(record.last_season_watched ?? record.lastSeason) !== Number(context.season) ||
      Number(record.last_episode_watched ?? record.lastEpisode) !== Number(context.episode)
    ) {
      return null;
    }
  }
  return objectData(progress) ? {
    event: "timeupdate",
    currentTime: progress.watched ?? progress.currentTime,
    duration: progress.duration,
  } : null;
}

export function resolveProviderProgress(payload, previous) {
  const sameEntry = previous?.provider === payload.provider && previous?.id === payload.id &&
    previous?.mediaType === payload.mediaType && previous?.season === payload.season &&
    previous?.episode === payload.episode;
  const duration = payload.duration > 0 ? payload.duration : sameEntry ? previous.duration : undefined;
  const currentTime = payload.event === "ended" && duration > 0 ? duration
    : payload.currentTime ?? (sameEntry ? previous.currentTime : undefined);
  return duration > 0 && Number.isFinite(currentTime) ? { ...payload, currentTime, duration } : null;
}

// Bind messages to both the active origin and the current iframe instance.
export function readProviderMessage(message, context, iframeWindow) {
  const metadata = getProviderMetadata(context.providerId);
  if (!metadata.supportsProgress || metadata.id !== context.providerId ||
      message.origin !== metadata.origin || !iframeWindow || message.source !== iframeWindow) return null;

  const data = objectData(message.data);
  if (!data) return null;
  let payload;
  if (context.providerId === "cinesrc") {
    if (data.type === "cinesrc:nextepisode") {
      const season = Number(data.season);
      const episode = Number(data.episode);
      return Number.isInteger(season) && season > 0 && Number.isInteger(episode) && episode > 0
        ? { event: "nextepisode", season, episode } : null;
    }
    if (typeof data.type !== "string" || !data.type.startsWith("cinesrc:")) return null;
    payload = { ...data, event: data.type.slice("cinesrc:".length) };
  } else if (data.type === "PLAYER_EVENT") {
    payload = objectData(context.providerId === "vixsrc" ? data.event ?? data.data : data.data);
    // VixSrc's video_id is an internal player ID, not a TMDB identifier.
    if (context.providerId !== "vixsrc" && (!payload || !matchesIdentity(payload, context))) return null;
  } else if (data.type === "MEDIA_DATA" && ["vidfast", "vidlove"].includes(context.providerId)) {
    payload = mediaDataProgress(objectData(data.data) ?? {}, context);
  }
  if (!payload || !PROGRESS_EVENTS.has(payload.event)) return null;
  return {
    event: payload.event,
    cached: data.type === "MEDIA_DATA",
    id: Number(context.id),
    mediaType: context.mediaType,
    season: context.mediaType === "tv" ? Number(context.season) : undefined,
    episode: context.mediaType === "tv" ? Number(context.episode) : undefined,
    currentTime: seconds(payload.currentTime ?? payload.watched),
    duration: seconds(payload.duration),
    provider: context.providerId,
  };
}
