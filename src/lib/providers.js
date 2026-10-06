const CINESRC_BASE = "https://cinesrc.st";
const VIDFAST_BASE = "https://vidfast.vc";
const VIDLOVE_BASE = "https://player.vidlove.cc";
const VIXSRC_BASE = "https://vixsrc.to";
// Use VidSrc's final embed host instead of a redirect.
const VIDSRC_BASE = "https://vsembed.ru";

export const PROVIDER_OPTIONS = [
  { id: "cinesrc", label: "Source 1", origin: CINESRC_BASE, supportsProgress: true, supportsNextEpisode: true },
  { id: "vidfast", label: "Source 2", origin: VIDFAST_BASE, supportsProgress: true, supportsNextEpisode: true },
  { id: "vidlove", label: "Source 3", origin: VIDLOVE_BASE, supportsProgress: true, supportsNextEpisode: true },
  { id: "vixsrc", label: "Source 4", origin: VIXSRC_BASE, supportsProgress: true, supportsNextEpisode: true, audioLanguage: "it" },
  { id: "vidsrc", label: "Source 5", origin: VIDSRC_BASE, supportsProgress: false, supportsNextEpisode: false },
];

function toSubtitleLanguage(language) {
  return language ? String(language).split(/[-_]/)[0]?.toLowerCase() : undefined;
}

function createProviderSearchParams(options = {}) {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function buildProviderUrl({ providerId, mediaType, tmdbId, season, episode, resumeTime, settings }) {
  const resolvedProviderId = resolveProviderId(providerId);
  const offset = Number(resumeTime);
  const resumeOffset = Number.isFinite(offset) && offset > 15 ? Math.floor(offset) : undefined;
  const episodePath = `${tmdbId}/${season || 1}/${episode || 1}`;
  const path = mediaType === "movie" ? `/movie/${tmdbId}` : `/tv/${episodePath}`;

  if (resolvedProviderId === "cinesrc") {
    return `${CINESRC_BASE}/embed/${mediaType}/${tmdbId}${createProviderSearchParams({
      s: mediaType === "tv" ? season || 1 : undefined,
      e: mediaType === "tv" ? episode || 1 : undefined,
      autoplay: false,
      color: "#E31F5C",
      controls: true,
      autonext: mediaType === "tv" ? false : undefined,
      autoskip: mediaType === "tv" ? false : undefined,
      t: resumeOffset,
    })}`;
  }

  if (resolvedProviderId === "vidfast") {
    return `${VIDFAST_BASE}${path}${createProviderSearchParams({
      theme: "E31F5C",
      autoPlay: false,
      title: true,
      poster: true,
      startAt: resumeOffset,
      sub: toSubtitleLanguage(settings?.language),
      nextButton: mediaType === "tv" ? false : undefined,
      autoNext: mediaType === "tv" ? false : undefined,
    })}`;
  }

  if (resolvedProviderId === "vidlove") {
    return `${VIDLOVE_BASE}/embed${path}${createProviderSearchParams({
      primarycolor: "E31F5C",
      secondarycolor: "2E0D16",
      iconcolor: "F7DCE5",
      autoplay: false,
      poster: true,
      autonext: mediaType === "tv" ? false : undefined,
      showNextEpisode: mediaType === "tv" ? false : undefined,
      episodelist: mediaType === "tv" ? false : undefined,
    })}`;
  }

  if (resolvedProviderId === "vixsrc") {
    return `${VIXSRC_BASE}${path}${createProviderSearchParams({
      primaryColor: "E31F5C",
      secondaryColor: "2E0D16",
      autoplay: false,
      startAt: resumeOffset,
      lang: "it",
    })}`;
  }

  return `${VIDSRC_BASE}/embed/${mediaType}${createProviderSearchParams({
    tmdb: tmdbId,
    season: mediaType === "tv" ? season || 1 : undefined,
    episode: mediaType === "tv" ? episode || 1 : undefined,
    ds_lang: toSubtitleLanguage(settings?.language),
    autoplay: 1,
    autonext: mediaType === "tv" ? (settings?.autoplayNextEpisode ?? true ? 1 : 0) : undefined,
  })}`;
}

export function resolveProviderId(providerId) {
  return PROVIDER_OPTIONS.some((provider) => provider.id === providerId) ? providerId : "cinesrc";
}

export function getProviderMetadata(providerId) {
  return PROVIDER_OPTIONS.find((provider) => provider.id === resolveProviderId(providerId));
}

export function getProviderOrder() {
  return PROVIDER_OPTIONS.map((provider) => provider.id);
}

export function buildProviderSeekCommand(providerId, time) {
  if (!Number.isFinite(time) || time < 0) return null;
  if (providerId === "cinesrc") return { type: "cinesrc:command", command: "seek", args: [time] };
  if (providerId === "vidfast") return { command: "seek", time };
  if (providerId === "vidlove") return { type: "SET_TIME", time };
  return null;
}
