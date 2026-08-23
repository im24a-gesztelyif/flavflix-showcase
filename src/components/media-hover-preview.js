"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, BookmarkCheck, CalendarClock, Info, Play } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { RatingRing } from "@/components/rating-ring";
import { getDetailHref, getWatchHref } from "@/lib/media";
import { buildImageUrl, cn, formatFullDate } from "@/lib/utils";

export function MediaHoverPreview({
  anchorRef,
  configuration,
  media,
  onMouseEnter,
  onMouseLeave,
  onToggleSaved,
  overlayAction,
  saved,
  secondaryLabel,
  playable = true,
}) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!anchorRef.current || !media) {
      return undefined;
    }

    let frameId = null;

    function updatePosition() {
      const rect = anchorRef.current.getBoundingClientRect();
      const previewHeight = previewRef.current?.offsetHeight || 332;
      const preferredWidth = Math.max(rect.width * 2.02, 360);
      const width = Math.min(preferredWidth, Math.min(470, window.innerWidth - 32));
      const centeredLeft = rect.left + rect.width / 2 - width / 2;
      const left = Math.min(Math.max(centeredLeft, 16), window.innerWidth - width - 16);
      const centeredTop = rect.top + rect.height / 2 - previewHeight / 2;
      const top = Math.min(Math.max(centeredTop, 16), window.innerHeight - previewHeight - 16);

      setPosition({
        left,
        top,
        width,
      });
    }

    function schedulePositionUpdate() {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updatePosition();
      });
    }

    updatePosition();
    schedulePositionUpdate();
    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, { capture: true, passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
    };
  }, [anchorRef, media]);

  if (!mounted || !position || !media) {
    return null;
  }

  return createPortal(
    <div
      ref={previewRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="pointer-events-auto fixed z-[75] origin-top-left animate-[hoverPreviewIn_.18s_ease-out] overflow-hidden rounded-[30px] border border-white/12 bg-[#09090cf4] shadow-[0_36px_90px_rgba(0,0,0,0.55)]"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
      }}
    >
      <AppLink href={getDetailHref(media.mediaType, media.id)} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-black">
          <img
            src={buildImageUrl(media.backdropPath || media.posterPath, "w780", configuration)}
            alt={media.title}
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/24 to-transparent" />
        </div>
      </AppLink>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="line-clamp-2 text-lg font-semibold text-white">{media.title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">
              {media.year} | {media.mediaType}
            </p>
          </div>
          <RatingRing value={media.voteAverage} size={44} strokeWidth={4} />
        </div>

        <div className="flex items-center gap-2">
          {playable ? (
            <AppLink
              href={getWatchHref(media.mediaType, media.id)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black"
            >
              <Play className="h-4 w-4 fill-current" />
              Play
            </AppLink>
          ) : (
            <div className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white/68">
              <CalendarClock className="h-4 w-4" />
              Coming {formatFullDate(media.releaseDate)}
            </div>
          )}
          <AppLink
            href={getDetailHref(media.mediaType, media.id)}
            className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] p-3 text-white/82"
            aria-label="View details"
          >
            <Info className="h-4 w-4" />
          </AppLink>
          <button
            type="button"
            onClick={onToggleSaved}
            className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] p-3 text-white/82"
            aria-label={saved ? "Remove from My List" : "Save to My List"}
          >
            {saved ? <BookmarkCheck className="h-4 w-4 text-accent-200" /> : <Bookmark className="h-4 w-4" />}
          </button>
          {overlayAction ? overlayAction : null}
        </div>

        <p className="line-clamp-4 text-sm leading-7 text-white/66">{media.overview || "No overview available."}</p>

        {secondaryLabel ? (
          <p
            className={cn(
              "text-[11px] uppercase tracking-[0.22em] text-accent-200",
              !media.overview && "pt-1",
            )}
          >
            {secondaryLabel}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
