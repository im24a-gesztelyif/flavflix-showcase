"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Layers3,
  Play,
  Plus,
  Star,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { AppLink } from "@/components/app-link";
import { MediaRail } from "@/components/media-rail";
import { useAppState } from "@/lib/app-state";
import { createProgressKey, getWatchHref, isPlayableMedia } from "@/lib/media";
import { parseAwardsSummary } from "@/lib/awards";
import { omdbClientGet } from "@/lib/omdb-client";
import { useTmdbConfiguration, useTmdbQuery } from "@/hooks/use-tmdb-query";
import { buildImageUrl, buildPosterUrl, formatFullDate, formatRuntime, formatVote } from "@/lib/utils";

function pickTrailer(videos = []) {
  return (
    videos.find((video) => video.site === "YouTube" && video.type === "Trailer" && video.official) ||
    videos.find((video) => video.site === "YouTube" && video.type === "Trailer") ||
    null
  );
}

function toProgressPercent(progressEntry) {
  const normalized = Number(progressEntry?.percent || 0);
  return Math.max(0, Math.min(100, Math.round(normalized * 100)));
}

function formatOmdbVotes(value) {
  if (!value || value === "N/A") {
    return null;
  }

  const parsed = Number(String(value).replace(/,/g, ""));

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Intl.NumberFormat("en-US").format(parsed);
}

function shortenRatingSource(source) {
  if (source === "Internet Movie Database") {
    return "IMDb";
  }

  return source;
}

function normalizeOmdbRatings(payload) {
  if (!payload) {
    return [];
  }

  const ratingsBySource = new Map();

  function addRating(source, value, extras = {}) {
    if (!source || !value || value === "N/A" || ratingsBySource.has(source)) {
      return;
    }

    ratingsBySource.set(source, {
      source,
      label: shortenRatingSource(source),
      value,
      votes: extras.votes || null,
    });
  }

  (payload.Ratings || []).forEach((entry) => {
    addRating(entry.Source, entry.Value, {
      votes: entry.Source === "Internet Movie Database" ? formatOmdbVotes(payload.imdbVotes) : null,
    });
  });

  if (payload.imdbRating && payload.imdbRating !== "N/A") {
    addRating("Internet Movie Database", `${payload.imdbRating}/10`, {
      votes: formatOmdbVotes(payload.imdbVotes),
    });
  }

  if (payload.Metascore && payload.Metascore !== "N/A") {
    addRating("Metacritic", `${payload.Metascore}/100`);
  }

  return Array.from(ratingsBySource.values());
}

function pickPreferredTmdbImage(entries = [], language) {
  const languageKey = language?.split("-")?.[0];

  return (
    entries.find((entry) => entry.iso_639_1 === languageKey) ||
    entries.find((entry) => entry.iso_639_1 === "en") ||
    entries.find((entry) => entry.iso_639_1 === null) ||
    entries[0] ||
    null
  );
}

function AwardsPanel({ summary }) {
  const awards = parseAwardsSummary(summary);

  if (!awards) {
    return null;
  }

  return (
    <section className="surface relative overflow-hidden !border-[#f1cf67]/35">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(241,207,103,0.15),transparent_30%),radial-gradient(circle_at_96%_100%,rgba(255,255,255,0.06),transparent_38%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f1cf67]/55 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#f1cf67]/20 bg-[#f1cf67]/10 text-[#f1cf67] shadow-[0_0_28px_rgba(241,207,103,0.12)]">
            <Trophy className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-white sm:text-xl">Awards</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
          {awards.oscars !== null ? (
            <span className="rounded-full border border-[#f1cf67]/30 bg-[#f1cf67]/10 px-3 py-1.5 text-sm text-white/76">
              <span className="mr-2 text-[10px] uppercase tracking-[0.2em] text-[#f1cf67]/72">Oscars</span>
              <strong className="font-semibold text-white">{awards.oscars.toLocaleString("en-US")}</strong>
            </span>
          ) : null}
          {awards.wins !== null ? (
            <span className="rounded-full border border-[#f1cf67]/20 bg-[#f1cf67]/[0.045] px-3 py-1.5 text-sm text-white/76">
              <span className="mr-2 text-[10px] uppercase tracking-[0.2em] text-white/38">Wins</span>
              <strong className="font-semibold text-white">{awards.wins.toLocaleString("en-US")}</strong>
            </span>
          ) : null}
          {awards.nominations !== null ? (
            <span className="rounded-full border border-[#f1cf67]/20 bg-[#f1cf67]/[0.045] px-3 py-1.5 text-sm text-white/76">
              <span className="mr-2 text-[10px] uppercase tracking-[0.2em] text-white/38">Nominations</span>
              <strong className="font-semibold text-white">{awards.nominations.toLocaleString("en-US")}</strong>
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading details" className="space-y-8 motion-safe:animate-pulse">
      <div className="flex min-h-[70svh] flex-col justify-end gap-5 pb-8">
        <div className="h-24 w-2/3 max-w-lg rounded bg-white/10" />
        <div className="h-5 w-48 rounded bg-white/10" />
        <div className="h-20 w-full max-w-2xl rounded bg-white/5" />
        <div className="h-12 w-64 rounded bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {[0, 1, 2, 3].map((key) => <div key={key} className="aspect-video rounded bg-white/5" />)}
      </div>
    </div>
  );
}

function OmdbRatingsPanel({ payload, loading, error, compact = false }) {
  const ratings = normalizeOmdbRatings(payload);

  if (loading) {
    return (
      <div className={compact ? "space-y-2" : "space-y-2.5"}>
        {Array.from({ length: compact ? 3 : 3 }).map((_, index) => (
          <div key={index}>
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="mt-2 h-5 w-16 animate-pulse rounded-full bg-white/[0.12]" />
            {!compact ? <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-white/[0.08]" /> : null}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-white/52">External ratings are unavailable right now.</p>;
  }

  if (!ratings.length) {
    return <p className="text-sm text-white/52">No OMDb ratings are available for this title.</p>;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {ratings.map((rating) => (
        <div key={rating.source} className="flex items-baseline justify-between gap-4 border-b border-white/8 pb-2 last:border-b-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-[0.2em] text-white/42">{rating.label}</p>
            {rating.votes ? <p className="mt-1 text-xs text-white/45">{rating.votes} ratings</p> : null}
          </div>
          <p className="shrink-0 text-lg font-semibold text-white">{rating.value}</p>
        </div>
      ))}
    </div>
  );
}

function EpisodeRatingsLine({ payload, loading, error }) {
  const ratings = normalizeOmdbRatings(payload);

  if (loading) {
    return <p className="text-xs text-white/40">Ratings loading...</p>;
  }

  if (error || !ratings.length) {
    return <p className="text-xs text-white/35">Ratings unavailable</p>;
  }

  return (
    <div className="scrollbar-none flex items-center gap-3 overflow-x-auto whitespace-nowrap text-xs text-white/48" aria-label="Episode ratings">
      {ratings.map((rating, index) => (
        <span key={rating.source} className="inline-flex shrink-0 items-baseline gap-1.5">
          {index > 0 ? <span className="mr-1 text-white/20" aria-hidden="true">&middot;</span> : null}
          <span>{rating.label}</span>
          <strong className="font-semibold text-white/82">{rating.value}</strong>
          {rating.votes ? <span className="text-white/32">({rating.votes})</span> : null}
        </span>
      ))}
    </div>
  );
}

export function DetailScreen(props) {
  return <DetailScreenContent key={`${props.mediaType}:${props.id}`} {...props} />;
}

function DetailScreenContent({ mediaType, id }) {
  const { settings, isSaved, toggleSaved, activeProfileData, clearMediaActivity, recordProgress } = useAppState();
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerNotice, setTrailerNotice] = useState("");
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [omdbDetail, setOmdbDetail] = useState(null);
  const [omdbDetailLoading, setOmdbDetailLoading] = useState(false);
  const [omdbDetailError, setOmdbDetailError] = useState("");
  const [episodeRatings, setEpisodeRatings] = useState({});
  const [visibleCastCount, setVisibleCastCount] = useState(8);
  const [castScrollState, setCastScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const trailerCloseButtonRef = useRef(null);
  const selectedSeasonTouchedRef = useRef(false);
  const castHighlightsRef = useRef(null);
  const { data: configuration } = useTmdbConfiguration();
  const detailPath = `${mediaType}/${id}`;
  const detailQuery = useTmdbQuery(detailPath, {
    language: settings.language,
    append_to_response: `credits,images,videos,recommendations,similar,external_ids,${mediaType === "movie" ? "release_dates" : "content_ratings"}`,
  });
  const titleImagesQuery = useTmdbQuery(
    `${mediaType}/${id}/images`,
    {
      include_image_language: `${settings.language},en,null`,
    },
    {
      enabled: Boolean(detailQuery.data),
    },
  );
  const seasonQuery = useTmdbQuery(
    `tv/${id}/season/${selectedSeason}`,
    {
      language: settings.language,
    },
    {
      enabled: mediaType === "tv" && Boolean(selectedSeason),
    },
  );
  const detail = detailQuery.data;
  const collectionId = detail?.belongs_to_collection?.id;
  const collectionQuery = useTmdbQuery(
    `collection/${collectionId}`,
    {
      language: settings.language,
    },
    {
      enabled: Boolean(collectionId),
    },
  );
  const selectedSeasonData = useMemo(
    () => (mediaType === "tv" && seasonQuery.data?.season_number === Number(selectedSeason) ? seasonQuery.data : null),
    [mediaType, seasonQuery.data, selectedSeason],
  );
  const selectedSeasonEpisodes = useMemo(() => selectedSeasonData?.episodes || [], [selectedSeasonData?.episodes]);
  const relevantProgress = Object.values(activeProfileData.progress || {})
    .filter((entry) => entry.id === Number(id) && entry.mediaType === mediaType)
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  const hasHistoryActivity = (activeProfileData.history || []).some(
    (entry) => entry.id === Number(id) && entry.mediaType === mediaType,
  );
  const resumeEntry = relevantProgress[0];
  const hasTrackedActivity = Boolean(resumeEntry || hasHistoryActivity);
  const seasonOptions = useMemo(
    () => detail?.seasons?.filter((season) => season.season_number > 0) || [],
    [detail?.seasons],
  );
  const omdbLookupId = detail?.imdb_id || detail?.external_ids?.imdb_id || null;

  useEffect(() => {
    if (!trailerOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    trailerCloseButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setTrailerOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [trailerOpen]);

  useEffect(() => {
    const element = castHighlightsRef.current;
    if (!element || !detail?.credits?.cast?.length) {
      return undefined;
    }

    let frameId = null;

    function updateState() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        const nextCanScrollLeft = element.scrollLeft > 8;
        const nextCanScrollRight = element.scrollWidth > element.clientWidth + 8 && element.scrollLeft + element.clientWidth < element.scrollWidth - 8;

        setCastScrollState((current) =>
          current.canScrollLeft === nextCanScrollLeft && current.canScrollRight === nextCanScrollRight
            ? current
            : {
                canScrollLeft: nextCanScrollLeft,
                canScrollRight: nextCanScrollRight,
              },
        );
      });
    }

    updateState();
    element.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      element.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [detail?.credits?.cast?.length, visibleCastCount]);

  useEffect(() => {
    let cancelled = false;

    if (!omdbLookupId) {
      setOmdbDetail(null);
      setOmdbDetailLoading(false);
      setOmdbDetailError("");
      return undefined;
    }

    setOmdbDetailLoading(true);
    setOmdbDetailError("");

    omdbClientGet({ imdbId: omdbLookupId })
      .then((data) => {
        if (!cancelled) {
          setOmdbDetail(data);
          setOmdbDetailLoading(false);
        }
      })
      .catch((lookupError) => {
        if (!cancelled) {
          setOmdbDetail(null);
          setOmdbDetailLoading(false);
          setOmdbDetailError(lookupError.message || "OMDb ratings are unavailable right now.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [omdbLookupId]);

  useEffect(() => {
    if (mediaType !== "tv" || !seasonOptions.length) {
      return;
    }

    const resumeSeasonNumber = seasonOptions.find(
      (season) => season.season_number === Number(resumeEntry?.season),
    )?.season_number;
    const fallbackSeasonNumber = resumeSeasonNumber || seasonOptions[0]?.season_number || 1;
    const selectedSeasonExists = seasonOptions.some((season) => season.season_number === Number(selectedSeason));

    if (!selectedSeasonTouchedRef.current && Number(selectedSeason) !== Number(fallbackSeasonNumber)) {
      setSelectedSeason(fallbackSeasonNumber);
      return;
    }

    if (!selectedSeasonExists) {
      setSelectedSeason(fallbackSeasonNumber);
    }
  }, [mediaType, resumeEntry?.season, seasonOptions, selectedSeason]);

  useEffect(() => {
    if (!omdbLookupId || mediaType !== "tv" || !selectedSeasonEpisodes.length) {
      return undefined;
    }

    let cancelled = false;
    const lookups = selectedSeasonEpisodes.map((episode) => {
      const key = `${omdbLookupId}:${selectedSeason}:${episode.episode_number}`;
      setEpisodeRatings((current) => current[key] ? current : { ...current, [key]: { loading: true } });

      return omdbClientGet({ imdbId: omdbLookupId, season: selectedSeason, episode: episode.episode_number })
        .then((data) => {
          if (!cancelled) setEpisodeRatings((current) => ({ ...current, [key]: { data, loading: false } }));
        })
        .catch(() => {
          if (!cancelled) setEpisodeRatings((current) => ({ ...current, [key]: { loading: false, error: "Ratings unavailable." } }));
        });
    });

    Promise.allSettled(lookups);
    return () => { cancelled = true; };
  }, [mediaType, omdbLookupId, selectedSeason, selectedSeasonEpisodes]);

  if (detailQuery.loading && !detailQuery.data) {
    return <DetailSkeleton />;
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <div className="surface p-6 text-sm text-rose-200">
        Failed to load this title: {detailQuery.error?.message || "Missing TMDB payload."}
      </div>
    );
  }

  const title = mediaType === "movie" ? detail.title : detail.name;
  const saved = isSaved(id, mediaType);
  const collection = collectionQuery.data || detail.belongs_to_collection || null;
  const productionCompanies = (detail.production_companies || []).filter((company) => company.logo_path).slice(0, 2);
  const directors = Array.from(new Map((detail.credits?.crew || []).filter((person) => person.job === "Director").map((person) => [person.id, person])).values());
  const certificationEntries = mediaType === "movie" ? detail.release_dates?.results : detail.content_ratings?.results;
  const certificationFor = (region) => {
    const entry = certificationEntries?.find((item) => item.iso_3166_1 === region);
    return mediaType === "movie" ? entry?.release_dates?.find((release) => release.certification)?.certification : entry?.rating;
  };
  const ageRating = certificationFor(settings.region) || certificationFor("US");
  const runtime = detail.runtime || detail.episode_run_time?.[0] || detail.last_episode_to_air?.runtime;
  const movieProgress = mediaType === "movie"
    ? activeProfileData.progress?.[createProgressKey({ mediaType: "movie", id })]
    : null;
  const movieWatched = Boolean(movieProgress?.watchedComplete || Number(movieProgress?.percent) >= 0.9);
  const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const watchHref = getWatchHref(mediaType, id);
  const trailer = pickTrailer(detail.videos?.results || []);
  const dateLabel = formatFullDate(detail.release_date || detail.first_air_date);
  const playable = isPlayableMedia(detail, mediaType);
  const trailerEmbedUrl = trailer ? `https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0` : null;
  const heroBackdrop =
    detail.images?.backdrops?.find((entry) => entry.iso_639_1 === null)?.file_path ||
    detail.backdrop_path ||
    detail.images?.backdrops?.[0]?.file_path ||
    detail.poster_path;
  const titleLogoEntry = pickPreferredTmdbImage(titleImagesQuery.data?.logos || [], settings.language);
  const genreSummary = detail.genres?.map((genre) => genre.name).join(", ");
  const mediaLabel = mediaType === "movie" ? "Film" : "Series";
  const today = new Date().toISOString().slice(0, 10);
  const releasedSeasonEpisodes = selectedSeasonEpisodes.filter((episode) => episode.air_date && episode.air_date <= today);
  const seasonWatched = Boolean(releasedSeasonEpisodes.length) && releasedSeasonEpisodes.every((episode) => {
    const entry = activeProfileData.progress?.[createProgressKey({ mediaType: "tv", id, season: selectedSeason, episode: episode.episode_number })];
    return entry?.watchedComplete || Number(entry?.percent) >= 0.9;
  });

  function openTrailer() {
    if (!trailerEmbedUrl) {
      setTrailerNotice("No trailer is available for this title right now.");
      return;
    }

    setTrailerNotice("");
    setTrailerOpen(true);
  }

  function markMovieWatched() {
    const duration = Math.max(1, Number(runtime) || 1) * 60;
    recordProgress({ id, mediaType: "movie", currentTime: duration, duration, percent: 1, snapshot: detail });
  }

  function markEpisodeWatched(episode) {
    const duration = Math.max(1, Number(episode.runtime || runtime) || 1) * 60;
    recordProgress({
      id,
      mediaType: "tv",
      season: selectedSeason,
      episode: episode.episode_number,
      currentTime: duration,
      duration,
      percent: 1,
      snapshot: detail,
    });
  }

  function markSeasonWatched() {
    releasedSeasonEpisodes.forEach(markEpisodeWatched);
  }

  return (
    <div className="space-y-8">
      <section className="relative -mx-4 -mt-24 overflow-hidden sm:-mt-28 xl:-mx-8">
        {heroBackdrop ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-95"
              style={{
                backgroundImage: `url(${buildImageUrl(heroBackdrop, "original", configuration)})`,
                WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
                maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,7,0.88)_0%,rgba(5,5,7,0.70)_26%,rgba(5,5,7,0.34)_52%,rgba(5,5,7,0.12)_76%,rgba(5,5,7,0)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,7,0.14)_0%,rgba(5,5,7,0.06)_24%,rgba(5,5,7,0.18)_58%,rgba(5,5,7,0)_100%)]" />
          </>
        ) : null}

        <div className="relative mx-auto flex min-h-[calc(88svh-6rem)] w-full max-w-[1800px] flex-col justify-end px-4 pb-12 pt-[calc(6.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-[calc(7.1rem+env(safe-area-inset-top))] lg:px-8 lg:pb-16 lg:pt-[calc(7.8rem+env(safe-area-inset-top))]">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
            <div className="min-w-0 max-w-[760px]">
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/58">{mediaLabel}</p>

              {titleLogoEntry?.file_path ? (
                <img
                  src={buildImageUrl(titleLogoEntry.file_path, "w780", configuration)}
                  alt={title}
                  fetchPriority="high"
                  decoding="async"
                  className="mt-5 max-h-[108px] w-auto max-w-full object-contain sm:max-h-[132px] lg:max-h-[164px] lg:max-w-[min(100%,640px)]"
                />
              ) : (
                <h1 className="mt-4 font-[family-name:var(--font-display)] text-[2.7rem] font-semibold leading-[0.88] text-white sm:text-[4rem] lg:text-[5.35rem]">
                  {title}
                </h1>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm text-white/74">
                <span className="text-white/80">{dateLabel}</span>
                {runtime ? (
                  <span className="text-white/80">
                    {formatRuntime(runtime)}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-yellow-300" />
                  {formatVote(detail.vote_average)}
                </span>
                {ageRating ? (
                  <span
                    title={`Age rating (${certificationFor(settings.region) ? settings.region : "US"})`}
                    className="inline-flex min-w-7 items-center justify-center rounded-[4px] border border-white/70 bg-black/20 px-1.5 py-0.5 text-[11px] font-extrabold leading-none tracking-[0.04em] text-white/90"
                  >
                    {ageRating}
                  </span>
                ) : null}
                {collection ? (
                  <AppLink
                    href={`/collection/${collection.id}`}
                    className="inline-flex items-center gap-2 text-white/82 transition hover:text-white"
                  >
                    <Layers3 className="h-4 w-4" />
                    {collection.name}
                  </AppLink>
                ) : null}
              </div>

              {detail.tagline ? (
                <p className="mt-5 text-base italic text-white/72 sm:text-lg">{detail.tagline}</p>
              ) : null}

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70 sm:text-[15px] sm:leading-8">
                {detail.overview || "No synopsis available yet."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {playable ? (
                  <AppLink
                    href={watchHref}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black sm:px-5"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {resumeEntry ? "Resume Watching" : "Watch Now"}
                  </AppLink>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white/72">
                    <CalendarClock className="h-4 w-4" />
                    Releases {dateLabel}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggleSaved(detail, mediaType)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/85 sm:px-5"
                >
                  {saved ? <BookmarkCheck className="h-4 w-4 text-accent-300" /> : <Bookmark className="h-4 w-4" />}
                  {saved ? "Saved" : "Save to My List"}
                </button>
                {mediaType === "movie" && playable && !hasTrackedActivity ? (
                  <button
                    type="button"
                    onClick={markMovieWatched}
                    disabled={movieWatched}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 disabled:cursor-default disabled:border-emerald-300/20 disabled:bg-emerald-400/10 disabled:text-emerald-200 sm:px-5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {movieWatched ? "Watched" : "Mark watched"}
                  </button>
                ) : null}
                {hasTrackedActivity ? (
                  <button
                    type="button"
                    onClick={() => clearMediaActivity(id, mediaType)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/85 sm:px-5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear History
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={openTrailer}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/85 sm:px-5"
                >
                  Watch Trailer
                </button>
              </div>

              <div className="mt-6 space-y-2 text-sm text-white/64">
                {directors.length ? (
                  <p className="flex flex-wrap gap-x-2">
                    <span className="text-white/42">Director:</span>
                    {directors.map((person) => <AppLink key={person.id} href={`/person/${person.id}`} className="hover:text-white hover:underline">{person.name}</AppLink>)}
                  </p>
                ) : null}
                {genreSummary ? (
                  <p>
                    <span className="text-white/42">Genres:</span> {genreSummary}
                  </p>
                ) : null}
              </div>

              {trailerNotice ? <p className="mt-4 text-sm text-white/58">{trailerNotice}</p> : null}
            </div>

            <aside className="min-w-0 self-end xl:justify-self-end xl:max-w-[260px]">
              <div className="[text-shadow:0_2px_16px_rgba(0,0,0,0.82)]">
                <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/55">
                  <BarChart3 className="h-3.5 w-3.5 text-accent-200" />
                  Ratings
                </div>
                <OmdbRatingsPanel
                  payload={omdbDetail}
                  loading={omdbDetailLoading}
                  compact
                  error={omdbDetailError || (!omdbLookupId ? "TMDB did not expose an IMDb ID for this title." : "")}
                />
              </div>
              {mediaType === "movie" && (detail.budget > 0 || detail.revenue > 0) ? (
                <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-sm [text-shadow:0_2px_12px_black]">
                  <p className="text-xs uppercase tracking-widest text-white/55">Box Office</p>
                  {detail.budget > 0 ? <p className="flex justify-between gap-4"><span className="text-white/60">Budget</span>{money(detail.budget)}</p> : null}
                  {detail.revenue > 0 ? <p className="flex justify-between gap-4"><span className="text-white/60">Revenue</span>{money(detail.revenue)}</p> : null}
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center gap-5">
                {productionCompanies.map((company) => (
                  <AppLink
                    key={company.id}
                    href={`/company/${company.id}`}
                    aria-label={company.name}
                    className="group flex h-14 w-24 items-center justify-center rounded bg-transparent p-2 transition-colors duration-200 hover:bg-[#d8d1c4]/90 focus-visible:bg-[#d8d1c4]/90"
                  >
                    <img
                      src={buildImageUrl(company.logo_path, "w300", configuration)}
                      alt={company.name}
                      className="max-h-full max-w-full object-contain opacity-95 brightness-0 invert transition duration-200 group-hover:brightness-100 group-hover:invert-0 group-hover:opacity-100 group-focus-visible:brightness-100 group-focus-visible:invert-0 group-focus-visible:opacity-100"
                    />
                  </AppLink>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {collection ? (
        <section className="surface-strong noise relative overflow-hidden p-5 sm:p-6">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url(${buildImageUrl(collection.backdrop_path || detail.backdrop_path, "w1280", configuration)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07070be8] via-[#07070bcf] to-[#07070b7a]" />

          <div className="relative grid gap-5 md:grid-cols-[150px_minmax(0,1fr)] md:items-center">
            <img
              src={buildPosterUrl(collection.poster_path || detail.poster_path, configuration)}
              alt={collection.name}
              loading="lazy"
              decoding="async"
              className="mx-auto w-full max-w-[150px] rounded-[24px] border border-white/10 object-cover md:mx-0"
            />

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">Collection</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{collection.name}</h2>
                {collectionQuery.data?.parts?.length ? (
                  <p className="mt-2 text-lg text-white/80">
                    {collectionQuery.data.parts.length} films in collection
                  </p>
                ) : null}
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                  {collection.overview || "Part of a larger story. Open the full collection to see every connected chapter."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-white/72">
                <AppLink
                  href={`/collection/${collection.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 font-semibold text-black"
                >
                  Open Collection
                  <ArrowUpRight className="h-4 w-4" />
                </AppLink>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {mediaType === "tv" && seasonOptions.length ? (
        <section className="py-6">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Episodes</h2>
              <p className="mt-2 text-sm text-white/50">{selectedSeasonEpisodes.length} episodes</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-3 text-sm">
                <span className="sr-only">Season</span>
                <select className="brand-select max-w-[240px]" value={selectedSeason} onChange={(event) => { selectedSeasonTouchedRef.current = true; setSelectedSeason(Number(event.target.value)); }}>
                  {seasonOptions.map((season) => <option key={season.id} value={season.season_number}>{season.name}</option>)}
                </select>
              </label>
              {releasedSeasonEpisodes.length ? (
                <button
                  type="button"
                  onClick={markSeasonWatched}
                  disabled={seasonWatched}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/70 transition-colors hover:border-accent-300/35 hover:bg-accent-500/15 hover:text-white disabled:cursor-default disabled:border-emerald-300/20 disabled:bg-emerald-400/10 disabled:text-emerald-200"
                  aria-label={seasonWatched ? "Season watched" : `Mark ${selectedSeasonData?.name || `season ${selectedSeason}`} watched`}
                  title={seasonWatched ? "Season watched" : "Mark season watched"}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          </div>
          {seasonQuery.error ? <p role="alert">Episodes could not be loaded. Please try again.</p> : null}
          <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {seasonQuery.loading || !selectedSeasonData ? [0, 1, 2, 3].map((key) => <div key={key} className="aspect-video animate-pulse rounded-lg bg-white/5" />) : selectedSeasonEpisodes.map((episode) => {
              const progress = activeProfileData.progress?.[createProgressKey({ mediaType: "tv", id, season: selectedSeason, episode: episode.episode_number })];
              const percent = toProgressPercent(progress);
              const rating = episodeRatings[`${omdbLookupId}:${selectedSeason}:${episode.episode_number}`];
              const episodePlayable = playable && Boolean(episode.air_date) && episode.air_date <= today;
              return (
                <article key={episode.id || episode.episode_number} className="group min-w-0">
                  <AppLink href={episodePlayable ? getWatchHref("tv", id, { season: selectedSeason, episode: episode.episode_number }) : "#"} aria-label={`${episodePlayable ? "Watch" : "Upcoming"} episode ${episode.episode_number}: ${episode.name}`} onClick={(event) => { if (!episodePlayable) event.preventDefault(); }} className="relative block aspect-video overflow-hidden rounded-lg bg-white/5">
                    <img src={buildImageUrl(episode.still_path || detail.backdrop_path, "w780", configuration)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:brightness-75" />
                    {episodePlayable ? <Play className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 fill-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100" /> : null}
                    {percent > 0 ? (
                      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/55" aria-label={`${percent}% watched`}>
                        <div className="h-full bg-accent-500" style={{ width: `${percent}%` }} />
                      </div>
                    ) : null}
                  </AppLink>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <h3 className="min-w-0 text-lg font-semibold">{episode.episode_number}. {episode.name}</h3>
                    {episodePlayable ? (
                      <button
                        type="button"
                        onClick={() => markEpisodeWatched(episode)}
                        disabled={percent >= 90}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent-300/25 bg-accent-500/10 px-3 py-1.5 text-xs font-semibold text-accent-100 transition-colors hover:border-accent-300/45 hover:bg-accent-500/20 disabled:cursor-default disabled:border-emerald-300/20 disabled:bg-emerald-400/10 disabled:text-emerald-200"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {percent >= 90 ? "Watched" : "Mark watched"}
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/60">{episode.overview || "Synopsis coming soon."}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/65">
                    {episode.vote_average > 0 ? <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-300" />{formatVote(episode.vote_average)}</span> : null}
                    {episode.runtime ? <span>{formatRuntime(episode.runtime)}</span> : null}
                    {episode.air_date ? <span>{formatFullDate(episode.air_date)}</span> : null}
                  </div>
                  {omdbLookupId ? (
                    <div className="mt-3"><EpisodeRatingsLine payload={rating?.data} loading={rating?.loading} error={rating?.error} /></div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {detail.credits?.cast?.length ? (
        <section className="surface p-5 sm:p-6">
          <h2 className="text-2xl font-semibold text-white">Cast Highlights</h2>
          <div className="relative">
            <div
              ref={castHighlightsRef}
              className="scrollbar-none mt-5 flex gap-5 overflow-x-auto pb-3"
            >
              {detail.credits.cast.slice(0, visibleCastCount).map((person) => (
                <AppLink
                  key={person.credit_id || person.id}
                  href={`/person/${person.id}`}
                  className="w-32 shrink-0 sm:w-40"
                >
                  <img src={buildImageUrl(person.profile_path, "w185", configuration)} alt="" loading="lazy" className="mb-3 aspect-[2/3] w-full rounded-lg object-cover bg-white/5" />
                  <p className="text-base font-semibold text-white">{person.name}</p>
                  <p className="mt-2 text-sm text-white/55">{person.character || person.known_for_department}</p>
                </AppLink>
              ))}
              {visibleCastCount < detail.credits.cast.length ? (
                <div className="flex w-20 shrink-0 items-center justify-center self-stretch">
                  <button
                    type="button"
                    onClick={() => setVisibleCastCount((current) => Math.min(current + 8, detail.credits.cast.length))}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label="Show 8 more cast members"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              ) : null}
            </div>
            <div
              className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#050507] via-[#050507]/80 to-transparent transition-opacity duration-200 sm:w-10 ${
                castScrollState.canScrollLeft ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            />
            <div
              className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#050507] via-[#050507]/80 to-transparent transition-opacity duration-200 sm:w-10 ${
                castScrollState.canScrollRight ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            />
          </div>
        </section>
      ) : null}

      <AwardsPanel summary={omdbDetail?.Awards} />

      <MediaRail
        title="Recommended Next"
        subtitle="TMDB recommendation objects routed back into canonical details."
        items={detail.recommendations?.results || []}
        configuration={configuration}
      />

      <MediaRail
        title="Similar Vibe"
        subtitle="Fast adjacent picks for the same mood."
        items={detail.similar?.results || []}
        configuration={configuration}
      />

      {trailerOpen ? (
        <div className="fixed inset-0 z-[120] isolate !m-0 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[#03050780]"
            onClick={() => setTrailerOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,150,190,0.12),transparent_52%)] backdrop-blur-xl"
            onClick={() => setTrailerOpen(false)}
            aria-hidden="true"
          />
          <button
            ref={trailerCloseButtonRef}
            type="button"
            onClick={() => setTrailerOpen(false)}
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white/84 backdrop-blur sm:right-6 sm:top-6"
            aria-label="Close trailer"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative z-10 w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="aspect-video overflow-hidden rounded-[22px] bg-black shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
              {trailerEmbedUrl ? (
                <iframe
                  src={trailerEmbedUrl}
                  title={`${title} trailer`}
                  className="h-full w-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="origin-when-cross-origin"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/62">
                  No trailer is available for this title right now.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
