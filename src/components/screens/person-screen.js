"use client";

import { useMemo } from "react";
import { MediaGrid } from "@/components/media-grid";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { useAppState } from "@/lib/app-state";
import { useTmdbConfiguration, useTmdbQuery } from "@/hooks/use-tmdb-query";
import { buildPosterUrl, formatFullDate } from "@/lib/utils";

function createKnownForKey(item) {
  return `${item.media_type || item.mediaType}-${item.id}`;
}

function dedupeKnownForItems(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const mediaType = item.media_type || item.mediaType;

    if (!item?.id || (mediaType !== "movie" && mediaType !== "tv")) {
      return false;
    }

    const key = createKnownForKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function scoreKnownForFallback(item, preferredDepartment) {
  const popularity = Number(item.popularity || 0);
  const voteAverage = Number(item.vote_average || 0);
  const voteCount = Number(item.vote_count || 0);
  const departmentBoost =
    preferredDepartment && (item.department === preferredDepartment || item.known_for_department === preferredDepartment)
      ? 250
      : 0;
  return departmentBoost + popularity * 10 + voteAverage * 25 + Math.log10(voteCount + 1) * 120;
}

export function PersonScreen({ id }) {
  const { settings } = useAppState();
  const { data: configuration } = useTmdbConfiguration();
  const personQuery = useTmdbQuery(`person/${id}`, {
    language: settings.language,
    append_to_response: "combined_credits,images,external_ids",
  });
  const person = personQuery.data;
  const knownForQuery = useTmdbQuery(
    "search/person",
    {
      query: person?.name,
      language: settings.language,
      include_adult: false,
      page: 1,
    },
    {
      enabled: Boolean(person?.name),
    },
  );
  const knownFor = useMemo(() => {
    if (!person) {
      return [];
    }

    const searchMatch = (knownForQuery.data?.results || []).find((result) => result.id === Number(id));
    const directKnownFor = dedupeKnownForItems(searchMatch?.known_for || []);
    const fallbackSource = [
      ...(person.combined_credits?.cast || []),
      ...(person.combined_credits?.crew || []),
    ];

    const fallbackCredits = dedupeKnownForItems(fallbackSource)
      .sort((left, right) => scoreKnownForFallback(right, person.known_for_department) - scoreKnownForFallback(left, person.known_for_department));

    const fallbackByKey = new Map(fallbackCredits.map((item) => [createKnownForKey(item), item]));
    const merged = [...directKnownFor];

    fallbackCredits.forEach((item) => {
      const key = createKnownForKey(item);

      if (!fallbackByKey.has(key)) {
        return;
      }

      if (merged.some((knownItem) => createKnownForKey(knownItem) === key)) {
        return;
      }

      merged.push(item);
    });

    return merged;
  }, [id, knownForQuery.data?.results, person]);

  if (personQuery.loading && !personQuery.data) {
    return <LoadingState title="Loading person" description="Fetching biography and credits." />;
  }

  if (personQuery.error || !personQuery.data) {
    return (
      <div className="surface p-6 text-sm text-rose-200">
        Failed to load this person: {personQuery.error?.message || "Missing TMDB payload."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <img
          src={buildPosterUrl(person.profile_path, configuration)}
          alt={person.name}
          loading="lazy"
          decoding="async"
          className="mx-auto w-full max-w-[220px] rounded-[24px] border border-white/10 object-cover sm:max-w-[260px] sm:rounded-[28px] lg:mx-0"
        />

        <div>
          <PageHeader title={person.name} description={person.biography || "No biography available yet."} />

          <div className="flex flex-wrap gap-2 sm:gap-3 text-sm text-white/70">
            {person.known_for_department ? (
              <span className="rounded-full border border-white/10 px-3 py-1">{person.known_for_department}</span>
            ) : null}
            {person.birthday ? (
              <span className="rounded-full border border-white/10 px-3 py-1">{formatFullDate(person.birthday)}</span>
            ) : null}
            {person.deathday ? (
              <span className="rounded-full border border-white/10 px-3 py-1">{formatFullDate(person.deathday)}</span>
            ) : null}
            {person.place_of_birth ? (
              <span className="rounded-full border border-white/10 px-3 py-1">{person.place_of_birth}</span>
            ) : null}
          </div>

          <TmdbAttribution
            variant="altShort"
            compact
            logoScale={1.1}
            className="mt-6 max-w-[440px]"
            title="Person metadata by TMDB"
            body="Biography, dates, and combined credits on this page are provided by TMDB."
          />
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Known For</h2>
          <p className="mt-1 text-sm text-white/55">
            Starts with TMDB&apos;s own `known_for` entries, then extends with the full deduped combined cast and crew credits.
          </p>
        </div>
        <MediaGrid items={knownFor} configuration={configuration} />
      </section>
    </div>
  );
}
