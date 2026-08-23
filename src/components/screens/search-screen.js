"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { EmptyState } from "@/components/empty-state";
import { PosterGridSkeleton } from "@/components/loading-state";
import { MediaGrid } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/lib/app-state";
import { FULL_GRID_PAGE_SIZE, getLogicalGridPagePlan, getLogicalGridTotalPages, sliceLogicalGridItems } from "@/lib/grid-pagination";
import { useTmdbConfiguration, useTmdbQuery } from "@/hooks/use-tmdb-query";
import { buildImageUrl, buildPosterUrl } from "@/lib/utils";

const SEARCH_SCOPES = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV Shows" },
  { value: "person", label: "People" },
  { value: "company", label: "Companies" },
];

export function SearchScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [scope, setScope] = useState(searchParams.get("scope") || "all");
  const [sort, setSort] = useState(searchParams.get("sort") || "popularity");
  const { settings } = useAppState();
  const { data: configuration } = useTmdbConfiguration();
  const activeQuery = searchParams.get("q") || "";
  const activeScope = searchParams.get("scope") || "all";
  const activeSort = searchParams.get("sort") || "popularity";
  const activePage = Math.max(1, Number(searchParams.get("page") || 1));
  const pagePlan = getLogicalGridPagePlan(activePage, FULL_GRID_PAGE_SIZE);

  useEffect(() => {
    setQuery((current) => (current === activeQuery ? current : activeQuery));
    setScope((current) => (current === activeScope ? current : activeScope));
    setSort((current) => (current === activeSort ? current : activeSort));
  }, [activeQuery, activeScope, activeSort]);

  const path =
    activeScope === "all"
      ? "search/multi"
      : activeScope === "person"
        ? "search/person"
        : activeScope === "company"
          ? "search/company"
        : `search/${activeScope}`;

  const searchQuery = useTmdbQuery(
    path,
    {
      query: activeQuery,
      include_adult: false,
      language: settings.language,
      page: pagePlan.primaryPage,
    },
    {
      enabled: Boolean(activeQuery),
      ttl: 1000 * 60 * 5,
    },
  );
  const searchOverflowQuery = useTmdbQuery(
    path,
    {
      query: activeQuery,
      include_adult: false,
      language: settings.language,
      page: pagePlan.secondaryPage,
    },
    {
      enabled: Boolean(activeQuery && pagePlan.secondaryPage),
      ttl: 1000 * 60 * 5,
    },
  );

  const rawResults = sliceLogicalGridItems(
    searchQuery.data?.results || [],
    searchOverflowQuery.data?.results || [],
    pagePlan,
  );
  const results =
    activeScope === "company"
      ? [...rawResults]
      : [...rawResults].sort((left, right) => {
          if (activeSort === "latest") {
            return new Date(right.release_date || right.first_air_date || 0) - new Date(left.release_date || left.first_air_date || 0);
          }

          if (activeSort === "rating") {
            return (right.vote_average || 0) - (left.vote_average || 0);
          }

          return (right.popularity || 0) - (left.popularity || 0);
        });

  const mediaResults = results.filter(
    (item) => activeScope !== "company" && item.media_type !== "person" && item.profile_path === undefined,
  );
  const peopleResults = results.filter((item) => item.media_type === "person" || item.known_for_department);
  const companyResults = activeScope === "company" ? results : [];
  const totalPages = getLogicalGridTotalPages(searchQuery.data?.total_results || 0, FULL_GRID_PAGE_SIZE);
  const loading = searchQuery.loading || searchOverflowQuery.loading;
  const error = searchQuery.error || searchOverflowQuery.error;

  function submitSearch(event) {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();

    if (trimmed) {
      nextParams.set("q", trimmed);
    } else {
      nextParams.delete("q");
    }

    if (scope === "all") {
      nextParams.delete("scope");
    } else {
      nextParams.set("scope", scope);
    }

    if (sort === "popularity") {
      nextParams.delete("sort");
    } else {
      nextParams.set("sort", sort);
    }

    nextParams.delete("page");

    const nextSearch = nextParams.toString();
    router.replace(nextSearch ? `/search?${nextSearch}` : "/search");
  }

  function updatePage(nextPage) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextPage <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(nextPage));
    }

    const nextSearch = nextParams.toString();
    router.replace(nextSearch ? `/search?${nextSearch}` : "/search");
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Search" title="Find titles fast" description="Search across movies, shows, people, and production companies." />

      <form
        onSubmit={submitSearch}
        className="surface grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]"
      >
        <label className="flex flex-col gap-2 text-sm text-white/55">
          <span>Search query</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitSearch(event);
              }
            }}
            placeholder="Search titles, franchises, people..."
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
          />
          <span className="text-xs uppercase tracking-[0.18em] text-white/34">Press Enter to search</span>
        </label>

        <label className="flex flex-col gap-2 text-sm text-white/55">
          <span>Scope</span>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="brand-select"
          >
            {SEARCH_SCOPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-white/55">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="brand-select"
          >
            <option value="popularity">Popularity</option>
            <option value="latest">Newest</option>
            <option value="rating">Rating</option>
          </select>
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black sm:col-span-2 lg:col-span-1 lg:self-end"
        >
          Search
        </button>
      </form>

      {!activeQuery ? (
        <EmptyState
          title="Start with a title, show, or actor"
          description="The global search uses TMDB's search endpoints and routes into canonical title, person, and company pages."
        />
      ) : null}

      {loading && activeQuery ? <PosterGridSkeleton cards={12} /> : null}

      {error ? (
        <div className="surface p-6 text-sm text-rose-200">Search failed: {error.message}</div>
      ) : null}

      {activeQuery && !loading && !mediaResults.length && !peopleResults.length && !companyResults.length ? (
        <EmptyState
          title="No matches found"
          description="Try a broader title, remove year terms, or switch scope to all results."
        />
      ) : null}

      {mediaResults.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Titles</h2>
            <p className="mt-1 text-sm text-white/55">Open a detail page to fetch canonical metadata and playback options.</p>
          </div>
          <MediaGrid items={mediaResults} configuration={configuration} />
        </section>
      ) : null}

      {peopleResults.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">People</h2>
            <p className="mt-1 text-sm text-white/55">Open a profile to see biography and known credits.</p>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {peopleResults.map((person) => (
              <AppLink
                key={person.id}
                href={`/person/${person.id}`}
                className="surface overflow-hidden p-0 transition hover:bg-white/[0.06]"
              >
                <div className="aspect-[2/3] overflow-hidden bg-white/[0.03]">
                  <img
                    src={buildPosterUrl(person.profile_path, configuration)}
                    alt={person.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 hover:scale-[1.04]"
                  />
                </div>
                <div className="p-3 sm:p-4">
                  <p className="line-clamp-1 text-base font-semibold text-white sm:text-lg">{person.name}</p>
                  <p className="mt-2 text-xs text-white/55 sm:text-sm">{person.known_for_department || "Performer"}</p>
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/50 sm:text-sm sm:leading-6">
                    {(person.known_for || [])
                      .map((item) => item.title || item.name)
                      .filter(Boolean)
                      .join(", ") || "Known-for titles are limited in the multi search response."}
                  </p>
                </div>
              </AppLink>
            ))}
          </div>
        </section>
      ) : null}

      {companyResults.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Companies</h2>
            <p className="mt-1 text-sm text-white/55">Open a production company page to browse its TMDB-linked movies and TV shows.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {companyResults.map((company) => (
              <AppLink
                key={company.id}
                href={`/company/${company.id}`}
                className="surface overflow-hidden transition hover:bg-white/[0.06]"
              >
                <div className="flex min-h-[180px] flex-col justify-between gap-6 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-white/10 bg-black/22 p-3">
                      {company.logo_path ? (
                        <img
                          src={buildImageUrl(company.logo_path, "w300", configuration)}
                          alt={company.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-white/48" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/40">Production Company</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{company.name}</h3>
                      <p className="mt-3 text-sm text-white/55">
                        {company.origin_country ? `Origin country: ${company.origin_country}` : "TMDB company profile"}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-white/76">Open company page</div>
                </div>
              </AppLink>
            ))}
          </div>
        </section>
      ) : null}

      {activeQuery && results.length ? (
        <div className="surface flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-white/55">
            Page {activePage} of {totalPages}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => updatePage(Math.max(1, activePage - 1))}
              disabled={activePage === 1}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => updatePage(Math.min(totalPages, activePage + 1))}
              disabled={activePage >= totalPages}
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
