"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Info, Menu, Plus, PlayCircle, SkipForward, X } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { LoadingState } from "@/components/loading-state";
import { PlayerShell } from "@/components/player-shell";
import { IntroSkipButton } from "@/components/intro-skip-button";
import { CreditsNextEpisode } from "@/components/credits-next-episode";
import { useAppState } from "@/lib/app-state";
import { buildProviderSeekCommand, buildProviderUrl, getProviderMetadata, getProviderOrder, resolveProviderId } from "@/lib/providers";
import { createProgressKey, findEpisodeAfter, getWatchHref, isPlayableMedia } from "@/lib/media";
import { resolvePlaybackFraction } from "@/lib/playback-progress";
import { readProviderMessage, resolveProviderProgress } from "@/lib/provider-events";
import { bindPlayerFullscreenControls, getFullscreenElement, togglePlayerFullscreen } from "@/lib/player-fullscreen";
import { getButtonConfig, getFullscreenButtonStyle, getHeaderButtonStyle } from "@/lib/button-config";
import { useTmdbQuery } from "@/hooks/use-tmdb-query";
import { tmdbClientGet } from "@/lib/tmdb-client";
import { isEpisodeFinished, resolveSeriesResume } from "@/lib/series-resume";
import { buildImageUrl, buildPosterUrl, cn, formatRuntime, formatSeconds } from "@/lib/utils";

function syncUrl({ mediaType, id, providerId, season, episode }) {
  if (typeof window === "undefined") {
    return;
  }

  const href =
    mediaType === "tv"
      ? getWatchHref(mediaType, id, {
          season,
          episode,
          provider: providerId,
        })
      : getWatchHref(mediaType, id, {
          provider: providerId,
        });

  const currentHref = `${window.location.pathname}${window.location.search}`;

  if (currentHref === href) {
    return;
  }

  window.history.replaceState({}, "", href);
}

function normalizeEpisodeNumber(value, fallback) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0 ? normalizedValue : fallback;
}

function toProgressPercent(progressEntry) {
  const normalized = Number(progressEntry?.percent || 0);
  return Math.max(0, Math.min(100, Math.round(normalized * 100)));
}

const CONTROL_IDLE_DELAY = 3000;

export function WatchScreen({ mediaType, id, initialSeason, initialEpisode, initialProvider }) {
  const { settings, recordProgress, activeProfile, activeProfileData, isSaved, toggleSaved, ready } = useAppState();
  const [resumeSelectionId, setResumeSelectionId] = useState(null);
  const resumeSelectionRef = useRef(null);
  const recordProgressRef = useRef(recordProgress);
  recordProgressRef.current = recordProgress;
  const initialSeasonNumber = initialSeason ? Number(initialSeason) : 1;
  const initialEpisodeNumber = initialEpisode ? Number(initialEpisode) : 1;
  const [providerId, setProviderId] = useState(resolveProviderId(initialProvider || settings.defaultProvider || "cinesrc"));
  const [season, setSeason] = useState(initialSeasonNumber);
  const [episode, setEpisode] = useState(initialEpisodeNumber);
  const [displaySeason, setDisplaySeason] = useState(initialSeasonNumber);
  const [displayEpisode, setDisplayEpisode] = useState(initialEpisodeNumber);
  const [episodeDisplayName, setEpisodeDisplayName] = useState(null);
  const [nextEpisodePromptVisible, setNextEpisodePromptVisible] = useState(false);
  const [introPlayback, setIntroPlayback] = useState(null);
  const introPlaybackRef = useRef(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [watchHubMode, setWatchHubMode] = useState("episodes");
  const [hubSeason, setHubSeason] = useState(initialSeasonNumber);
  const [hubEpisode, setHubEpisode] = useState(initialEpisodeNumber);
  const [navigationPending, setNavigationPending] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [playbackSeed, setPlaybackSeed] = useState({
    key: "",
    resumeTime: undefined,
  });
  const iframeRef = useRef(null);
  const playerRootRef = useRef(null);
  const watchHubScrollRef = useRef(null);
  const watchHubDetailRef = useRef(null);
  const hubSeasonButtonRefs = useRef(new Map());
  const hubEpisodeButtonRefs = useRef(new Map());
  const lastProgressFlushRef = useRef(0);
  const lastProgressPayloadRef = useRef(null);
  const lastPlaybackMetricsRef = useRef(null);
  const controlsHideTimerRef = useRef(null);
  const displayStateRef = useRef({
    season: initialSeasonNumber,
    episode: initialEpisodeNumber,
  });
  const resumeAppliedRef = useRef("");
  const liveProgressKeyRef = useRef("");

  const detailQuery = useTmdbQuery(`${mediaType}/${id}`, {
    language: settings.language,
    append_to_response: "credits",
  });
  const seasonQuery = useTmdbQuery(
    `tv/${id}/season/${displaySeason}`,
    {
      language: settings.language,
    },
    {
      enabled: mediaType === "tv" && Boolean(displaySeason),
    },
  );
  const hubSeasonQuery = useTmdbQuery(
    `tv/${id}/season/${hubSeason}`,
    {
      language: settings.language,
    },
    {
      enabled: mediaType === "tv" && panelOpen && Boolean(hubSeason) && Number(hubSeason) !== Number(displaySeason),
      ttl: 1000 * 60 * 20,
    },
  );

  const progressKey = createProgressKey({ mediaType, id, season, episode });
  const resumeEntry = activeProfileData.progress?.[progressKey];
  const displayedProgressKey = createProgressKey({
    mediaType,
    id,
    season: displaySeason,
    episode: displayEpisode,
  });
  const displayedProgress = activeProfileData.progress?.[displayedProgressKey];
  const providerOrder = getProviderOrder();
  const seasonData = useMemo(
    () => (mediaType === "tv" && seasonQuery.data?.season_number === Number(displaySeason) ? seasonQuery.data : null),
    [displaySeason, mediaType, seasonQuery.data],
  );
  const seasonEpisodes = useMemo(() => seasonData?.episodes || [], [seasonData]);
  const currentEpisode = seasonEpisodes.find((item) => item.episode_number === Number(displayEpisode)) || null;
  const hubSeasonData = Number(hubSeason) === Number(displaySeason) ? seasonData : hubSeasonQuery.data;
  const hubEpisodes = hubSeasonData?.episodes || [];
  const hubSelectedEpisode =
    hubEpisodes.find((item) => item.episode_number === Number(hubEpisode)) ||
    hubEpisodes[0] ||
    currentEpisode ||
    null;
  const detail = detailQuery.data;
  const nextInSeason = findEpisodeAfter(seasonEpisodes, displayEpisode);
  const nextSeasonNumber = detail?.seasons?.filter((item) => item.season_number > Number(displaySeason) && item.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number)[0]?.season_number;
  const nextSeasonQuery = useTmdbQuery(`tv/${id}/season/${nextSeasonNumber}`, { language: settings.language }, {
    enabled: mediaType === "tv" && Boolean(seasonData) && !nextInSeason && Boolean(nextSeasonNumber),
  });
  const nextCandidate = nextInSeason || (nextSeasonQuery.data?.season_number === nextSeasonNumber ? nextSeasonQuery.data?.episodes?.[0] : null);
  const nextEpisode = nextCandidate?.air_date && nextCandidate.air_date <= new Date().toISOString().slice(0, 10) ? nextCandidate : null;
  const title = mediaType === "movie" ? detail?.title : detail?.name;
  const titleLabel =
    mediaType === "tv"
      ? [title, `S${displaySeason}`, `E${displayEpisode}`, episodeDisplayName || currentEpisode?.name]
          .filter(Boolean)
          .join(" | ")
      : title;
  const [controlsVisible, setControlsVisible] = useState(true);
  const seasonOptions = useMemo(
    () => detail?.seasons?.filter((item) => item.season_number > 0) || [],
    [detail?.seasons],
  );

  const focusPlayer = useCallback(() => {
    window.setTimeout(() => {
      iframeRef.current?.focus({ preventScroll: true });
    }, 0);
  }, []);

  async function toggleFlavflixFullscreen() {
    setFullscreenError("");
    try {
      await togglePlayerFullscreen(playerRootRef.current);
    } catch {
      setFullscreenError("Fullscreen isn't available in this browser.");
    }
    focusPlayer();
  }
  const toggleFullscreenRef = useRef(toggleFlavflixFullscreen);
  toggleFullscreenRef.current = toggleFlavflixFullscreen;

  useEffect(() => bindPlayerFullscreenControls({
    onToggle: () => { void toggleFullscreenRef.current(); },
  }), []);

  function releaseControlFocus(event) {
    event.currentTarget.blur();
    focusPlayer();
  }

  function clearControlsHideTimer() {
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  }

  function scheduleControlsHide(delay = CONTROL_IDLE_DELAY) {
    clearControlsHideTimer();

    if (panelOpen) {
      setControlsVisible(true);
      return;
    }

    controlsHideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, delay);
  }

  function revealControls(delay = CONTROL_IDLE_DELAY) {
    setControlsVisible((current) => (current ? current : true));
    scheduleControlsHide(delay);
  }

  const scheduleControlsHideRef = useRef(scheduleControlsHide);
  scheduleControlsHideRef.current = scheduleControlsHide;
  const revealControlsRef = useRef(revealControls);
  revealControlsRef.current = revealControls;

  function updateDisplayState(nextSeason, nextEpisode, nextName = null) {
    displayStateRef.current = {
      season: Number(nextSeason),
      episode: Number(nextEpisode),
    };
    setDisplaySeason(Number(nextSeason));
    setDisplayEpisode(Number(nextEpisode));
    setEpisodeDisplayName(nextName);
  }

  function advanceToEpisode(nextSeason, nextEpisodeNumber, nextEpisodeData) {
    const normalizedSeason = normalizeEpisodeNumber(nextSeason, displayStateRef.current.season || 1);
    const normalizedEpisode = normalizeEpisodeNumber(nextEpisodeNumber, displayStateRef.current.episode || 1);

    setSeason(normalizedSeason);
    setEpisode(normalizedEpisode);
    updateDisplayState(normalizedSeason, normalizedEpisode, nextEpisodeData?.name || null);

    setNextEpisodePromptVisible(false);
    syncUrl({
      mediaType,
      id,
      providerId,
      season: normalizedSeason,
      episode: normalizedEpisode,
    });
    focusPlayer();
  }

  const advanceToEpisodeRef = useRef(advanceToEpisode);
  advanceToEpisodeRef.current = advanceToEpisode;
  const nextEpisodeRef = useRef(nextEpisode);
  nextEpisodeRef.current = nextEpisode;
  const autoplayNextEpisodeRef = useRef(settings.autoplayNextEpisode);
  autoplayNextEpisodeRef.current = settings.autoplayNextEpisode;

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setProviderId(resolveProviderId(initialProvider || settings.defaultProvider || "cinesrc"));
  }, [initialProvider, settings.defaultProvider]);

  useEffect(() => {
    if (mediaType !== "tv") {
      return;
    }

    if (initialSeason || initialEpisode) {
      const nextSeason = initialSeason ? Number(initialSeason) : 1;
      const nextEpisode = initialEpisode ? Number(initialEpisode) : 1;
      setSeason(nextSeason);
      setEpisode(nextEpisode);
      updateDisplayState(nextSeason, nextEpisode);

    }
  }, [id, initialEpisode, initialSeason, mediaType]);

  useEffect(() => {
    if (mediaType !== "tv" || initialSeason || initialEpisode || !ready || !detail ||
        Number(detail.id) !== Number(id) || resumeSelectionRef.current === id) return;
    let cancelled = false;
    void resolveSeriesResume({
      id, progress: activeProfileData.progress, seasons: detail.seasons,
      loadSeason: (number) => tmdbClientGet(`tv/${id}/season/${number}`, { language: settings.language }, {
        signal: AbortSignal.timeout(5000),
      }),
    }).then((target) => {
      if (cancelled) return;
      resumeSelectionRef.current = id;
      setSeason(target.season);
      setEpisode(target.episode);
      updateDisplayState(target.season, target.episode);
      setResumeSelectionId(id);
    });
    return () => { cancelled = true; };
  }, [activeProfileData.progress, detail, id, initialEpisode, initialSeason, mediaType, ready, settings.language]);

  useEffect(() => {
    if (!getProviderMetadata(providerId).supportsProgress || mediaType !== "tv") {
      setNextEpisodePromptVisible(false);
    }
  }, [mediaType, providerId]);

  useEffect(() => {
    if (mediaType !== "tv" || !seasonEpisodes.length) {
      return;
    }

    const episodeExists = seasonEpisodes.some((item) => item.episode_number === Number(displayEpisode));

    if (!episodeExists) {
      const firstEpisode = seasonEpisodes[0]?.episode_number;

      if (firstEpisode) {
        if (Number(displaySeason) === Number(season)) {
          setEpisode(firstEpisode);
        }

        updateDisplayState(displaySeason, firstEpisode, seasonEpisodes[0]?.name || null);
      }
    }
  }, [displayEpisode, displaySeason, mediaType, season, seasonEpisodes]);

  useEffect(() => {
    if (mediaType !== "tv") {
      setEpisodeDisplayName(null);
      return;
    }

    if (!currentEpisode?.name) {
      return;
    }

    setEpisodeDisplayName((current) => (current === currentEpisode.name ? current : currentEpisode.name));
  }, [currentEpisode?.name, mediaType]);

  useEffect(() => {
    const seedKey = `${providerId}:${progressKey}`;

    if (playbackSeed.key === seedKey) {
      return;
    }

    resumeAppliedRef.current = "";
    liveProgressKeyRef.current = "";
    lastPlaybackMetricsRef.current = null;
    setPlaybackSeed({
      key: seedKey,
      resumeTime: mediaType === "tv" && isEpisodeFinished(resumeEntry) ? 0 : resumeEntry?.currentTime,
    });
    const pendingProgress = lastProgressPayloadRef.current;
    if (pendingProgress) {
      recordProgressRef.current({
        ...pendingProgress,
        currentTime: pendingProgress.currentTime ?? pendingProgress.watched,
      });
      lastProgressPayloadRef.current = null;
    }
    lastProgressFlushRef.current = 0;
  }, [mediaType, playbackSeed.key, progressKey, providerId, resumeEntry]);

  useEffect(() => {
    focusPlayer();
  }, [episode, focusPlayer, providerId, season]);

  useEffect(() => {
    let frameId = null;

    function handleMouseMove() {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        revealControlsRef.current(CONTROL_IDLE_DELAY);
      });
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      const nextFullscreenActive = Boolean(getFullscreenElement());
      setFullscreenActive(nextFullscreenActive);

      if (nextFullscreenActive) {
        setPanelOpen(false);
        revealControlsRef.current(CONTROL_IDLE_DELAY);
      }
    }

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (panelOpen) {
      clearControlsHideTimer();
      setControlsVisible(true);
      setWatchHubMode("episodes");
      setHubSeason(displayStateRef.current.season || season || 1);
      setHubEpisode(displayStateRef.current.episode || episode || 1);
      return undefined;
    }

    revealControlsRef.current(CONTROL_IDLE_DELAY);

    return () => {
      clearControlsHideTimer();
    };
  }, [episode, panelOpen, providerId, season]);

  useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      setPanelOpen(false);
      focusPlayer();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusPlayer, panelOpen]);

  useEffect(() => {
    if (!panelOpen || watchHubMode !== "episodes") {
      return;
    }

    setHubSeason(displayStateRef.current.season || season || 1);
    setHubEpisode(displayStateRef.current.episode || episode || 1);
  }, [displayEpisode, displaySeason, episode, panelOpen, season, watchHubMode]);

  useEffect(() => {
    if (!panelOpen || watchHubMode !== "episodes") {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      hubSeasonButtonRefs.current.get(Number(hubSeason))?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      hubEpisodeButtonRefs.current.get(Number(hubSelectedEpisode?.episode_number || hubEpisode))?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [hubEpisode, hubEpisodes.length, hubSeason, hubSelectedEpisode?.episode_number, panelOpen, seasonOptions.length, watchHubMode]);

  useEffect(() => {
    function flushProgress(payload, options = {}) {
      const sourceProvider = options.provider || payload.provider || providerId;
      const now = Date.now();
      const shouldThrottle = payload.event === "timeupdate" && !options.force && now - lastProgressFlushRef.current < 15000;

      lastProgressPayloadRef.current = {
        ...payload,
        id: Number(id),
        mediaType: payload.mediaType || mediaType,
        season: payload.season || displayStateRef.current.season,
        episode: payload.episode || displayStateRef.current.episode,
        snapshot: detail,
        provider: sourceProvider,
      };

      if (shouldThrottle) {
        return;
      }

      lastProgressFlushRef.current = now;

      recordProgress({
        ...lastProgressPayloadRef.current,
        currentTime: payload.currentTime ?? payload.watched,
        duration: payload.duration,
        provider: sourceProvider,
        snapshot: detail,
      });
    }

    function handleMessage(event) {
      const payload = readProviderMessage(event, {
        providerId,
        id,
        mediaType,
        season,
        episode,
      }, iframeRef.current?.contentWindow);
      if (!payload) return;

      if (payload.event === "nextepisode") {
        const nextData = payload.season === Number(season)
          ? seasonEpisodes.find((item) => item.episode_number === payload.episode) : null;
        advanceToEpisodeRef.current(payload.season, payload.episode, nextData || null);
        return;
      }

      // VidLove resumes via a live command once the current video reports a duration.
      const seedKey = `${providerId}:${progressKey}`;
      if (payload.cached && liveProgressKeyRef.current === seedKey) return;
      if (!payload.cached && payload.duration > 0 && Number.isFinite(payload.currentTime)) {
        liveProgressKeyRef.current = seedKey;
      }
      if (providerId === "vidlove" && !payload.cached && playbackSeed.key === seedKey &&
          resumeAppliedRef.current !== seedKey && Number(playbackSeed.resumeTime) > 15 &&
          payload.duration > 0 && ["play", "timeupdate", "playerstatus"].includes(payload.event)) {
        resumeAppliedRef.current = seedKey;
        iframeRef.current.contentWindow.postMessage(
          { type: "SET_TIME", time: Math.min(Math.floor(playbackSeed.resumeTime), payload.duration - 1) },
          getProviderMetadata(providerId).origin,
        );
        return;
      }

      const progress = resolveProviderProgress(payload, lastPlaybackMetricsRef.current);
      const fraction = resolvePlaybackFraction(progress || { event: payload.event });

      if (mediaType === "tv" && fraction !== null) {
        setNextEpisodePromptVisible(fraction >= 0.9);
      }
      if (progress) {
        lastPlaybackMetricsRef.current = progress;
        flushProgress(progress, {
          force: ["pause", "ended", "seeked"].includes(payload.event),
          provider: providerId,
        });
      }

      const availableNextEpisode = nextEpisodeRef.current;
      if (payload.event === "ended" && mediaType === "tv" &&
          autoplayNextEpisodeRef.current && availableNextEpisode &&
          !(introPlaybackRef.current?.key === seedKey && introPlaybackRef.current?.hasCredits)) {
        advanceToEpisodeRef.current(
          availableNextEpisode.season_number || season,
          availableNextEpisode.episode_number,
          availableNextEpisode,
        );
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    detail,
    episode,
    id,
    mediaType,
    providerId,
    recordProgress,
    season,
    seasonEpisodes,
    displaySeason,
    progressKey,
    playbackSeed.key,
    playbackSeed.resumeTime,
  ]);

  useEffect(() => {
    function flushBeforeExit() {
      const payload = lastProgressPayloadRef.current;

      if (!payload) {
        return;
      }

      lastProgressPayloadRef.current = null;
      recordProgressRef.current({
        ...payload,
        currentTime: payload.currentTime ?? payload.watched,
      });
    }

    function flushWhenHidden() {
      if (document.visibilityState === "hidden") flushBeforeExit();
    }
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushBeforeExit);
    window.addEventListener("beforeunload", flushBeforeExit);

    return () => {
      flushBeforeExit();
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushBeforeExit);
      window.removeEventListener("beforeunload", flushBeforeExit);
    };
  }, []);

  if ((detailQuery.loading && !detailQuery.data) || (detail && Number(detail.id) !== Number(id)) || !ready ||
      (mediaType === "tv" && detail && !detailQuery.error && !initialSeason && !initialEpisode && resumeSelectionId !== id) ||
      playbackSeed.key !== `${providerId}:${progressKey}`) {
    return <LoadingState fullScreen brand title="FlavFlix" description="Preparing your player." />;
  }

  if (detailQuery.error || !detail) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black px-6 text-sm text-rose-200">
        Failed to load this watch page: {detailQuery.error?.message || "Missing detail payload."}
      </div>
    );
  }

  if (!isPlayableMedia(detail, mediaType)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black px-6">
        <div className="max-w-xl rounded-[32px] border border-white/10 bg-[rgba(5,5,7,0.88)] p-8 text-center shadow-panel backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.24em] text-accent-200">Coming Soon</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{titleLabel}</h1>
          <p className="mt-4 text-sm leading-7 text-white/68">
            This title has not been released yet, so FlavFlix does not open the player for it.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <AppLink
              href={`/${mediaType}/${id}`}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black"
            >
              Open Details
            </AppLink>
            <AppLink
              href="/"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/82"
            >
              Back Home
            </AppLink>
          </div>
        </div>
      </div>
    );
  }

  const embedUrl = buildProviderUrl({
    providerId,
    mediaType,
    tmdbId: id,
    season,
    episode,
    resumeTime: playbackSeed.key === `${providerId}:${progressKey}` ? playbackSeed.resumeTime : undefined,
    settings,
  });

  function handleProviderSwitch(candidate) {
    setProviderId(candidate);
    setNextEpisodePromptVisible(false);
    setPanelOpen(false);
    const nextSeason = mediaType === "tv" ? displayStateRef.current.season : undefined;
    const nextEpisode = mediaType === "tv" ? displayStateRef.current.episode : undefined;
    syncUrl({
      mediaType,
      id,
      providerId: candidate,
      season: nextSeason,
      episode: nextEpisode,
    });
    focusPlayer();
  }

  function handleHubSeasonPreview(nextSeason) {
    const normalizedSeason = Number(nextSeason) || 1;
    const currentSeasonEpisode =
      normalizedSeason === Number(displayStateRef.current.season)
        ? displayStateRef.current.episode
        : 1;

    setHubSeason(normalizedSeason);
    setHubEpisode(currentSeasonEpisode);
    setWatchHubMode("episodes");
  }

  function handleHubEpisodePreview(nextEpisodeNumber) {
    setHubEpisode(Number(nextEpisodeNumber) || 1);
    setWatchHubMode("episodes");
    scrollWatchHubDetailIntoView(90);
  }

  function scrollWatchHubDetailIntoView(delay = 60) {
    if (typeof window === "undefined") {
      return;
    }

    window.setTimeout(() => {
      if (!window.matchMedia("(max-width: 767px)").matches) {
        return;
      }

      const scroller = watchHubScrollRef.current;
      const target = watchHubDetailRef.current;

      if (!scroller || !target) {
        return;
      }

      scroller.scrollTo({
        top: Math.max(target.offsetTop - 12, 0),
        behavior: "smooth",
      });
    }, delay);
  }

  function openWatchHubMode(nextMode) {
    setWatchHubMode(nextMode);

    scrollWatchHubDetailIntoView();
  }

  function playHubSelection() {
    if (mediaType === "tv") {
      advanceToEpisode(hubSeason, hubSelectedEpisode?.episode_number || hubEpisode || 1, hubSelectedEpisode || null);
    }

    setPanelOpen(false);
    focusPlayer();
  }

  function handleBackNavigationStart() {
    setNavigationPending(true);
  }

  const topChromeVisible = controlsVisible || panelOpen;
  const savedProgressReachedThreshold =
    Boolean(displayedProgress?.watchedComplete) || Number(displayedProgress?.percent || 0) >= 0.9;
  const creditsPlayback = introPlayback?.key === `${providerId}:${progressKey}` ? introPlayback : null;
  const creditsMode = mediaType === "tv" && Boolean(creditsPlayback?.hasCredits);
  const showNextEpisodeCta =
    mediaType === "tv" &&
    Boolean(nextEpisode) &&
    (creditsMode ? creditsPlayback.inCredits : nextEpisodePromptVisible || savedProgressReachedThreshold);
  const buttonConfig = getButtonConfig(providerId);
  const backBesideWatchOptions = buttonConfig.back.besideWatchOptions;
  const showHeaderShadow = buttonConfig.upperShadow;
  const showSidebarEpisodeNavigation = mediaType === "tv";
  const watchOptionsVisible = topChromeVisible;
  const saved = detail ? isSaved(id, mediaType) : false;
  const releaseDate = mediaType === "movie" ? detail?.release_date : detail?.first_air_date;
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : "TBA";
  const runtimeLabel =
    mediaType === "movie"
      ? formatRuntime(detail?.runtime)
      : formatRuntime(hubSelectedEpisode?.runtime || currentEpisode?.runtime || detail?.episode_run_time?.[0]);
  const overviewText = detail?.overview || currentEpisode?.overview || "No synopsis available.";
  const shortOverview = overviewText.length > 132 ? `${overviewText.slice(0, 129).trimEnd()}...` : overviewText;
  const castHighlights = detail?.credits?.cast?.slice(0, 14).filter(Boolean) || [];
  const hubProgressKey =
    mediaType === "tv"
      ? createProgressKey({
          mediaType: "tv",
          id,
          season: hubSeason,
          episode: hubSelectedEpisode?.episode_number || hubEpisode,
        })
      : progressKey;
  const hubProgress = activeProfileData.progress?.[hubProgressKey];
  const hubProgressPercent = toProgressPercent(hubProgress);
  const controlChromeClassName =
    "inline-flex min-h-[42px] items-center gap-2 rounded-full bg-[rgba(10,10,14,0.34)] px-3 py-2 text-xs font-semibold text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur-[18px] sm:min-h-[44px] sm:px-4 sm:text-sm";
  const backButton = (
    <AppLink
      href={`/${mediaType}/${id}`}
      onClick={handleBackNavigationStart}
      onMouseUp={releaseControlFocus}
      className={cn(controlChromeClassName, "shrink-0 border border-white/10")}
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </AppLink>
  );
  const watchHubCardClassName =
    "rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.065),rgba(255,255,255,0.022))] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.24)] sm:p-5";
  const watchHubSectionAnimationClassName = panelOpen
    ? "opacity-100 motion-reduce:transition-none"
    : "translate-y-4 opacity-0 motion-reduce:transition-none";

  return (
    <div
      ref={playerRootRef}
      tabIndex={-1}
      className="fixed inset-0 overflow-hidden bg-black text-white outline-none"
      onFocusCapture={() => revealControls(CONTROL_IDLE_DELAY)}
    >
      <PlayerShell
        key={`${activeProfile?.id || "visitor"}:${progressKey}`}
        previewKey={`flavflix-showcase-preview:${activeProfile?.id || "visitor"}:${progressKey}`}
        src={embedUrl}
        title={`${titleLabel} player`}
        fullViewport
        iframeRef={iframeRef}
      />

      <button
        type="button"
        onClick={toggleFlavflixFullscreen}
        style={getFullscreenButtonStyle(providerId)}
        className="absolute bottom-[var(--fullscreen-mobile-bottom)] right-[var(--fullscreen-mobile-right)] z-[60] h-[var(--fullscreen-mobile-height)] w-[var(--fullscreen-mobile-width)] cursor-pointer border-0 bg-transparent p-0 text-transparent outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 md:bottom-[var(--fullscreen-desktop-bottom)] md:right-[var(--fullscreen-desktop-right)] md:h-[var(--fullscreen-desktop-height)] md:w-[var(--fullscreen-desktop-width)]"
        aria-label={fullscreenActive ? "Exit fullscreen" : "Enter fullscreen"}
        aria-pressed={fullscreenActive}
        aria-keyshortcuts="F"
        title="Toggle fullscreen (F)"
      />
      {fullscreenError ? (
        <p role="status" className="absolute inset-x-16 top-4 z-[60] text-center text-sm text-white">{fullscreenError}</p>
      ) : null}

      <IntroSkipButton
        key={embedUrl}
        providerId={providerId}
        mediaType={mediaType}
        id={id}
        season={season}
        episode={episode}
        iframeRef={iframeRef}
        hidden={panelOpen || navigationPending}
        raised={showNextEpisodeCta}
        onPlaybackChange={(playback) => {
          const next = { ...playback, key: `${providerId}:${progressKey}` };
          introPlaybackRef.current = next;
          setIntroPlayback((previous) => previous?.key === next.key &&
            previous.hasCredits === next.hasCredits && previous.inCredits === next.inCredits &&
            previous.previewStart === next.previewStart && previous.paused === next.paused ? previous : next);
        }}
      />

      {navigationPending ? (
        <div className="absolute inset-0 z-[120] bg-[#050507ea] backdrop-blur-md">
          <LoadingState fullScreen brand title="FlavFlix" description="Opening details." />
        </div>
      ) : null}

      <div
        className={cn("absolute inset-0 z-10 hidden md:block", topChromeVisible ? "pointer-events-none" : "pointer-events-auto")}
        onMouseEnter={() => revealControls(CONTROL_IDLE_DELAY)}
        onMouseMove={() => revealControls(CONTROL_IDLE_DELAY)}
        onMouseDown={() => revealControls(CONTROL_IDLE_DELAY)}
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-[#020204f2] via-[#020204c2] to-transparent transition duration-300",
          topChromeVisible && showHeaderShadow ? "opacity-100" : "opacity-0",
        )}
      />

      {!backBesideWatchOptions ? <div
        style={getHeaderButtonStyle(providerId, "back")}
        className={cn(
          "absolute left-[var(--header-mobile-left)] right-[var(--header-mobile-right)] top-0 z-[33] flex items-center gap-3 px-0 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:left-[var(--header-desktop-left)] md:right-[var(--header-desktop-right)] md:py-4",
          topChromeVisible ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0",
          topChromeVisible ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        {backButton}
      </div> : null}

      <div
        style={getHeaderButtonStyle(providerId, "watchOptions")}
        className={cn(
          "absolute left-[var(--header-mobile-left)] right-[var(--header-mobile-right)] top-0 z-[33] flex [flex-direction:var(--header-mobile-direction)] items-center gap-3 px-0 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:left-[var(--header-desktop-left)] md:right-[var(--header-desktop-right)] md:[flex-direction:var(--header-desktop-direction)] md:py-4",
          watchOptionsVisible ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0",
          watchOptionsVisible ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        {backBesideWatchOptions ? backButton : null}
        <button
          type="button"
          onClick={() => {
            setPanelOpen((current) => !current);
            revealControls(CONTROL_IDLE_DELAY);
            focusPlayer();
          }}
          onMouseUp={releaseControlFocus}
          className={cn(controlChromeClassName, "shrink-0 border border-white/10")}
        >
          {panelOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Watch Options
        </button>
      </div>

      {panelOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-[34] bg-[#02020472] backdrop-blur-[2px] transition-opacity duration-200"
          onClick={() => {
            setPanelOpen(false);
            focusPlayer();
          }}
          aria-label="Close watch options"
        />
      ) : null}

      <section
        className={cn(
          "absolute inset-x-2 bottom-[calc(1rem+env(safe-area-inset-bottom))] top-[calc(4.25rem+env(safe-area-inset-top))] z-40 mx-auto max-w-[1540px] rounded-[30px] border border-white/14 bg-[linear-gradient(135deg,rgba(19,20,24,0.88),rgba(8,9,12,0.76))] p-3 shadow-[0_34px_120px_rgba(0,0,0,0.58)] ring-1 ring-white/[0.035] backdrop-blur-[30px] transition duration-200 ease-out sm:inset-x-6 sm:p-5 md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:top-auto md:rounded-[34px] xl:bottom-[calc(5.1rem+env(safe-area-inset-bottom))]",
          panelOpen ? "opacity-100" : "pointer-events-none translate-y-5 scale-[0.985] opacity-0",
        )}
        aria-label="Watch options"
      >
        <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.13),transparent_34%),radial-gradient(circle_at_55%_120%,rgba(227,31,92,0.12),transparent_42%)]" />
        <div
          ref={watchHubScrollRef}
          className="relative grid h-full max-h-full gap-3 overflow-y-auto pr-1 sm:gap-4 md:h-auto md:max-h-[min(68vh,31rem)] lg:max-h-none lg:grid-cols-[1.08fr_0.82fr_2.12fr] lg:overflow-visible lg:pr-0 xl:gap-5"
        >
          <div
            className={cn(
              watchHubCardClassName,
              "flex flex-col justify-between transition duration-200 ease-out",
              watchHubSectionAnimationClassName,
            )}
            style={{ transitionDelay: panelOpen ? "20ms" : "0ms" }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/54">Now Watching</p>
              <h2 className="mt-4 line-clamp-2 text-2xl font-semibold text-white sm:text-3xl">{title || "Loading title"}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/68">
                {mediaType === "tv" ? <span>Season {displaySeason} | Episode {displayEpisode}</span> : <span>{releaseYear}</span>}
                {runtimeLabel ? <span>{runtimeLabel}</span> : null}
                {detail?.adult ? (
                  <span className="rounded-full border border-white/12 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-white/62">
                    18+
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={playHubSelection}
                className="group inline-flex flex-1 items-center gap-3 rounded-[22px] border border-accent-200/20 bg-[linear-gradient(135deg,rgba(160,24,55,0.95),rgba(72,12,30,0.88))] px-4 py-3.5 text-left text-white shadow-[0_22px_54px_rgba(105,13,36,0.34)] transition hover:scale-[1.01]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/18">
                  <PlayCircle className="h-5 w-5 fill-current" />
                </span>
                <span>
                  <span className="block text-base font-semibold">{resumeEntry || hubProgress ? "Resume" : "Play"}</span>
                  <span className="mt-0.5 block text-xs text-white/72">
                    {resumeEntry?.currentTime ? formatSeconds(resumeEntry.currentTime) : hubProgress?.currentTime ? formatSeconds(hubProgress.currentTime) : "Start now"}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => detail && toggleSaved(detail, mediaType)}
                aria-pressed={saved}
                className={cn(
                  "inline-flex h-[68px] w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-[22px] border text-xs transition",
                  saved
                    ? "border-accent-200/30 bg-accent-400/18 text-accent-100 shadow-[0_14px_34px_rgba(160,24,55,0.22)]"
                    : "border-white/10 bg-white/[0.045] text-white/74 hover:bg-white/[0.075]",
                )}
              >
                {saved ? <Check className="h-5 w-5 text-accent-200" /> : <Plus className="h-5 w-5" />}
                {saved ? "In List" : "My List"}
              </button>
            </div>

            <div className={cn("mt-5 rounded-[22px] border border-white/8 bg-black/20 p-4", mediaType === "movie" && "hidden sm:block")}>
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/48" />
                <p className="line-clamp-3 text-sm leading-6 text-white/66">{shortOverview}</p>
              </div>
              <button
                type="button"
                onClick={() => openWatchHubMode(mediaType === "movie" ? "cast" : "more")}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent-200"
              >
                {mediaType === "movie" ? "Cast" : "More"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className={cn(
              watchHubCardClassName,
              "transition duration-200 ease-out",
              watchHubSectionAnimationClassName,
            )}
            style={{ transitionDelay: panelOpen ? "70ms" : "0ms" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/54">Sources</p>
            <div className="mt-4 grid gap-2">
              {providerOrder.map((candidate, index) => {
                const metadata = getProviderMetadata(candidate);
                const active = candidate === providerId;
                const providerGlyph = metadata.label?.charAt(0) || candidate.charAt(0);

                return (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => handleProviderSwitch(candidate)}
                    onMouseUp={releaseControlFocus}
                    className={cn(
                      "group relative overflow-hidden rounded-[18px] border px-3.5 py-3 text-left transition duration-200",
                      panelOpen ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0",
                      active
                        ? "border-accent-300/34 bg-[linear-gradient(135deg,rgba(100,16,39,0.96),rgba(56,12,25,0.9))] text-white shadow-[0_14px_36px_rgba(100,12,35,0.28)]"
                        : "border-white/10 bg-black/20 text-white/78 hover:border-white/18 hover:bg-white/[0.055]",
                    )}
                    style={{ transitionDelay: panelOpen ? `${100 + index * 26}ms` : "0ms" }}
                  >
                    {metadata.audioLanguage === "it" ? (
                      <svg viewBox="0 0 3 2" role="img" aria-label="Italian audio"
                        className="absolute right-2 top-2 h-2.5 w-4 overflow-hidden rounded-[2px]">
                        <title>Italian audio</title>
                        <path fill="#009246" d="M0 0h1v2H0z" />
                        <path fill="#fff" d="M1 0h1v2H1z" />
                        <path fill="#ce2b37" d="M2 0h1v2H2z" />
                      </svg>
                    ) : null}
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black", active ? "border-white/18 bg-white/18" : "border-white/10 bg-white/[0.055]")}>
                        {providerGlyph}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{metadata.label}</span>
                        <span className="mt-0.5 block text-[10px] uppercase tracking-[0.22em] text-white/44">
                          {metadata.supportsProgress ? "Synced Progress" : "Basic Playback"}
                        </span>
                      </span>
                      <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-emerald-300 shadow-[0_0_14px_rgba(110,255,180,0.82)]" : "bg-white/18")} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            ref={watchHubDetailRef}
            className={cn(
              watchHubCardClassName,
              "min-w-0 transition duration-200 ease-out",
              watchHubMode === "cast" && "md:border-transparent md:bg-none md:p-0 md:shadow-none",
              watchHubSectionAnimationClassName,
            )}
            style={{ transitionDelay: panelOpen ? "115ms" : "0ms" }}
          >
            {watchHubMode === "cast" ? (
              <div
                key="cast"
                className="watch-hub-mode-panel fixed inset-x-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] top-[calc(3.75rem+env(safe-area-inset-top))] z-[70] overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(145deg,rgba(13,14,19,0.97),rgba(6,7,10,0.94))] p-4 shadow-[0_34px_120px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:relative md:inset-auto md:z-auto md:min-h-full md:overflow-visible md:rounded-none md:border-0 md:bg-none md:p-0 md:shadow-none md:backdrop-blur-none"
              >
                <button
                  type="button"
                  onClick={() => setWatchHubMode("episodes")}
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 p-0 text-white/76 shadow-[0_12px_32px_rgba(0,0,0,0.34)] transition hover:bg-white/[0.06] md:right-0 md:top-0 md:h-auto md:w-auto md:p-2"
                  aria-label="Back"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/54">Cast</p>
                <h3 className="mt-4 pr-10 text-xl font-semibold text-white">{title}</h3>
                {castHighlights.length ? (
                  <div className="scrollbar-none mt-5 grid max-h-[calc(100%-5.75rem)] grid-cols-2 gap-3 overflow-y-auto pb-4 pr-1 md:flex md:max-h-none md:gap-4 md:overflow-x-auto md:overflow-y-visible md:pb-2 md:pr-0">
                    {castHighlights.map((person) => {
                      const CastItem = person.id ? AppLink : "div";
                      const castItemProps = person.id
                        ? {
                            href: `/person/${person.id}`,
                            onClick: handleBackNavigationStart,
                          }
                        : {};

                      return (
                        <CastItem
                          key={person.id || person.credit_id}
                          {...castItemProps}
                          className="group min-w-0 rounded-[20px] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent-200/70 md:w-[8.6rem] md:shrink-0 md:rounded-[22px]"
                        >
                          <div className="aspect-[2/3] overflow-hidden rounded-[20px] bg-white/[0.06] shadow-[0_18px_42px_rgba(0,0,0,0.26)] transition group-hover:shadow-[0_24px_54px_rgba(0,0,0,0.38)] md:rounded-[22px]">
                            {person.profile_path ? (
                              <img
                                src={buildPosterUrl(person.profile_path)}
                                alt={person.name}
                                className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.035]"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-2xl font-semibold text-white/34">
                                {person.name?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                          <p className="mt-2 line-clamp-1 text-sm font-semibold text-white md:mt-3 md:text-base">{person.name}</p>
                          {person.character ? <p className="line-clamp-1 text-xs text-white/48 md:text-sm">{person.character}</p> : null}
                        </CastItem>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-7 text-white/62">Cast details are not available yet.</p>
                )}
              </div>
            ) : watchHubMode === "more" ? (
              <div key="more" className="watch-hub-mode-panel relative min-h-full">
                <button
                  type="button"
                  onClick={() => setWatchHubMode("episodes")}
                  className="absolute right-0 top-0 rounded-full border border-white/10 bg-black/26 p-2 text-white/70 transition hover:bg-white/[0.06]"
                  aria-label="Close about"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/54">About</p>
                <h3 className="mt-4 pr-10 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">{overviewText}</p>
                {castHighlights.length ? (
                  <button
                    type="button"
                    onClick={() => openWatchHubMode("cast")}
                    className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                  >
                    Cast
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : showSidebarEpisodeNavigation ? (
              <div key="episodes" className="watch-hub-mode-panel">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/54">Episodes</p>
                <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-1">
                  {seasonOptions.map((item) => {
                    const active = Number(item.season_number) === Number(hubSeason);

                    return (
                      <button
                        key={item.id}
                        ref={(node) => {
                          if (node) {
                            hubSeasonButtonRefs.current.set(Number(item.season_number), node);
                          } else {
                            hubSeasonButtonRefs.current.delete(Number(item.season_number));
                          }
                        }}
                        type="button"
                        onClick={() => handleHubSeasonPreview(item.season_number)}
                        className={cn(
                          "shrink-0 rounded-[16px] border px-4 py-2.5 text-sm font-semibold transition",
                          active ? "border-accent-300/35 bg-[#6f1430] text-white" : "border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.07]",
                        )}
                      >
                        Season {item.season_number}
                      </button>
                    );
                  })}
                </div>

                <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto border-t border-white/8 pt-4">
                  {(hubEpisodes.length ? hubEpisodes : seasonEpisodes).map((item) => {
                    const active = Number(item.episode_number) === Number(hubSelectedEpisode?.episode_number);

                    return (
                      <button
                        key={item.id || item.episode_number}
                        ref={(node) => {
                          if (node) {
                            hubEpisodeButtonRefs.current.set(Number(item.episode_number), node);
                          } else {
                            hubEpisodeButtonRefs.current.delete(Number(item.episode_number));
                          }
                        }}
                        type="button"
                        onClick={() => handleHubEpisodePreview(item.episode_number)}
                        className={cn(
                          "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-[14px] border px-3 text-sm font-bold transition",
                          active ? "border-accent-300/38 bg-[#751631] text-white shadow-[0_10px_26px_rgba(95,11,32,0.24)]" : "border-white/9 bg-black/22 text-white/70 hover:bg-white/[0.06]",
                        )}
                      >
                        {item.episode_number}
                      </button>
                    );
                  })}
                </div>

                <div className="relative mt-4 min-h-[210px] overflow-hidden rounded-[24px] border border-white/10 bg-black/32">
                  <div className="absolute inset-0">
                    <img
                      src={buildImageUrl(hubSelectedEpisode?.still_path || detail?.backdrop_path || detail?.poster_path, "w780")}
                      alt={hubSelectedEpisode?.name || "Selected episode"}
                      className="h-full w-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,4,7,0.9),rgba(3,4,7,0.55)_48%,rgba(3,4,7,0.18)),linear-gradient(0deg,rgba(3,4,7,0.84),transparent_58%)]" />
                  </div>
                  <div className="relative z-10 flex min-h-[210px] flex-col justify-between p-4 sm:p-5">
                    <div className="max-w-[34rem]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-lg font-semibold text-white">
                            {hubSelectedEpisode?.episode_number ? `${hubSelectedEpisode.episode_number}. ` : ""}
                            {hubSelectedEpisode?.name || "Select an episode"}
                          </h3>
                          <p className="mt-1 text-sm text-white/62">
                            {formatRuntime(hubSelectedEpisode?.runtime) || "Runtime TBA"}
                            {hubProgress ? ` | ${Math.round(hubProgress.percent * 100)}% watched` : ""}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/72">
                        {hubSelectedEpisode?.overview || "No episode synopsis is available from TMDB for this episode yet."}
                      </p>
                    </div>
                    <div>
                      <div className="mt-5 flex items-end justify-between gap-4">
                        <button
                          type="button"
                          onClick={playHubSelection}
                          className="rounded-[16px] border border-accent-200/24 bg-[#7b1734]/92 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(88,10,31,0.3)]"
                        >
                          {hubProgress?.currentTime ? `Resume ${formatSeconds(hubProgress.currentTime)}` : "Play"}
                        </button>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/48">
                          Season {hubSeason}
                        </span>
                      </div>
                      {hubProgressPercent > 0 ? (
                        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.12]">
                          <div className="h-full rounded-full bg-[#ff2749]" style={{ width: `${hubProgressPercent}%` }} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key="movie" className="watch-hub-mode-panel flex min-h-full flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/54">Movie</p>
                <h3 className="mt-4 text-2xl font-semibold text-white">{title}</h3>
                <p className="mt-4 line-clamp-4 text-sm leading-7 text-white/68">{overviewText}</p>
                <button
                  type="button"
                  onClick={() => openWatchHubMode("cast")}
                  className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                >
                  Cast
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

        </div>
        <p className="px-6 py-3 text-[10px] text-white/40">
          Skip times: <a href="https://skipdb.tv/" target="_blank" rel="noreferrer" className="underline hover:text-white/70">SkipDB</a>
          {" ("}<a href="https://skipdb.tv/license" target="_blank" rel="noreferrer" className="underline hover:text-white/70">ODbL</a>{") / "}
          <a href="https://theintrodb.org/" target="_blank" rel="noreferrer" className="underline hover:text-white/70">TheIntroDB</a>
        </p>
      </section>

      {creditsMode && nextEpisode ? (
        <CreditsNextEpisode
          key={embedUrl}
          visible={showNextEpisodeCta && !panelOpen && !navigationPending}
          paused={Boolean(creditsPlayback?.paused)}
          previewStart={creditsPlayback?.previewStart ?? null}
          canSeek={Boolean(buildProviderSeekCommand(providerId, 0))}
          season={nextEpisode.season_number || displaySeason}
          episode={nextEpisode.episode_number}
          onNext={() => {
            advanceToEpisode(nextEpisode.season_number || displayStateRef.current.season, nextEpisode.episode_number, nextEpisode);
            revealControls(CONTROL_IDLE_DELAY);
          }}
          onPreview={(time) => {
            const command = buildProviderSeekCommand(providerId, time);
            if (command) iframeRef.current?.contentWindow?.postMessage(command, getProviderMetadata(providerId).origin);
          }}
        />
      ) : showNextEpisodeCta && !panelOpen ? (
        <div
          className={cn(
            "absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 z-[55] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:bottom-28 md:right-8",
            topChromeVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
          )}
          onMouseMove={() => revealControls(CONTROL_IDLE_DELAY)}
          onMouseEnter={() => revealControls(CONTROL_IDLE_DELAY)}
          onMouseDown={() => revealControls(CONTROL_IDLE_DELAY)}
        >
          <button
            type="button"
            onClick={() => {
              advanceToEpisode(
                nextEpisode.season_number || displayStateRef.current.season,
                nextEpisode.episode_number,
                nextEpisode,
              );
              revealControls(CONTROL_IDLE_DELAY);
            }}
            onMouseMove={() => revealControls(CONTROL_IDLE_DELAY)}
            onMouseUp={releaseControlFocus}
            className="inline-flex items-center gap-3 rounded-full border border-accent-300/34 bg-[rgba(58,10,25,0.88)] px-4 py-3 text-sm font-semibold text-white shadow-[0_24px_62px_rgba(0,0,0,0.48)] backdrop-blur-xl transition hover:scale-[1.02] hover:bg-[rgba(74,14,33,0.94)] sm:px-5"
          >
            <SkipForward className="h-4 w-4" />
            Next Episode
            <span className="text-white/62">
              S{nextEpisode.season_number || displayStateRef.current.season} E{nextEpisode.episode_number}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
