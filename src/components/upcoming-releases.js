"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { useTmdbQuery } from "@/hooks/use-tmdb-query";
import { selectUpcomingTitles } from "@/lib/upcoming";
import { buildImageUrl, formatFullDate } from "@/lib/utils";

export function UpcomingReleases({ mediaType, settings, configuration }) {
  const railRef = useRef(null);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 180);
  const dateField = mediaType === "movie" ? "primary_release_date" : "first_air_date";
  const query = useTmdbQuery(`discover/${mediaType}`, {
    language: settings.language,
    include_adult: false,
    sort_by: "popularity.desc",
    [`${dateField}.gte`]: today,
    [`${dateField}.lte`]: horizon.toISOString().slice(0, 10),
  });
  const items = selectUpcomingTitles(query.data?.results, mediaType, today);
  if (!query.loading && !items.length) return null;
  return (
    <section aria-label="Upcoming Releases">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Upcoming Releases</h2>
        {items.length > 1 ? <div className="flex gap-2">
          {[-1, 1].map((direction) => <button key={direction} type="button" aria-label={`Scroll upcoming releases ${direction < 0 ? "left" : "right"}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 hover:bg-white/10" onClick={() => railRef.current?.scrollBy({ left: direction * (railRef.current.clientWidth + 20), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>{direction < 0 ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>)}
        </div> : null}
      </div>
      <div ref={railRef} className="scrollbar-none flex snap-x gap-5 overflow-x-auto pb-4">
        {query.loading && !query.data ? [0, 1, 2, 3].map((key) => <div key={key} className="aspect-video w-[78vw] shrink-0 animate-pulse rounded-xl bg-white/5 sm:w-80" />) : items.map((item) => (
          <AppLink key={item.id} href={`/${mediaType}/${item.id}`} className="group w-[78vw] shrink-0 snap-start sm:w-80 xl:w-[calc((100%_-_3.75rem)/4)]">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-white/5">
              <img src={buildImageUrl(item.backdrop_path, "w780", configuration)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-t-lg bg-accent-700 px-3 py-1.5 text-xs font-semibold">Coming Soon</span>
            </div>
            <p className="mt-3 truncate font-semibold">{item.title || item.name}</p>
            <p className="mt-1 text-xs text-white/55">{formatFullDate(item.release_date || item.first_air_date)}</p>
          </AppLink>
        ))}
      </div>
    </section>
  );
}
