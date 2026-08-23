"use client";

import { CalendarDays, Clapperboard, Play, Star } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { getDetailHref, getWatchHref, isPlayableMedia, normalizeMediaItem } from "@/lib/media";
import { buildImageUrl, buildPosterUrl, formatFullDate, formatVote } from "@/lib/utils";

function truncateCopy(text, limit = 220) {
  if (!text) {
    return "No synopsis available yet.";
  }

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 3).trimEnd()}...`;
}

export function FeaturedShowcase({ item, configuration, label }) {
  const media = normalizeMediaItem(item, item.media_type || item.mediaType);

  if (!media) {
    return null;
  }

  const playable = isPlayableMedia(item, item.media_type || item.mediaType);
  const dateLabel = formatFullDate(media.releaseDate);

  return (
    <section className="surface-strong noise relative overflow-hidden p-5 sm:p-6 md:p-8 xl:p-10">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-28"
        style={{ backgroundImage: `url(${buildImageUrl(media.backdropPath || media.posterPath, "w1280", configuration)})` }}
      />
      <div className="absolute inset-0 bg-[#05050766]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050507ea] via-[#050507cc] to-[#05050760]" />
      <div className="relative grid gap-5 sm:gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-end lg:gap-8">
        <img
          src={buildPosterUrl(media.posterPath, configuration)}
          alt={media.title}
          loading="lazy"
          decoding="async"
          className="mx-auto w-full max-w-[220px] rounded-[26px] border border-white/10 object-cover shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:max-w-[260px] lg:mx-0 lg:max-w-[300px] lg:rounded-[30px] lg:shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
        />

        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-accent-200">{label}</p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-white sm:text-4xl md:text-6xl">
            {media.title}
          </h2>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/82">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/28 px-3 py-1.5">
              <Clapperboard className="h-4 w-4 text-accent-200" />
              {media.mediaType === "movie" ? "Movie" : "TV Series"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/28 px-3 py-1.5">
              <CalendarDays className="h-4 w-4 text-accent-200" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/28 px-3 py-1.5">
              <Star className="h-4 w-4 text-yellow-300" />
              {formatVote(media.voteAverage)} TMDB
            </span>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/72">{truncateCopy(media.overview)}</p>

          <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
            {playable ? (
              <AppLink
                href={getWatchHref(media.mediaType, media.id)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black sm:px-5"
              >
                <Play className="h-4 w-4 fill-current" />
                Watch Now
              </AppLink>
            ) : (
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white/72">
                Releases {dateLabel}
              </div>
            )}

            <AppLink
              href={getDetailHref(media.mediaType, media.id)}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white/84 sm:px-5"
            >
              More Info
            </AppLink>
          </div>
        </div>
      </div>
    </section>
  );
}
