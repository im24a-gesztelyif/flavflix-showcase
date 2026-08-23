"use client";

import { ArrowUpRight, Layers3, Sparkles, Star } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { LoadingState } from "@/components/loading-state";
import { useAppState } from "@/lib/app-state";
import { useTmdbConfiguration, useTmdbQuery } from "@/hooks/use-tmdb-query";
import { buildImageUrl, buildPosterUrl, formatVote, formatYear } from "@/lib/utils";

function CollectionHeroStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-full border border-white/10 bg-black/28 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-center gap-2.5 text-center">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-accent-200">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">{label}</p>
          <p className="mt-1 text-base font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function CollectionArcCard({ part, index, configuration }) {
  const backdropUrl = buildImageUrl(part.backdrop_path || part.poster_path, "w1280", configuration);
  const posterUrl = buildPosterUrl(part.poster_path, configuration);

  return (
    <AppLink
      href={`/movie/${part.id}`}
      className="group relative block overflow-hidden rounded-[30px] border border-white/10 bg-black/24 transition hover:border-white/16"
    >
      <div className="relative min-h-[420px] overflow-hidden sm:min-h-[500px]">
        <img
          src={backdropUrl}
          alt={part.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,8,0.12)_0%,rgba(4,4,8,0.48)_38%,rgba(4,4,8,0.95)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(4,4,8,0.72)_0%,rgba(4,4,8,0)_100%)]" />

        <div className="relative flex min-h-[420px] flex-col justify-between p-5 sm:min-h-[500px] sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              Chapter {index + 1}
            </span>
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/60">
              {formatYear(part.release_date)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/68">
              <Star className="h-3.5 w-3.5 text-yellow-300" />
              {formatVote(part.vote_average)}
            </span>
          </div>

          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-5 text-center lg:flex-row lg:items-end lg:gap-7 lg:text-left">
            <div className="w-full max-w-[190px] shrink-0 overflow-hidden rounded-[28px] border border-[#22181a]/80 bg-black/40 shadow-[0_28px_70px_rgba(0,0,0,0.45)]">
              <img
                src={posterUrl}
                alt={part.title}
                loading="lazy"
                decoding="async"
                className="aspect-[2/3] h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-[0.98] text-white sm:text-4xl lg:text-[3.35rem]">
                {part.title}
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-[15px]">
                {part.overview || "No synopsis is available from TMDB for this collection entry yet."}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/82">
                Open title details
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLink>
  );
}

export function CollectionScreen({ id }) {
  const { settings } = useAppState();
  const { data: configuration } = useTmdbConfiguration();
  const collectionQuery = useTmdbQuery(`collection/${id}`, {
    language: settings.language,
  });
  const leadMovieId = collectionQuery.data?.parts?.[0]?.id;
  const collectionImagesQuery = useTmdbQuery(
    `collection/${id}/images`,
    {
      language: settings.language,
      include_image_language: `${settings.language},null`,
    },
    {
      enabled: Boolean(collectionQuery.data),
    },
  );
  const leadLogoQuery = useTmdbQuery(
    `movie/${leadMovieId}/images`,
    {
      include_image_language: `${settings.language},en,null`,
    },
    {
      enabled: Boolean(leadMovieId),
    },
  );
  const collection = collectionQuery.data;

  if (collectionQuery.loading && !collectionQuery.data) {
    return <LoadingState title="Loading collection" description="Fetching collection metadata, art, and included titles." />;
  }

  if (collectionQuery.error || !collectionQuery.data) {
    return (
      <div className="surface p-6 text-sm text-rose-200">
        Failed to load this collection: {collectionQuery.error?.message || "Missing TMDB payload."}
      </div>
    );
  }

  const parts = [...(collection.parts || [])].sort(
    (left, right) => new Date(left.release_date || 0) - new Date(right.release_date || 0),
  );
  const textlessBackdrops = collectionImagesQuery.data?.backdrops || [];
  const preferredBackdropEntry =
    textlessBackdrops.find((entry) => entry.iso_639_1 === null) ||
    textlessBackdrops.find((entry) => entry.iso_639_1 === "en") ||
    textlessBackdrops[0] ||
    null;
  const featureBackdrops = [
    preferredBackdropEntry?.file_path,
    collection.backdrop_path,
    parts[0]?.backdrop_path,
    parts[1]?.backdrop_path,
  ].filter(Boolean);
  const featuredBackdrop = featureBackdrops[0] || null;
  const averageVote =
    parts.length > 0
      ? (parts.reduce((sum, part) => sum + Number(part.vote_average || 0), 0) / parts.length).toFixed(1)
      : "0.0";
  const years = parts
    .map((part) => formatYear(part.release_date))
    .filter((value) => value && value !== "TBA");
  const spanLabel = years.length ? `${years[0]}-${years[years.length - 1]}` : "TBA";
  const preferredLogoEntry =
    leadLogoQuery.data?.logos?.find((entry) => entry.iso_639_1 === settings.language?.split("-")?.[0]) ||
    leadLogoQuery.data?.logos?.find((entry) => entry.iso_639_1 === "en") ||
    leadLogoQuery.data?.logos?.find((entry) => entry.iso_639_1 === null) ||
    leadLogoQuery.data?.logos?.[0] ||
    null;
  const collectionStem = collection.name?.replace(/\s+Collection$/i, "").trim() || collection.name;

  return (
    <div className="space-y-10 lg:space-y-14">
      <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-24 w-screen overflow-hidden sm:-mt-28">
        {featuredBackdrop ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-72"
              style={{
                backgroundImage: `url(${buildImageUrl(featuredBackdrop, "original", configuration)})`,
                WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 64%, rgba(0,0,0,0) 100%)",
                maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 64%, rgba(0,0,0,0) 100%)",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,8,0.08)_0%,rgba(4,4,8,0.12)_20%,rgba(4,4,8,0.2)_46%,rgba(4,4,8,0.34)_68%,rgba(4,4,8,0)_100%)]" />
          </>
        ) : null}

        <div className="relative mx-auto flex min-h-[calc(100svh-6.75rem)] w-full max-w-[1800px] flex-col items-center justify-end px-4 pb-12 pt-[calc(6.25rem+env(safe-area-inset-top))] text-center sm:px-6 sm:pb-14 sm:pt-[calc(7rem+env(safe-area-inset-top))] lg:px-8 lg:pb-16 lg:pt-[calc(7.5rem+env(safe-area-inset-top))]">
          <div className="w-full max-w-5xl">
            <div className="mx-auto flex flex-col items-center">
              {preferredLogoEntry?.file_path ? (
                <img
                  src={buildImageUrl(preferredLogoEntry.file_path, "w780", configuration)}
                  alt={collectionStem}
                  fetchPriority="high"
                  decoding="async"
                  className="max-h-[120px] w-auto max-w-[min(92vw,760px)] object-contain sm:max-h-[146px] lg:max-h-[180px]"
                />
              ) : (
                <h1 className="font-[family-name:var(--font-display)] text-[2.9rem] font-semibold leading-[0.88] text-white sm:text-[4.4rem] lg:text-[6rem]">
                  {collectionStem}
                </h1>
              )}
              <p className="mt-3 text-[11px] uppercase tracking-[0.42em] text-white/58 sm:text-xs">Collection</p>
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-white/70 sm:text-[15px] sm:leading-8">
              {collection.overview || "Collection data and included titles are supplied by TMDB."}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <CollectionHeroStat icon={Layers3} label="Included Films" value={parts.length} />
              <CollectionHeroStat icon={Sparkles} label="Timeline" value={spanLabel} />
              <CollectionHeroStat icon={Star} label="Average Vote" value={averageVote} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl space-y-5 lg:space-y-6">
        <div className="px-1 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">Collection Arc</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-white sm:text-4xl">
            Every chapter, in release order.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/58">
            A vertical franchise read with large artwork, release sequencing, and direct access into each film.
          </p>
        </div>

        <div className="space-y-5 lg:space-y-6">
          {parts.map((part, index) => (
            <CollectionArcCard key={part.id} part={part} index={index} configuration={configuration} />
          ))}
        </div>
      </section>
    </div>
  );
}
