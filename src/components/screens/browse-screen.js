"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FiltersPanel } from "@/components/filters-panel";
import { PosterGridSkeleton } from "@/components/loading-state";
import { MediaGrid } from "@/components/media-grid";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { useAppState } from "@/lib/app-state";
import { FULL_GRID_PAGE_SIZE, getLogicalGridPagePlan, getLogicalGridTotalPages, sliceLogicalGridItems } from "@/lib/grid-pagination";
import { useTmdbConfiguration, useTmdbQuery } from "@/hooks/use-tmdb-query";

const DEFAULT_FILTERS = {
  genre: "",
  year: "",
  rating: "",
  runtime: "",
  language: "",
  sort: "popularity.desc",
};

export function BrowseScreen({ mediaType, title, description, sortOptions }) {
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
    ...(mediaType === "movie"
      ? { primary_release_year: filters.year || undefined }
      : { first_air_date_year: filters.year || undefined }),
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
      ...(mediaType === "movie"
        ? { primary_release_year: filters.year || undefined }
        : { first_air_date_year: filters.year || undefined }),
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
      <PageHeader
        eyebrow={mediaType === "movie" ? "Movies" : "TV Shows"}
        title={title}
        description={description}
        action={
          <TmdbAttribution
            variant="primaryFull"
            logoScale={1.08}
            className="w-full max-w-[430px]"
            title={`${title} metadata by TMDB`}
            body={
              mediaType === "movie"
                ? "Movie discovery filters, release data, and result metadata on this page come from TMDB."
                : "TV discovery filters, first-air data, and series metadata on this page come from TMDB."
            }
          />
        }
      />

      <FiltersPanel
        genres={genreQuery.data?.genres || []}
        filters={filters}
        onChange={handleFilterChange}
        sortOptions={sortOptions}
        mediaType={mediaType}
      />

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
