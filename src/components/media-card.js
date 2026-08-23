"use client";

import { useEffect, useRef, useState } from "react";
import { AppLink } from "@/components/app-link";
import { MediaHoverPreview } from "@/components/media-hover-preview";
import { RatingRing } from "@/components/rating-ring";
import { useAppState } from "@/lib/app-state";
import { getDetailHref, isPlayableMedia, normalizeMediaItem } from "@/lib/media";
import { buildPosterUrl, cn } from "@/lib/utils";

const CARD_SIZE_STYLES = {
  default: "w-[clamp(8.8rem,15vw,13.75rem)]",
  compact: "w-[clamp(7.8rem,13vw,11.5rem)]",
};

export function MediaCard({ item, configuration, className, secondaryLabel, overlayAction, size = "default" }) {
  const { isSaved, toggleSaved } = useAppState();
  const cardRef = useRef(null);
  const closeTimerRef = useRef(null);
  const openTimerRef = useRef(null);
  const visibleRatioRef = useRef(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hoverEnabled, setHoverEnabled] = useState(false);
  const media = normalizeMediaItem(item, item.media_type || item.mediaType);

  function beginHoverIntent() {
    if (!hoverEnabled) {
      return;
    }

    if (visibleRatioRef.current < 0.65) {
      return;
    }

    if (previewOpen || openTimerRef.current) {
      return;
    }

    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;

      if (visibleRatioRef.current < 0.65) {
        return;
      }

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setPreviewOpen(true);
    }, 1000);
  }

  useEffect(() => {
    setHoverEnabled(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }

      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hoverEnabled) {
      return undefined;
    }

    const element = cardRef.current;

    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRatioRef.current = entry.intersectionRatio;

        if (entry.intersectionRatio < 0.65) {
          setPreviewOpen(false);
        }
      },
      {
        threshold: [0, 0.3, 0.65, 1],
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hoverEnabled]);

  useEffect(() => {
    function handleScrollIntent() {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setPreviewOpen(false);
    }

    window.addEventListener("scroll", handleScrollIntent, { passive: true });
    window.addEventListener("touchmove", handleScrollIntent, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollIntent);
      window.removeEventListener("touchmove", handleScrollIntent);
    };
  }, []);

  if (!media) {
    return null;
  }

  const saved = isSaved(media.id, media.mediaType);
  const playable = isPlayableMedia(item, item.media_type || item.mediaType);

  function schedulePreviewClose() {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setPreviewOpen(false);
    }, 110);
  }

  return (
    <>
      <article
        className={cn("group relative shrink-0 origin-center", className || CARD_SIZE_STYLES[size] || CARD_SIZE_STYLES.default)}
        onMouseEnter={beginHoverIntent}
        onMouseLeave={schedulePreviewClose}
        onFocusCapture={beginHoverIntent}
        onBlurCapture={schedulePreviewClose}
      >
        <div ref={cardRef} className="relative rounded-[26px]">
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d11] shadow-panel transition duration-300 group-hover:scale-[1.02] group-hover:border-white/20 sm:rounded-[26px]">
            <AppLink href={getDetailHref(media.mediaType, media.id)} className="block">
              <div className="aspect-[2/3] overflow-hidden">
                <img
                  src={buildPosterUrl(media.posterPath, configuration)}
                  alt={media.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
                />
              </div>
            </AppLink>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/65 to-transparent px-3 pb-3 pt-12 sm:px-4 sm:pb-4 sm:pt-16">
              <p className="line-clamp-1 text-sm font-semibold text-white sm:text-base">{media.title}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/55 sm:text-xs sm:tracking-[0.22em]">
                {media.year} | {media.mediaType}
              </p>
            </div>

            <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3">
              <RatingRing value={media.voteAverage} />
            </div>
          </div>
        </div>
      </article>

      {previewOpen ? (
        <MediaHoverPreview
          anchorRef={cardRef}
          configuration={configuration}
          media={media}
          onMouseEnter={() => {
            if (closeTimerRef.current) {
              window.clearTimeout(closeTimerRef.current);
              closeTimerRef.current = null;
            }
          }}
          onMouseLeave={schedulePreviewClose}
          onToggleSaved={() => toggleSaved(media, media.mediaType)}
          overlayAction={overlayAction}
          saved={saved}
          secondaryLabel={secondaryLabel}
          playable={playable}
        />
      ) : null}
    </>
  );
}
