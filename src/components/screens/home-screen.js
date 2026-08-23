"use client";

import { useEffect, useMemo, useState } from "react";
import { HOME_RAILS } from "@/lib/discovery";
import { isUpcomingMedia, normalizeMediaItem } from "@/lib/media";
import { formatFullDate } from "@/lib/utils";
import { useTmdbConfiguration } from "@/hooks/use-tmdb-query";
import { tmdbClientGet } from "@/lib/tmdb-client";
import { useAppState } from "@/lib/app-state";
import { CinematicSpotlight } from "@/components/cinematic-spotlight";
import { MediaHero } from "@/components/media-hero";
import { MediaRail } from "@/components/media-rail";
import { TopTenRail } from "@/components/top-ten-rail";
import { PosterRowSkeleton } from "@/components/loading-state";

function getMediaKey(item) {
  const media = normalizeMediaItem(item, item?.media_type || item?.mediaType);
  return media ? `${media.mediaType}:${media.id}` : null;
}

function collectKeys(items = []) {
  return new Set(items.map(getMediaKey).filter(Boolean));
}

function mergeKeySets(...sets) {
  const next = new Set();

  sets.forEach((set) => {
    if (!set) {
      return;
    }

    set.forEach((value) => next.add(value));
  });

  return next;
}

function dedupeItems(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const key = getMediaKey(item);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function applyRailMediaType(rail) {
  return (rail?.data?.results || []).map((item) =>
    item?.media_type || item?.mediaType || !rail?.mediaType
      ? item
      : {
          ...item,
          mediaType: rail.mediaType,
        },
  );
}

function formatTmdbDate(value) {
  return value.toISOString().slice(0, 10);
}

function getReleaseTimestamp(item) {
  const releaseDate = normalizeMediaItem(item, item?.media_type || item?.mediaType)?.releaseDate;

  if (!releaseDate) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(releaseDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function hasPosterImage(item) {
  return Boolean(normalizeMediaItem(item, item?.media_type || item?.mediaType)?.posterPath);
}

function sortByReleaseDate(items = []) {
  return [...items].sort((left, right) => getReleaseTimestamp(left) - getReleaseTimestamp(right));
}

function filterMovieAndTv(items = []) {
  return items.filter((item) => {
    const mediaType = String(item?.media_type || item?.mediaType || "").toLowerCase();
    return mediaType === "movie" || mediaType === "tv";
  });
}

function removeSeenItems(items = [], seenKeys, minimumCount = 8) {
  if (!seenKeys?.size) {
    return items;
  }

  const filtered = items.filter((item) => {
    const key = getMediaKey(item);
    return key ? !seenKeys.has(key) : false;
  });

  if (filtered.length >= Math.min(minimumCount, items.length)) {
    return filtered;
  }

  return items;
}

function getRotationSeed() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function rotateValues(values = [], offset = 0) {
  if (!values.length) {
    return values;
  }

  const startIndex = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(startIndex), ...values.slice(0, startIndex)];
}

function chooseSpotlight(candidateKeys, railEntries, rotationSeed, seenKeys) {
  const rotatedKeys = rotateValues(candidateKeys, rotationSeed);

  for (const key of rotatedKeys) {
    const rail = railEntries[key];

    if (!rail?.items?.length) {
      continue;
    }

    const items = removeSeenItems(rail.items, seenKeys, 5);

    if (items.length) {
      return {
        key,
        title: rail.title,
        items,
      };
    }
  }

  return null;
}

function RailGroup({ children }) {
  return (
    <section className="surface noise relative overflow-hidden px-4 py-5 sm:px-5 sm:py-6 lg:px-7 lg:py-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(227,31,92,0.12),transparent_30%)]" />
      <div className="relative space-y-5 sm:space-y-6">{children}</div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <div className="-mx-4 min-h-[clamp(32rem,68vw,47rem)] animate-pulse bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025)_48%,rgba(227,31,92,0.08))] xl:-mx-8">
      <div className="flex h-full min-h-[clamp(32rem,68vw,47rem)] flex-col justify-end px-4 pb-10 pt-32 sm:px-6 md:px-10 lg:px-12 xl:px-16">
        <div className="h-4 w-36 rounded-full bg-white/10" />
        <div className="mt-5 h-16 w-[min(70vw,420px)] rounded-2xl bg-white/10 sm:h-20" />
        <div className="mt-5 flex gap-2">
          <div className="h-8 w-24 rounded-full bg-white/8" />
          <div className="h-8 w-28 rounded-full bg-white/8" />
          <div className="hidden h-8 w-24 rounded-full bg-white/8 sm:block" />
        </div>
        <div className="mt-6 max-w-2xl space-y-3">
          <div className="h-3 w-full rounded-full bg-white/8" />
          <div className="h-3 w-4/5 rounded-full bg-white/8" />
          <div className="h-3 w-3/5 rounded-full bg-white/8" />
        </div>
        <div className="mt-7 flex gap-3">
          <div className="h-11 w-28 rounded-full bg-white/12" />
          <div className="h-11 w-28 rounded-full bg-white/8" />
        </div>
      </div>
    </div>
  );
}

function TopTenSkeleton() {
  return (
    <section className="space-y-4">
      <div className="h-8 w-28 rounded-full bg-white/10" />
      <div className="flex gap-7 overflow-hidden py-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex w-[190px] shrink-0 items-end">
            <div className="h-28 w-20 animate-pulse rounded-2xl bg-white/[0.06] sm:h-36 sm:w-24" />
            <div className="-ml-8 aspect-[2/3] w-[118px] animate-pulse rounded-[24px] bg-white/8 sm:w-[142px]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function SpotlightSkeleton() {
  return (
    <section className="min-h-[22rem] animate-pulse overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025)_50%,rgba(227,31,92,0.08))] p-5 sm:min-h-[26rem] sm:p-7">
      <div className="flex h-full min-h-[18rem] flex-col justify-end">
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="mt-4 h-10 w-[min(70vw,360px)] rounded-2xl bg-white/10" />
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] rounded-[20px] bg-white/8" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeScreen() {
  const { data: configuration, loading: configurationLoading } = useTmdbConfiguration();
  const { ready, settings } = useAppState();
  const [rails, setRails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRails() {
      try {
        setLoading(true);
        const responses = await Promise.all(
          HOME_RAILS.map(async (rail) => {
            if (rail.key === "upcoming-releases") {
              const today = new Date();
              const nextYear = new Date(today);
              nextYear.setFullYear(today.getFullYear() + 1);

              const [movieUpcoming, tvUpcoming] = await Promise.all([
                tmdbClientGet("movie/upcoming", {
                  language: settings.language,
                  region: settings.region,
                  page: 1,
                }),
                tmdbClientGet("discover/tv", {
                  language: settings.language,
                  page: 1,
                  sort_by: "first_air_date.asc",
                  "first_air_date.gte": formatTmdbDate(today),
                  "first_air_date.lte": formatTmdbDate(nextYear),
                }),
              ]);

              return {
                ...rail,
                data: {
                  results: [
                    ...(movieUpcoming?.results || []),
                    ...((tvUpcoming?.results || []).map((item) => ({
                      ...item,
                      mediaType: "tv",
                    })) || []),
                  ],
                },
              };
            }

            return {
              ...rail,
              data: await tmdbClientGet(rail.path, {
                language: settings.language,
                page: 1,
                ...(rail.params || {}),
              }),
            };
          }),
        );

        if (!cancelled) {
          setRails(responses);
          setError(null);
          setLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError);
          setLoading(false);
        }
      }
    }

    loadRails();

    return () => {
      cancelled = true;
    };
  }, [settings.language, settings.region]);

  const homeData = useMemo(() => {
    const railEntries = Object.fromEntries(
      rails.map((rail) => {
        const items = rail.key === "trending-mixed" ? filterMovieAndTv(applyRailMediaType(rail)) : applyRailMediaType(rail);

        return [
          rail.key,
          {
            ...rail,
            items: dedupeItems(items),
          },
        ];
      }),
    );

    const mixedTrending = railEntries["trending-mixed"]?.items || [];
    const trendingMovies = railEntries["trending-movies"]?.items || [];
    const trendingSeries = railEntries["trending-series"]?.items || [];
    const upcomingReleases = sortByReleaseDate(
      (railEntries["upcoming-releases"]?.items || []).filter(
        (item) => isUpcomingMedia(item, item?.media_type || item?.mediaType || "movie") && hasPosterImage(item),
      ),
    ).slice(0, 14);

    const heroItems = mixedTrending.slice(0, 6);
    const topTenItems = mixedTrending.slice(0, 10);
    const leadKeys = mergeKeySets(collectKeys(heroItems), collectKeys(topTenItems));

    const trendingMoviesItems = removeSeenItems(trendingMovies, leadKeys, 10);
    const trendingSeriesItems = removeSeenItems(trendingSeries, leadKeys, 10);
    const trendingKeys = mergeKeySets(
      leadKeys,
      collectKeys(trendingMoviesItems.slice(0, 12)),
      collectKeys(trendingSeriesItems.slice(0, 12)),
    );

    const rotationSeed = getRotationSeed();
    const spotlightOne = chooseSpotlight(["top-rated-movies", "top-rated-series", "fantasy", "crime"], railEntries, rotationSeed, trendingKeys);
    const spotlightOneKeys = mergeKeySets(trendingKeys, collectKeys(spotlightOne?.items?.slice(0, 5) || []));
    const spotlightTwo = chooseSpotlight(["horror", "sci-fi", "animation", "drama"], railEntries, rotationSeed + 2, spotlightOneKeys);
    const hiddenRowKeys = new Set([spotlightOne?.key, spotlightTwo?.key].filter(Boolean));

    return {
      heroItems,
      topTenItems,
      trendingMoviesItems,
      trendingSeriesItems,
      upcomingReleases,
      spotlightOne,
      spotlightTwo,
      hiddenRowKeys,
      action: railEntries.action?.items || [],
      romance: railEntries.romance?.items || [],
      horror: railEntries.horror?.items || [],
      comedy: railEntries.comedy?.items || [],
      animation: railEntries.animation?.items || [],
      crime: railEntries.crime?.items || [],
      sciFi: railEntries["sci-fi"]?.items || [],
      drama: railEntries.drama?.items || [],
      thriller: railEntries.thriller?.items || [],
      family: railEntries.family?.items || [],
      documentary: railEntries.documentary?.items || [],
      fantasy: railEntries.fantasy?.items || [],
    };
  }, [rails]);

  return (
    <div className="space-y-6 sm:space-y-7 lg:space-y-8">
      {ready && !loading && !configurationLoading ? (
        <MediaHero items={homeData.heroItems} configuration={configuration} />
      ) : (
        <HeroSkeleton />
      )}

      {!loading && !configurationLoading && homeData.topTenItems.length ? (
        <TopTenRail title="Top 10" items={homeData.topTenItems} configuration={configuration} />
      ) : loading || configurationLoading ? (
        <TopTenSkeleton />
      ) : null}

      {!loading && !configurationLoading ? (
        <RailGroup>
          <div className="grid min-w-0 gap-5 xl:grid-cols-2 xl:gap-6">
            <MediaRail title="Trending Movies" items={homeData.trendingMoviesItems} configuration={configuration} variant="compact" />
            <MediaRail title="Trending Series" items={homeData.trendingSeriesItems} configuration={configuration} variant="compact" />
          </div>
        </RailGroup>
      ) : (
        <RailGroup>
          <div className="grid min-w-0 gap-5 xl:grid-cols-2 xl:gap-6">
            <PosterRowSkeleton cards={4} />
            <PosterRowSkeleton cards={4} />
          </div>
        </RailGroup>
      )}

      {!loading && !configurationLoading ? (
        <MediaRail
          title="Upcoming Releases"
          items={homeData.upcomingReleases}
          configuration={configuration}
          secondaryLabelForItem={(item) => `Releases ${formatFullDate(item.release_date || item.first_air_date)}`}
        />
      ) : (
        <PosterRowSkeleton cards={7} />
      )}

      {!loading && !configurationLoading && homeData.spotlightOne ? (
        <CinematicSpotlight title={homeData.spotlightOne.title} items={homeData.spotlightOne.items} configuration={configuration} />
      ) : loading || configurationLoading ? (
        <SpotlightSkeleton />
      ) : null}

      {!loading && !configurationLoading ? <MediaRail title="Action" items={homeData.action} configuration={configuration} /> : null}

      {!loading && !configurationLoading ? <MediaRail title="Romance" items={homeData.romance} configuration={configuration} /> : null}

      {!loading && !configurationLoading && !homeData.hiddenRowKeys.has("horror") ? (
        <MediaRail title="Horror" items={homeData.horror} configuration={configuration} />
      ) : null}

      {!loading && !configurationLoading ? <MediaRail title="Comedy" items={homeData.comedy} configuration={configuration} /> : null}

      {!loading && !configurationLoading && !homeData.hiddenRowKeys.has("animation") ? (
        <MediaRail title="Animation" items={homeData.animation} configuration={configuration} />
      ) : null}

      {!loading && !configurationLoading && homeData.spotlightTwo ? (
        <CinematicSpotlight title={homeData.spotlightTwo.title} items={homeData.spotlightTwo.items} configuration={configuration} />
      ) : loading || configurationLoading ? (
        <SpotlightSkeleton />
      ) : null}

      {!loading && !configurationLoading && !homeData.hiddenRowKeys.has("crime") ? (
        <MediaRail title="Crime" items={homeData.crime} configuration={configuration} />
      ) : null}

      {!loading && !configurationLoading && !homeData.hiddenRowKeys.has("sci-fi") ? (
        <MediaRail title="Sci-Fi" items={homeData.sciFi} configuration={configuration} />
      ) : null}

      {!loading && !configurationLoading && !homeData.hiddenRowKeys.has("drama") ? (
        <MediaRail title="Drama" items={homeData.drama} configuration={configuration} />
      ) : null}

      {!loading && !configurationLoading ? (
        <MediaRail title="Thriller" items={homeData.thriller} configuration={configuration} />
      ) : null}

      {!loading && !configurationLoading ? <MediaRail title="Family" items={homeData.family} configuration={configuration} /> : null}

      {!loading && !configurationLoading ? (
        <MediaRail title="Documentary" items={homeData.documentary} configuration={configuration} />
      ) : null}

      {!loading && !configurationLoading && !homeData.hiddenRowKeys.has("fantasy") ? (
        <MediaRail title="Fantasy" items={homeData.fantasy} configuration={configuration} />
      ) : null}

      {error ? <div className="surface p-6 text-sm text-rose-200">TMDB rails failed to load: {error.message}</div> : null}

      {loading || configurationLoading
        ? Array.from({ length: 8 }).map((_, index) => <PosterRowSkeleton key={index} />)
        : null}
    </div>
  );
}
