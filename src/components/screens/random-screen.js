"use client";

import { useEffect, useRef, useState } from "react";
import { Dice6, RefreshCcw } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { MOVIE_SORT_OPTIONS, TV_SORT_OPTIONS } from "@/lib/discovery";
import { useAppState } from "@/lib/app-state";
import { useTmdbConfiguration, useTmdbQuery } from "@/hooks/use-tmdb-query";
import { tmdbClientGet } from "@/lib/tmdb-client";
import { buildImageUrl, buildPosterUrl, formatFullDate, formatVote } from "@/lib/utils";

const DEFAULT_FILTERS = {
  genre: "",
  year: "",
  rating: "",
  runtime: "",
  language: "",
  sort: "popularity.desc",
};

export function RandomScreen() {
  const { settings } = useAppState();
  const { data: configuration } = useTmdbConfiguration();
  const [mediaType, setMediaType] = useState("movie");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const selectionRef = useRef(null);

  const genrePath = mediaType === "movie" ? "genre/movie/list" : "genre/tv/list";
  const genresQuery = useTmdbQuery(genrePath, {
    language: settings.language,
  });

  const sortOptions = mediaType === "movie" ? MOVIE_SORT_OPTIONS : TV_SORT_OPTIONS;

  function handleMediaTypeChange(nextType) {
    const nextSortOptions = nextType === "movie" ? MOVIE_SORT_OPTIONS : TV_SORT_OPTIONS;

    setMediaType(nextType);
    setFilters((current) => ({
      ...current,
      sort: nextSortOptions[0]?.value || DEFAULT_FILTERS.sort,
    }));
  }

  async function surprise() {
    setLoading(true);
    setError(null);

    try {
      const randomPage = Math.max(1, Math.floor(Math.random() * 10) + 1);
      const path = mediaType === "movie" ? "discover/movie" : "discover/tv";
      const data = await tmdbClientGet(path, {
        include_adult: false,
        language: settings.language,
        region: settings.region,
        page: randomPage,
        sort_by: filters.sort,
        with_genres: filters.genre || undefined,
        "vote_average.gte": filters.rating || undefined,
        "with_runtime.gte": filters.runtime || undefined,
        with_original_language: filters.language || undefined,
        ...(mediaType === "movie"
          ? { primary_release_year: filters.year || undefined }
          : { first_air_date_year: filters.year || undefined }),
      });

      const results = data?.results || [];

      if (!results.length) {
        setSelection(null);
        setError(new Error("No titles matched those filters. Try loosening them and roll again."));
      } else {
        setSelection(results[Math.floor(Math.random() * results.length)]);
      }
    } catch (surpriseError) {
      setError(surpriseError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selection || loading) {
      return;
    }

    selectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [loading, selection]);

  return (
    <div className="relative overflow-hidden py-4 sm:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,rgba(180,28,64,0.16),transparent_58%),radial-gradient(circle_at_85%_24%,rgba(255,190,90,0.08),transparent_36%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center text-center">
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => handleMediaTypeChange("movie")}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              mediaType === "movie" ? "bg-white text-black" : "text-white/75"
            }`}
          >
            Movies
          </button>
          <button
            type="button"
            onClick={() => handleMediaTypeChange("tv")}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              mediaType === "tv" ? "bg-white text-black" : "text-white/75"
            }`}
          >
            TV Series
          </button>
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.32em] text-accent-200 sm:mt-8">Random</p>
        <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-display)] text-3xl font-semibold text-white sm:text-5xl md:text-7xl">
          Let FlavFlix pick the next watch for you
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:mt-5 sm:text-base sm:leading-8">
          Keep it broad or lock in genre, year, language, and rating. Then roll a centered, cinematic pick without
          digging through menus.
        </p>

        <TmdbAttribution
          variant="primaryLong"
          compact
          logoScale={1.1}
          className="mt-6 max-w-[520px] sm:mt-8"
          title="Random discovery powered by TMDB"
          body="Filters and random picks on this page are generated from TMDB discover metadata."
        />

        <div className="mt-8 w-full rounded-[28px] border border-white/10 bg-black/28 p-4 shadow-panel backdrop-blur-xl sm:mt-12 sm:rounded-[36px] sm:p-6 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-2 text-left text-sm text-white/55">
              <span>Genre</span>
              <select
                value={filters.genre}
                onChange={(event) => setFilters((current) => ({ ...current, genre: event.target.value }))}
                className="brand-select"
              >
                <option value="">All genres</option>
                {(genresQuery.data?.genres || []).map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-left text-sm text-white/55">
              <span>{mediaType === "movie" ? "Release year" : "First air year"}</span>
              <input
                type="number"
                value={filters.year}
                onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
                placeholder="2026"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-left text-sm text-white/55">
              <span>Rating floor</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={filters.rating}
                onChange={(event) => setFilters((current) => ({ ...current, rating: event.target.value }))}
                placeholder="7.5"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-left text-sm text-white/55">
              <span>{mediaType === "movie" ? "Runtime floor" : "Episode runtime floor"}</span>
              <input
                type="number"
                min="0"
                value={filters.runtime}
                onChange={(event) => setFilters((current) => ({ ...current, runtime: event.target.value }))}
                placeholder={mediaType === "movie" ? "90" : "40"}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-left text-sm text-white/55">
              <span>Original language</span>
              <input
                type="text"
                value={filters.language}
                onChange={(event) => setFilters((current) => ({ ...current, language: event.target.value }))}
                placeholder="en"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-left text-sm text-white/55">
              <span>Sort by</span>
              <select
                value={filters.sort}
                onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
                className="brand-select"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className={`h-2.5 w-2.5 rounded-full ${loading ? "animate-bounce bg-accent-300" : "bg-white/20"}`}
                  style={loading ? { animationDelay: `${index * 100}ms` } : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={surprise}
              disabled={loading}
              className="inline-flex w-full max-w-[340px] items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-black shadow-[0_25px_80px_rgba(255,255,255,0.14)] transition hover:scale-[1.01] disabled:opacity-60 sm:min-w-[280px] sm:px-10 sm:py-5 sm:text-lg"
            >
              {loading ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Dice6 className="h-5 w-5" />}
              Surprise Me
            </button>

            <p className="text-sm text-white/52">
              {loading ? "Shuffling discover results..." : "One click samples a random page, then draws a single pick."}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-8 w-full rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 text-sm text-rose-100">
            Random selection failed: {error.message}
          </div>
        ) : null}

        {selection && !loading ? (
          <div ref={selectionRef} className="relative mt-10 w-full overflow-hidden rounded-[28px] border border-white/10 bg-black/35 shadow-panel sm:rounded-[36px]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-35"
              style={{ backgroundImage: `url(${buildImageUrl(selection.backdrop_path || selection.poster_path, "w1280", configuration)})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050507f2] via-[#050507d0] to-[#0505074a]" />

            <div className="relative grid gap-5 p-4 sm:gap-8 sm:p-6 md:p-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-end">
              <img
                src={buildPosterUrl(selection.poster_path, configuration)}
                alt={selection.title || selection.name}
                loading="lazy"
                decoding="async"
                className="mx-auto w-full max-w-[220px] rounded-[24px] border border-white/10 object-cover sm:max-w-[280px] sm:rounded-[30px]"
              />

              <div className="text-left">
                <p className="text-xs uppercase tracking-[0.28em] text-accent-200">Random pick</p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl md:text-5xl">{selection.title || selection.name}</h2>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/72">
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {formatFullDate(selection.release_date || selection.first_air_date)}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {selection.title ? "Movie" : "TV Show"}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">{formatVote(selection.vote_average)} rating</span>
                </div>

                <p className="mt-5 max-w-3xl text-sm leading-7 text-white/66 sm:mt-6 sm:leading-8">
                  {selection.overview || "No synopsis available."}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <AppLink
                    href={`/${selection.title ? "movie" : "tv"}/${selection.id}`}
                    className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
                  >
                    Open Details
                  </AppLink>
                  <button
                    type="button"
                    onClick={surprise}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white/85"
                  >
                    Roll Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!selection && !loading && !error ? (
          <p className="mt-8 max-w-xl text-sm leading-7 text-white/55">
            Leave every filter open for a pure surprise, or tighten the search before rolling.
          </p>
        ) : null}
      </div>
    </div>
  );
}
