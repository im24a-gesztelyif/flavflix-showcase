const VIDLINK_BASE = "https://vidlink.pro";
const CINESRC_BASE = "https://cinesrc.st";
const VIDEASY_BASE = "https://player.videasy.net";
const SEVEN_XSTREAM_BASE = "https://embed.7xstream.tv";
// The documented VidSrc alias currently 301s to vsembed.ru.
// Using the final host directly preserves delegated fullscreen permission.
const VIDSRC_BASE = "https://vsembed.ru";

export const PROVIDER_OPTIONS = [
  {
    id: "videasy",
    label: "Source 1",
    description: "Third-party playback source with progress support.",
    supportsProgress: true,
    supportsNextEpisode: true,
  },
  {
    id: "vidlink",
    label: "Source 2",
    description: "Third-party playback source with progress support.",
    supportsProgress: true,
    supportsNextEpisode: true,
  },
  {
    id: "cinesrc",
    label: "Source 3",
    description: "Third-party playback source with progress support.",
    supportsProgress: true,
    supportsNextEpisode: true,
  },
  {
    id: "7xstream",
    label: "Source 4",
    description: "Third-party fallback playback source.",
    supportsProgress: false,
    supportsNextEpisode: false,
  },
  {
    id: "vidsrc",
    label: "Source 5",
    description: "Third-party fallback playback source.",
    supportsProgress: false,
    supportsNextEpisode: false,
  },
];

function toSubtitleLanguage(language) {
  if (!language) {
    return undefined;
  }

  return String(language).split(/[-_]/)[0]?.toLowerCase() || undefined;
}

function createProviderSearchParams(options = {}) {
  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function buildProviderUrl({
  providerId,
  mediaType,
  tmdbId,
  season,
  episode,
  resumeTime,
  settings,
}) {
  const resolvedProviderId = resolveProviderId(providerId);

  if (resolvedProviderId === "vidlink") {
    const path =
      mediaType === "movie"
        ? `/movie/${tmdbId}`
        : `/tv/${tmdbId}/${season || 1}/${episode || 1}`;

    const params = createProviderSearchParams({
      primaryColor: "E31F5C",
      secondaryColor: "2E0D16",
      iconColor: "F7DCE5",
      title: true,
      poster: true,
      autoplay: true,
      nextbutton: mediaType === "tv" ? false : undefined,
      player: "jw",
      startAt: Number(resumeTime) > 15 ? Math.floor(resumeTime) : undefined,
    });

    return `${VIDLINK_BASE}${path}${params}`;
  }

  if (resolvedProviderId === "cinesrc") {
    const resumeOffset = Number(resumeTime) > 15 ? Math.floor(resumeTime) : undefined;

    if (mediaType === "movie") {
      const params = createProviderSearchParams({
        autoplay: false,
        color: "#E31F5C",
        controls: true,
        t: resumeOffset,
      });

      return `${CINESRC_BASE}/embed/movie/${tmdbId}${params}`;
    }

    const params = createProviderSearchParams({
      s: season || 1,
      e: episode || 1,
      autoplay: false,
      color: "#E31F5C",
      controls: true,
      autonext: false,
      autoskip: false,
      t: resumeOffset,
    });

    return `${CINESRC_BASE}/embed/tv/${tmdbId}${params}`;
  }

  if (resolvedProviderId === "videasy") {
    const resumeOffset = Number(resumeTime) > 15 ? Math.floor(resumeTime) : undefined;
    const params = createProviderSearchParams({
      color: "E31F5C",
      progress: resumeOffset,
      overlay: true,
    });

    if (mediaType === "movie") {
      return `${VIDEASY_BASE}/movie/${tmdbId}${params}`;
    }

    return `${VIDEASY_BASE}/tv/${tmdbId}/${season || 1}/${episode || 1}${params}`;
  }

  if (resolvedProviderId === "7xstream") {
    if (mediaType === "movie") {
      return `${SEVEN_XSTREAM_BASE}/embed/movie/${tmdbId}`;
    }

    return `${SEVEN_XSTREAM_BASE}/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
  }

  if (resolvedProviderId === "vidsrc") {
    const subtitleLanguage = toSubtitleLanguage(settings?.language);

    if (mediaType === "movie") {
      const params = createProviderSearchParams({
        tmdb: tmdbId,
        ds_lang: subtitleLanguage,
        autoplay: 1,
      });

      return `${VIDSRC_BASE}/embed/movie${params}`;
    }

    const params = createProviderSearchParams({
      tmdb: tmdbId,
      season: season || 1,
      episode: episode || 1,
      ds_lang: subtitleLanguage,
      autoplay: 1,
      autonext: settings?.autoplayNextEpisode ?? true ? 1 : 0,
    });

    return `${VIDSRC_BASE}/embed/tv${params}`;
  }

  throw new Error(`Unsupported provider: ${providerId}`);
}

export function resolveProviderId(providerId) {
  return PROVIDER_OPTIONS.some((provider) => provider.id === providerId) ? providerId : "vidlink";
}

export function getProviderMetadata(providerId) {
  return PROVIDER_OPTIONS.find((provider) => provider.id === resolveProviderId(providerId)) || PROVIDER_OPTIONS[0];
}

export function getProviderOrder(settings, requestedProvider) {
  return ["videasy", "vidlink", "cinesrc", "7xstream", "vidsrc"];
}
