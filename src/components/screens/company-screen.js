"use client";

import { useEffect, useState } from "react";
import { Building2, Clapperboard, ExternalLink, Globe2, MapPin, Tv2 } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { LoadingState } from "@/components/loading-state";
import { MediaGrid } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { useAppState } from "@/lib/app-state";
import { useTmdbConfiguration, useTmdbQuery } from "@/hooks/use-tmdb-query";
import { buildImageUrl } from "@/lib/utils";

function CompanyStatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-accent-200">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-white/42">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function CompanyScreen({ id }) {
  const { settings } = useAppState();
  const { data: configuration } = useTmdbConfiguration();
  const [moviePage, setMoviePage] = useState(1);
  const [tvPage, setTvPage] = useState(1);
  const [movieItems, setMovieItems] = useState([]);
  const [tvItems, setTvItems] = useState([]);
  const companyQuery = useTmdbQuery(`company/${id}`, {
    language: settings.language,
  });
  const moviesQuery = useTmdbQuery("discover/movie", {
    include_adult: false,
    language: settings.language,
    region: settings.region,
    page: moviePage,
    sort_by: "popularity.desc",
    with_companies: id,
    "vote_count.gte": 50,
  });
  const tvQuery = useTmdbQuery("discover/tv", {
    include_adult: false,
    language: settings.language,
    region: settings.region,
    page: tvPage,
    sort_by: "popularity.desc",
    with_companies: id,
    "vote_count.gte": 25,
  });
  const company = companyQuery.data;

  useEffect(() => {
    setMoviePage(1);
    setTvPage(1);
    setMovieItems([]);
    setTvItems([]);
  }, [id, settings.language, settings.region]);

  useEffect(() => {
    if (!moviesQuery.data?.results) {
      return;
    }

    setMovieItems((current) => {
      if (moviePage === 1) {
        return moviesQuery.data.results;
      }

      const knownIds = new Set(current.map((item) => item.id));
      const nextItems = moviesQuery.data.results.filter((item) => !knownIds.has(item.id));
      return [...current, ...nextItems];
    });
  }, [moviePage, moviesQuery.data]);

  useEffect(() => {
    if (!tvQuery.data?.results) {
      return;
    }

    setTvItems((current) => {
      if (tvPage === 1) {
        return tvQuery.data.results;
      }

      const knownIds = new Set(current.map((item) => item.id));
      const nextItems = tvQuery.data.results.filter((item) => !knownIds.has(item.id));
      return [...current, ...nextItems];
    });
  }, [tvPage, tvQuery.data]);

  if (companyQuery.loading && !companyQuery.data) {
    return <LoadingState title="Loading company" description="Fetching company profile, logo, and related productions." />;
  }

  if (companyQuery.error || !companyQuery.data) {
    return (
      <div className="surface p-6 text-sm text-rose-200">
        Failed to load this company: {companyQuery.error?.message || "Missing TMDB payload."}
      </div>
    );
  }

  const logoUrl = company.logo_path ? buildImageUrl(company.logo_path, "w300", configuration) : null;
  const totalMoviePages = Math.min(500, moviesQuery.data?.total_pages || 1);
  const totalTvPages = Math.min(500, tvQuery.data?.total_pages || 1);
  const canLoadMoreMovies = moviePage < totalMoviePages;
  const canLoadMoreTv = tvPage < totalTvPages;

  return (
    <div className="space-y-8">
      <section className="surface-strong noise relative overflow-hidden p-5 sm:p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(92,220,255,0.14),transparent_38%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="flex aspect-square w-full max-w-[220px] items-center justify-center rounded-[30px] border border-[#d8d1c4]/20 bg-[#d8d1c4] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            {logoUrl ? (
              <img src={logoUrl} alt={company.name} loading="lazy" decoding="async" className="h-full w-full object-contain" />
            ) : (
              <span className="font-[family-name:var(--font-display)] text-6xl font-semibold text-white/80">
                {company.name?.charAt(0) || "C"}
              </span>
            )}
          </div>

          <div className="space-y-6">
            <PageHeader
              eyebrow="Company"
              title={company.name}
              description={
                company.description ||
                "Production company details and company-linked movie and TV discovery are provided by TMDB."
              }
            />

            <div className="flex flex-wrap gap-3 text-sm text-white/70">
              {company.origin_country ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                  <Globe2 className="h-4 w-4" />
                  {company.origin_country}
                </span>
              ) : null}
              {company.headquarters ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                  <MapPin className="h-4 w-4" />
                  {company.headquarters}
                </span>
              ) : null}
              {company.parent_company ? (
                <AppLink
                  href={`/company/${company.parent_company.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-white/78 transition hover:bg-white/[0.05]"
                >
                  <Building2 className="h-4 w-4" />
                  Parent: {company.parent_company.name}
                </AppLink>
              ) : null}
              {company.homepage ? (
                <a
                  href={company.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-white/78 transition hover:bg-white/[0.05]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Website
                </a>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <CompanyStatCard icon={Clapperboard} label="Movies" value={moviesQuery.data?.total_results || 0} />
              <CompanyStatCard icon={Tv2} label="TV Shows" value={tvQuery.data?.total_results || 0} />
              <CompanyStatCard icon={Building2} label="Identity" value={company.origin_country || "Global"} />
            </div>

            <TmdbAttribution
              variant="primaryLong"
              compact
              logoScale={1.12}
              className="max-w-[540px]"
              title="Company metadata by TMDB"
              body="Company profile data and the related movie and TV discovery slices on this page come from TMDB."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Movies</h2>
          <p className="mt-2 text-sm text-white/58">
            Popular movie productions currently linked to {company.name} through TMDB&apos;s discover filters.
          </p>
        </div>
        {moviesQuery.loading && !movieItems.length ? (
          <LoadingState title="Loading movies" description="Fetching company-linked movie results from TMDB discover." compact />
        ) : movieItems.length ? (
          <>
            <MediaGrid items={movieItems} configuration={configuration} />
            {canLoadMoreMovies ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setMoviePage((current) => Math.min(totalMoviePages, current + 1))}
                  disabled={moviesQuery.loading}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/82 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {moviesQuery.loading ? "Loading..." : "Load More Movies"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="surface p-6 text-sm text-white/58">TMDB does not currently surface linked movie results for this company.</div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">TV Shows</h2>
          <p className="mt-2 text-sm text-white/58">
            Popular TV productions currently linked to {company.name} through TMDB&apos;s discover filters.
          </p>
        </div>
        {tvQuery.loading && !tvItems.length ? (
          <LoadingState title="Loading TV productions" description="Fetching company-linked TV results from TMDB discover." compact />
        ) : tvItems.length ? (
          <>
            <MediaGrid items={tvItems} configuration={configuration} />
            {canLoadMoreTv ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setTvPage((current) => Math.min(totalTvPages, current + 1))}
                  disabled={tvQuery.loading}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/82 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {tvQuery.loading ? "Loading..." : "Load More TV Shows"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="surface p-6 text-sm text-white/58">TMDB does not currently surface linked TV results for this company.</div>
        )}
      </section>
    </div>
  );
}
