"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FiltersPanel } from "@/components/filters-panel";
import { PosterGridSkeleton } from "@/components/loading-state";
import { MediaGrid } from "@/components/media-grid";
import { EmptyState } from "@/components/empty-state";
import { UpcomingReleases } from "@/components/upcoming-releases";
import { useAppState } from "@/lib/app-state";
import { getBrowseYearParams } from "@/lib/browse-filters";
import { FULL_GRID_PAGE_SIZE, getLogicalGridPagePlan, getLogicalGridTotalPages, sliceLogicalGridItems } from "@/lib/grid-pagination";
import { useTmdbConfiguration, useTmdbQuery } from "@/hooks/use-tmdb-query";

const DEFAULT_FILTERS = {
  genre: "",
  yearFrom: "",
  yearTo: "",
  rating: "",
  runtime: "",
  language: "",
  sort: "popularity.desc",
};

export function BrowseScreen({ mediaType, title, sortOptions }) {
  const { settings } = useAppState();
  const { data: configuration } = useTmdbConfiguration();
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    sort: sortOptions[0]?.value || DEFAULT_FILTERS.sort,
  });
  const [page, setPage] = useState(1);

  const genrePath = mediaType === "movie" ? "genre/movie/list" : "genre/tv/list";
  const discoverPath = mediaType === "movie" ? "discover/movie" : "discover/tv";
  const pagePlan = getLogicalGridPagePlan(page, FULL_GRID_PAGE_SIZE);
  const genreQuery = useTmdbQuery(genrePath, { language: settings.language });
  const languagesQuery = useTmdbQuery("configuration/languages");
  const languages = [...(languagesQuery.data || [])]
    .filter((language) => language.iso_639_1)
    .sort((left, right) => (left.english_name || left.name || left.iso_639_1).localeCompare(right.english_name || right.name || right.iso_639_1));
  const yearParams = getBrowseYearParams(mediaType, filters.yearFrom, filters.yearTo);
  const browseQuery = useTmdbQuery(discoverPath, {
    include_adult: false,
    language: settings.language,
    region: settings.region,
    page: pagePlan.primaryPage,
    sort_by: filters.sort,
    with_genres: filters.genre || undefined,
    "vote_average.gte": filters.rating || undefined,
    "with_runtime.gte": filters.runtime || undefined,
    with_original_language: filters.language || undefined,
    "vote_count.gte": 75,
    ...yearParams,
  });
  const browseQueryOverflow = useTmdbQuery(
    discoverPath,
    {
      include_adult: false,
      language: settings.language,
      region: settings.region,
      page: pagePlan.secondaryPage,
      sort_by: filters.sort,
      with_genres: filters.genre || undefined,
      "vote_average.gte": filters.rating || undefined,
      "with_runtime.gte": filters.runtime || undefined,
      with_original_language: filters.language || undefined,
      "vote_count.gte": 75,
      ...yearParams,
    },
    {
      enabled: Boolean(pagePlan.secondaryPage),
    },
  );

  function handleFilterChange(key, value) {
    setPage(1);
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const items = sliceLogicalGridItems(
    browseQuery.data?.results || [],
    browseQueryOverflow.data?.results || [],
    pagePlan,
  );
  const totalPages = getLogicalGridTotalPages(browseQuery.data?.total_results || 0, FULL_GRID_PAGE_SIZE);
  const loading = browseQuery.loading || browseQueryOverflow.loading;
  const error = browseQuery.error || browseQueryOverflow.error;

  return (
    <div className="space-y-8">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(180px,0.6fr)_minmax(0,2fr)]">
        <header>
          <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-white/55">Find your next favorite.</p>
        </header>
        <FiltersPanel
          genres={genreQuery.data?.genres || []}
          languages={languages}
          filters={filters}
          onChange={handleFilterChange}
          sortOptions={sortOptions}
          mediaType={mediaType}
          unboxed
        />
      </div>
      <UpcomingReleases mediaType={mediaType} settings={settings} configuration={configuration} />

      {error ? (
        <div className="surface p-6 text-sm text-rose-200">TMDB discover failed: {error.message}</div>
      ) : null}

      {loading && !browseQuery.data ? (
        <PosterGridSkeleton />
      ) : items.length ? (
        <MediaGrid items={items} configuration={configuration} />
      ) : (
        <EmptyState
          title="No titles matched those filters"
          description="Try loosening genre, rating, or language filters to widen the discover query."
        />
      )}

      {items.length ? (
        <div className="surface flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-white/55">
            Page {page} of {totalPages}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
