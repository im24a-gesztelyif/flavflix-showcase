"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock3,
  Layers3,
  Play,
  Star,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { AppLink } from "@/components/app-link";
import { LoadingState } from "@/components/loading-state";
import { MediaRail } from "@/components/media-rail";
import { useAppState } from "@/lib/app-state";
import { createProgressKey, getWatchHref, isPlayableMedia } from "@/lib/media";
import { omdbClientGet } from "@/lib/omdb-client";
import { tmdbAwardsClientGet } from "@/lib/tmdb-awards-client";
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

function formatInteger(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
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

function AwardsPanel({ awards, loading = false }) {
  const [open, setOpen] = useState(false);
  const hasAwardItems = Boolean(awards?.items?.length);
  const hasAwardTotals = Number(awards?.wins || 0) > 0 || Number(awards?.nominations || 0) > 0;

  if (!awards || (!hasAwardItems && !hasAwardTotals)) {
    return null;
  }

  return (
    <section className="surface relative overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,212,84,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.07),transparent_42%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f1cf67]/50 to-transparent" />

      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#f1cf67]/20 bg-[#f1cf67]/10 text-[#f1cf67] shadow-[0_0_32px_rgba(241,207,103,0.14)]">
              <Trophy className="h-4.5 w-4.5" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-white sm:text-[1.45rem]">Awards</h2>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-white/42">
                {loading ? "Checking" : `${awards?.items?.length || 0} entries`}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/56">
              {loading
                ? "Looking for award data from TMDB."
                : hasAwardItems
                  ? "Award highlights from TMDB."
                  : "Award totals are available, but TMDB does not include ceremony details yet."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/[0.07]"
            aria-expanded={open}
          >
            {open ? "Hide Awards" : "Show Awards"}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/74">
            <span className="mr-2 text-[11px] uppercase tracking-[0.2em] text-white/38">Wins</span>
            <span className="font-semibold text-white">{loading ? "..." : formatInteger(awards?.wins)}</span>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/74">
            <span className="mr-2 text-[11px] uppercase tracking-[0.2em] text-white/38">Nominations</span>
            <span className="font-semibold text-white">{loading ? "..." : formatInteger(awards?.nominations)}</span>
          </div>
        </div>

        {open ? (
          <div className="mt-4 space-y-4">
            {hasAwardItems ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {awards.items.slice(0, 6).map((award, index) => (
                  <article
                    key={`${award.ceremony}-${award.category}-${index}`}
                    className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                      <span
                        className={`rounded-full px-2.5 py-1 font-semibold ${
                          award.result === "Winner" ? "bg-[#0f8f55]/25 text-[#92ffcb]" : "bg-white/[0.07] text-white/68"
                        }`}
                      >
                        {award.result}
                      </span>
                      {award.year ? <span className="rounded-full border border-white/10 px-2.5 py-1">{award.year}</span> : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{award.category}</h3>
                    <p className="mt-1.5 text-sm text-white/55">{award.ceremony}</p>
                    {award.recipients?.length ? (
                      <p className="mt-3 text-sm leading-6 text-white/62">
                        {award.recipients.length === 1 ? "Recipient" : "Recipients"}: {award.recipients.join(", ")}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/58">
                TMDB lists award totals for this title, but detailed award entries are not available yet.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
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
    return <p className="text-sm text-white/52">{error}</p>;
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

export function DetailScreen({ mediaType, id }) {
  const { settings, isSaved, toggleSaved, activeProfileData, clearMediaActivity } = useAppState();
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerNotice, setTrailerNotice] = useState("");
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [omdbDetail, setOmdbDetail] = useState(null);
  const [omdbDetailLoading, setOmdbDetailLoading] = useState(false);
  const [omdbDetailError, setOmdbDetailError] = useState("");
  const [awardsDetail, setAwardsDetail] = useState(null);
  const [awardsLoading, setAwardsLoading] = useState(false);
  const [episodeRatings, setEpisodeRatings] = useState({});
  const trailerCloseButtonRef = useRef(null);
  const selectedSeasonTouchedRef = useRef(false);
  const { data: configuration } = useTmdbConfiguration();
  const detailPath = `${mediaType}/${id}`;
  const detailQuery = useTmdbQuery(detailPath, {
    language: settings.language,
    append_to_response: "credits,images,videos,recommendations,similar,external_ids",
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
    let cancelled = false;

    setAwardsDetail(null);
    setAwardsLoading(true);

    tmdbAwardsClientGet({
      mediaType,
      id,
      language: "en-US",
    })
      .then((data) => {
        if (!cancelled) {
          setAwardsDetail(data);
          setAwardsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAwardsDetail(null);
          setAwardsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, mediaType]);

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
    if (mediaType !== "tv" || !omdbLookupId || !selectedSeasonEpisodes.length) {
      return undefined;
    }

    let cancelled = false;
    const ratingKeys = selectedSeasonEpisodes.map((episode) => `${selectedSeason}:${episode.episode_number}`);

    setEpisodeRatings((current) => {
      const next = { ...current };

      selectedSeasonEpisodes.forEach((episode) => {
        const key = `${selectedSeason}:${episode.episode_number}`;

        if (!next[key]?.data && !next[key]?.loading) {
          next[key] = {
            loading: true,
            data: null,
            error: "",
          };
        }
      });

      return next;
    });

    Promise.allSettled(
      selectedSeasonEpisodes.map((episode) =>
        omdbClientGet({
          imdbId: omdbLookupId,
          season: selectedSeason,
          episode: episode.episode_number,
        }),
      ),
    ).then((results) => {
      if (cancelled) {
        return;
      }

      setEpisodeRatings((current) => {
        const next = { ...current };

        results.forEach((result, index) => {
          const key = ratingKeys[index];

          next[key] =
            result.status === "fulfilled"
              ? {
                  loading: false,
                  data: result.value,
                  error: "",
                }
              : {
                  loading: false,
                  data: null,
                  error: result.reason?.message || "OMDb ratings are unavailable for this episode.",
                };
        });

        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [mediaType, omdbLookupId, selectedSeason, selectedSeasonEpisodes]);

  if (detailQuery.loading && !detailQuery.data) {
    return <LoadingState title="Loading details" description="Fetching canonical metadata, recommendations, and cast." />;
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
  const productionCompanies = detail.production_companies || [];
  const watchHref =
    mediaType === "tv"
      ? getWatchHref(mediaType, id, {
          season: resumeEntry?.season || 1,
          episode: resumeEntry?.episode || 1,
        })
      : getWatchHref(mediaType, id);
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
  const castSummary = detail.credits?.cast?.slice(0, 3).map((person) => person.name).join(", ");
  const genreSummary = detail.genres?.map((genre) => genre.name).join(", ");
  const mediaLabel = mediaType === "movie" ? "Film" : "Series";

  function openTrailer() {
    if (!trailerEmbedUrl) {
      setTrailerNotice("No trailer is available for this title right now.");
      return;
    }

    setTrailerNotice("");
    setTrailerOpen(true);
  }

  return (
    <div className="space-y-8">
      <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-24 w-screen overflow-hidden sm:-mt-28">
        {heroBackdrop ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-80"
              style={{
                backgroundImage: `url(${buildImageUrl(heroBackdrop, "original", configuration)})`,
                WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
                maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,7,0.96)_0%,rgba(5,5,7,0.84)_26%,rgba(5,5,7,0.48)_52%,rgba(5,5,7,0.12)_76%,rgba(5,5,7,0)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,7,0.14)_0%,rgba(5,5,7,0.06)_24%,rgba(5,5,7,0.18)_58%,rgba(5,5,7,0)_100%)]" />
          </>
        ) : null}

        <div className="relative mx-auto flex min-h-[calc(88svh-6rem)] w-full max-w-[1800px] flex-col justify-end px-4 pb-12 pt-[calc(6.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-[calc(7.1rem+env(safe-area-inset-top))] lg:px-8 lg:pb-16 lg:pt-[calc(7.8rem+env(safe-area-inset-top))]">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
            <div className="max-w-[760px]">
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/58">{mediaLabel}</p>

              {titleLogoEntry?.file_path ? (
                <img
                  src={buildImageUrl(titleLogoEntry.file_path, "w780", configuration)}
                  alt={title}
                  fetchPriority="high"
                  decoding="async"
                  className="mt-5 max-h-[108px] w-auto max-w-[min(88vw,560px)] object-contain sm:max-h-[132px] lg:max-h-[164px] lg:max-w-[640px]"
                />
              ) : (
                <h1 className="mt-4 font-[family-name:var(--font-display)] text-[2.7rem] font-semibold leading-[0.88] text-white sm:text-[4rem] lg:text-[5.35rem]">
                  {title}
                </h1>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm text-white/74">
                <span className="rounded-full border border-white/10 bg-black/26 px-3 py-1.5">{dateLabel}</span>
                {detail.runtime || detail.episode_run_time?.[0] ? (
                  <span className="rounded-full border border-white/10 bg-black/26 px-3 py-1.5">
                    {formatRuntime(detail.runtime || detail.episode_run_time?.[0])}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/26 px-3 py-1.5">
                  <Star className="h-4 w-4 text-yellow-300" />
                  {formatVote(detail.vote_average)}
                </span>
                {collection ? (
                  <AppLink
                    href={`/collection/${collection.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/26 px-3 py-1.5 text-white/82 transition hover:bg-white/[0.08]"
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
                {castSummary ? (
                  <p>
                    <span className="text-white/42">Starring:</span> {castSummary}
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

            <aside className="self-end xl:justify-self-end xl:max-w-[260px]">
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
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                  {collection.overview || "Part of a larger story. Open the full collection to see every connected chapter."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-white/72">
                {collectionQuery.data?.parts?.length ? (
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {collectionQuery.data.parts.length} films in collection
                  </span>
                ) : null}
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
        <section className="surface p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Season Guide</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-white/58">
                Choose a season, then browse every episode with TMDB synopses, stills, air dates, runtimes, and ratings.
              </p>
            </div>
            <label className="flex w-full flex-col gap-2 text-sm text-white/55 sm:max-w-[240px]">
              <span>Season</span>
              <select
                value={selectedSeason}
                onChange={(event) => {
                  selectedSeasonTouchedRef.current = true;
                  setSelectedSeason(Number(event.target.value));
                }}
                className="brand-select"
              >
                {seasonOptions.map((season) => (
                  <option key={season.id} value={season.season_number}>
                    Season {season.season_number}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedSeasonData ? (
            <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-black/22">
              <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="relative aspect-[16/10] overflow-hidden bg-black lg:aspect-auto lg:min-h-[244px]">
                  <img
                    src={buildImageUrl(
                      selectedSeasonData.poster_path || selectedSeasonData.episodes?.[0]?.still_path || detail.backdrop_path,
                      "w780",
                      configuration,
                    )}
                    alt={selectedSeasonData.name || `Season ${selectedSeason}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/45">Selected Season</p>
                      <h3 className="mt-2 text-xl font-semibold text-white sm:text-[1.4rem]">
                        {selectedSeasonData.name || `Season ${selectedSeason}`}
                      </h3>
                    </div>
                    {playable ? (
                      <AppLink
                        href={getWatchHref("tv", id, {
                          season: selectedSeason,
                          episode: resumeEntry?.season === selectedSeason ? resumeEntry.episode || 1 : 1,
                        })}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        {resumeEntry?.season === selectedSeason ? "Resume Season" : "Play Season"}
                      </AppLink>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/62">
                        <CalendarClock className="h-4 w-4" />
                        Unavailable before release
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/58">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {selectedSeasonData.episodes?.length || selectedSeasonData.episode_count || 0} episodes
                    </span>
                    {selectedSeasonData.air_date ? (
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        Premiered {formatFullDate(selectedSeasonData.air_date)}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm leading-7 text-white/66">
                    {selectedSeasonData.overview || "No season synopsis is available from TMDB for this season yet."}
                  </p>
                </div>
              </div>
            </div>
          ) : seasonQuery.loading ? (
            <div className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
              <div className="h-6 w-48 animate-pulse rounded-full bg-white/[0.08]" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-white/[0.06]" />
              <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-white/[0.06]" />
            </div>
          ) : null}

          <div className="mt-6 h-[2px] rounded-full bg-gradient-to-r from-transparent via-white/55 to-transparent shadow-[0_0_18px_rgba(255,255,255,0.12)] lg:hidden" />

          <div className="mt-6 space-y-4">
            {seasonQuery.loading && !selectedSeasonEpisodes.length
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
                    <div className="aspect-[16/7] animate-pulse bg-white/[0.06]" />
                    <div className="space-y-3 p-5">
                      <div className="h-5 w-2/3 animate-pulse rounded-full bg-white/[0.08]" />
                      <div className="h-4 w-full animate-pulse rounded-full bg-white/[0.06]" />
                      <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/[0.06]" />
                    </div>
                  </div>
                ))
              : selectedSeasonEpisodes.map((episode) => {
                  const episodeProgress = activeProfileData.progress?.[
                    createProgressKey({
                      mediaType: "tv",
                      id,
                      season: selectedSeason,
                      episode: episode.episode_number,
                    })
                  ];
                  const progressPercent = toProgressPercent(episodeProgress);
                  const episodeWatchHref = getWatchHref("tv", id, {
                    season: selectedSeason,
                    episode: episode.episode_number,
                  });

                  return (
                    <article
                      key={episode.id || episode.episode_number}
                      className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] sm:rounded-[28px]"
                    >
                      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="relative aspect-[16/9] overflow-hidden bg-black/45 lg:aspect-auto lg:h-full">
                          <img
                            src={buildImageUrl(episode.still_path || detail.backdrop_path, "w780", configuration)}
                            alt={`${title} episode ${episode.episode_number}`}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/58 to-transparent" />
                        </div>

                        <div className="space-y-4 p-5 sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                                Episode {episode.episode_number}
                              </p>
                              <h3 className="mt-2 text-xl font-semibold text-white">
                                {episode.name || `Episode ${episode.episode_number}`}
                              </h3>
                            </div>

                            {playable ? (
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <AppLink
                                  href={episodeWatchHref}
                                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/84 transition hover:bg-white/[0.08]"
                                >
                                  <Play className="h-4 w-4 fill-current" />
                                  {episodeProgress ? "Resume" : "Play"}
                                </AppLink>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/58">
                                <CalendarClock className="h-4 w-4" />
                                Unavailable
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-white/58">
                            {episode.air_date ? (
                              <span className="rounded-full border border-white/10 px-3 py-1">
                                {formatFullDate(episode.air_date)}
                              </span>
                            ) : null}
                            {formatRuntime(episode.runtime) ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {formatRuntime(episode.runtime)}
                              </span>
                            ) : null}
                            {episode.vote_average ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1">
                                <Star className="h-3.5 w-3.5 text-yellow-300" />
                                {formatVote(episode.vote_average)}
                              </span>
                            ) : null}
                            {episodeProgress ? (
                              <span className="rounded-full border border-white/10 px-3 py-1">
                                {Math.round(episodeProgress.percent * 100)}% watched
                              </span>
                            ) : null}
                          </div>

                          <p className="text-sm leading-7 text-white/66">
                            {episode.overview || "No episode synopsis is available from TMDB for this episode yet."}
                          </p>

                          {progressPercent > 0 ? (
                            <div className="pt-1">
                              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                  className="h-full rounded-full bg-[#ff2749]/90"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          ) : null}

                          {omdbLookupId ? (
                            <div className="max-w-sm pt-1">
                              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/44">
                                <BarChart3 className="h-3.5 w-3.5" />
                                OMDb Ratings
                              </div>
                              <OmdbRatingsPanel
                                payload={episodeRatings[`${selectedSeason}:${episode.episode_number}`]?.data}
                                loading={episodeRatings[`${selectedSeason}:${episode.episode_number}`]?.loading}
                                error={episodeRatings[`${selectedSeason}:${episode.episode_number}`]?.error}
                                compact
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
          </div>
        </section>
      ) : null}

      {detail.credits?.cast?.length ? (
        <section className="surface p-5 sm:p-6">
          <h2 className="text-2xl font-semibold text-white">Cast Highlights</h2>
          <div className="mt-5 grid gap-4 grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
            {detail.credits.cast.slice(0, 8).map((person) => (
              <AppLink
                key={person.credit_id || person.id}
                href={`/person/${person.id}`}
                className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
              >
                <p className="text-lg font-semibold text-white">{person.name}</p>
                <p className="mt-2 text-sm text-white/55">{person.character || person.known_for_department}</p>
              </AppLink>
            ))}
          </div>
        </section>
      ) : null}

      <AwardsPanel awards={awardsDetail} loading={awardsLoading} />

      {productionCompanies.length ? (
        <section className="surface p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-white">Production Companies</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/58">
              Studios and banners attached to this title through TMDB, each linked into its own company page.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {productionCompanies.map((company) => (
              <AppLink
                key={company.id}
                href={`/company/${company.id}`}
                className="group rounded-[26px] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-[#d8d1c4]/20 bg-[#d8d1c4] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                    {company.logo_path ? (
                      <img
                        src={buildImageUrl(company.logo_path, "w300", configuration)}
                        alt={company.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-white/44" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="line-clamp-1 text-lg font-semibold text-white">{company.name}</p>
                    <p className="mt-2 text-sm text-white/55">
                      {company.origin_country ? `Origin country: ${company.origin_country}` : "Open company profile"}
                    </p>
                  </div>
                </div>
              </AppLink>
            ))}
          </div>
        </section>
      ) : null}

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
          <div className="absolute inset-0 bg-[#03050780]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,150,190,0.12),transparent_52%)] backdrop-blur-xl" />
          <button
            ref={trailerCloseButtonRef}
            type="button"
            onClick={() => setTrailerOpen(false)}
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white/84 backdrop-blur sm:right-6 sm:top-6"
            aria-label="Close trailer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
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
