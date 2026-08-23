"use client";

import { Clapperboard, Play, Star } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { getDetailHref, getWatchHref, isPlayableMedia, normalizeMediaItem } from "@/lib/media";
import { buildImageUrl, buildPosterUrl, formatVote } from "@/lib/utils";

function CompactSpotlightTile({ item, configuration }) {
  const media = normalizeMediaItem(item, item.media_type || item.mediaType);

  if (!media) {
    return null;
  }

  return (
    <AppLink
      href={getDetailHref(media.mediaType, media.id)}
      className="group relative min-h-[13rem] overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d11] shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:min-h-[15rem] xl:min-h-0"
    >
      <img
        src={buildImageUrl(media.backdropPath || media.posterPath, "w780", configuration)}
        alt={media.title}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.72),transparent_56%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/42 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="line-clamp-2 text-sm font-semibold text-white sm:text-base">{media.title}</p>
        <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/52">
          <span>{media.mediaType === "movie" ? "Movie" : "Series"}</span>
          <span className="h-1 w-1 rounded-full bg-white/25" />
          <span>{media.year}</span>
        </div>
      </div>
    </AppLink>
  );
}

export function CinematicSpotlight({ eyebrow, title, subtitle, items = [], configuration }) {
  const [lead, ...supporting] = items;
  const media = normalizeMediaItem(lead, lead?.media_type || lead?.mediaType);

  if (!media) {
    return null;
  }

  const playable = isPlayableMedia(lead, lead?.media_type || lead?.mediaType);

  return (
    <section className="surface-strong noise relative overflow-hidden px-4 py-5 sm:px-5 sm:py-6 lg:px-7 lg:py-7">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-34"
        style={{
          backgroundImage: `url(${buildImageUrl(media.backdropPath || media.posterPath, "w1280", configuration)})`,
        }}
      />
      <div className="absolute inset-0 bg-[#0505074f]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050507df] via-[#050507ad] to-[#0505073f]" />

      <div className="relative space-y-5 sm:space-y-6">
        <div className="max-w-3xl">
          {eyebrow ? <p className="text-[10px] uppercase tracking-[0.3em] text-accent-200 sm:text-xs">{eyebrow}</p> : null}
          <h2 className="mt-2 text-[clamp(1.35rem,1.5vw+1rem,2.2rem)] font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm leading-7 text-white/60">{subtitle}</p> : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.9fr)] xl:items-stretch">
          <article className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/28 shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={buildImageUrl(media.backdropPath || media.posterPath, "w1280", configuration)}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050507df] via-[#0505079e] to-[#0505074d]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050507e6] via-transparent to-transparent" />
            </div>

            <div className="relative flex min-h-[22rem] flex-col justify-end p-5 sm:min-h-[24rem] sm:p-6 lg:min-h-[26rem] lg:p-7">
              <div className="max-w-[34rem]">
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/55">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/28 px-3 py-1.5 tracking-[0.22em] text-white/65">
                    <Clapperboard className="h-3.5 w-3.5 text-accent-200" />
                    {media.mediaType === "movie" ? "Movie" : "Series"}
                  </span>
                  <span>{media.year}</span>
                  <span className="h-1 w-1 rounded-full bg-white/24" />
                  <span className="inline-flex items-center gap-1 tracking-normal text-white/72">
                    <Star className="h-3.5 w-3.5 text-yellow-300" />
                    {formatVote(media.voteAverage)} TMDB
                  </span>
                </div>
                <h3 className="mt-5 text-[clamp(1.8rem,2.6vw,3.4rem)] font-semibold text-white">{media.title}</h3>
                <p className="mt-4 max-w-2xl line-clamp-4 text-sm leading-7 text-white/72 sm:text-[15px]">{media.overview}</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <AppLink
                    href={playable ? getWatchHref(media.mediaType, media.id) : getDetailHref(media.mediaType, media.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-100"
                  >
                    {playable ? <Play className="h-4 w-4 fill-current" /> : null}
                    {playable ? "Play Now" : "More Info"}
                  </AppLink>
                  <AppLink
                    href={getDetailHref(media.mediaType, media.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white/86 transition hover:border-white/20 hover:bg-white/[0.1]"
                  >
                    Details
                  </AppLink>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {supporting.slice(0, 4).map((item) => (
              <CompactSpotlightTile
                key={`${item.media_type || item.mediaType}-${item.id}`}
                item={item}
                configuration={configuration}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
