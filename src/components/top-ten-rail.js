"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { getDetailHref, normalizeMediaItem } from "@/lib/media";
import { buildPosterUrl } from "@/lib/utils";

function getWholeItemScrollTarget(element, direction) {
  const items = Array.from(element.children).filter((child) => child instanceof HTMLElement);

  if (!items.length) {
    return element.scrollLeft + direction * element.clientWidth;
  }

  const scrollLeft = element.scrollLeft;
  const viewportEnd = scrollLeft + element.clientWidth;
  const epsilon = 2;
  const fullyVisibleItems = items.filter(
    (item) => item.offsetLeft >= scrollLeft - epsilon && item.offsetLeft + item.offsetWidth <= viewportEnd + epsilon,
  );
  const firstVisibleIndex = items.findIndex((item) => item.offsetLeft + item.offsetWidth > scrollLeft + epsilon);
  const firstFullyVisibleIndex = items.findIndex(
    (item) => item.offsetLeft >= scrollLeft - epsilon && item.offsetLeft + item.offsetWidth <= viewportEnd + epsilon,
  );
  const visibleCount = Math.max(fullyVisibleItems.length, 1);
  const anchorIndex = firstFullyVisibleIndex >= 0 ? firstFullyVisibleIndex : Math.max(firstVisibleIndex, 0);
  const targetIndex =
    direction > 0
      ? Math.min(anchorIndex + visibleCount, items.length - 1)
      : Math.max(anchorIndex - visibleCount, 0);

  return items[targetIndex]?.offsetLeft ?? element.scrollLeft + direction * element.clientWidth;
}

export function TopTenRail({ title = "Top 10", items = [], configuration }) {
  const railRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const element = railRef.current;
    let frameId = null;

    if (!element) {
      return undefined;
    }

    function updateState() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        const nextCanScrollLeft = element.scrollLeft > 8;
        const nextCanScrollRight = element.scrollLeft + element.clientWidth < element.scrollWidth - 8;

        setScrollState((current) =>
          current.canScrollLeft === nextCanScrollLeft && current.canScrollRight === nextCanScrollRight
            ? current
            : {
                canScrollLeft: nextCanScrollLeft,
                canScrollRight: nextCanScrollRight,
              },
        );
      });
    }

    updateState();
    element.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      element.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [items.length]);

  if (!items.length) {
    return null;
  }

  function scrollByWholeItems(direction) {
    const element = railRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({
      left: getWholeItemScrollTarget(element, direction),
      behavior: "smooth",
    });
  }

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-[clamp(1.35rem,1.5vw+1rem,2.15rem)] font-semibold text-white">{title}</h2>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByWholeItems(-1)}
            disabled={!scrollState.canScrollLeft}
            className="touch-target rounded-full border border-white/10 bg-white/[0.05] p-2 text-white/80 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByWholeItems(1)}
            disabled={!scrollState.canScrollRight}
            className="touch-target rounded-full border border-white/10 bg-white/[0.05] p-2 text-white/80 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div ref={railRef} className="flex touch-pan-y gap-7 overflow-x-hidden overflow-y-hidden py-3 pr-3 sm:gap-8 sm:py-4 sm:pr-4 lg:gap-10 lg:py-5 lg:pr-6">
          {items.map((item, index) => {
            const media = normalizeMediaItem(item, item.media_type || item.mediaType);

            if (!media) {
              return null;
            }

            const rank = index + 1;
            const isDoubleDigit = rank >= 10;

            return (
              <div
                key={`${media.mediaType}-${media.id}`}
                className="relative min-w-[14.75rem] pb-4 pl-[4.5rem] sm:min-w-[17rem] sm:pl-[5.25rem] lg:min-w-[19.5rem] lg:pl-[6.1rem]"
              >
                <span
                  className={`pointer-events-none absolute bottom-0 left-0 font-[family-name:var(--font-display)] font-semibold leading-none text-white/10 [-webkit-text-stroke:2.5px_rgba(255,255,255,0.34)] ${
                    isDoubleDigit
                      ? "w-[5.8rem] text-[10.6rem] tracking-[-0.12em] sm:w-[6.9rem] sm:text-[12.8rem] lg:w-[8.1rem] lg:text-[15.2rem]"
                      : "text-[12.25rem] sm:text-[14.5rem] lg:text-[17rem]"
                  }`}
                >
                  {rank}
                </span>

                <AppLink href={getDetailHref(media.mediaType, media.id)} className="relative z-10 block transition duration-300 hover:-translate-y-1">
                  <img
                    src={buildPosterUrl(media.posterPath, configuration)}
                    alt={media.title}
                    loading="lazy"
                    decoding="async"
                    className="h-[16rem] w-[10.5rem] rounded-[24px] object-cover shadow-[0_28px_65px_rgba(0,0,0,0.38)] sm:h-[18rem] sm:w-[11.75rem] lg:h-[20rem] lg:w-[13rem]"
                  />
                </AppLink>
              </div>
            );
          })}
        </div>
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#050507] to-transparent transition-opacity duration-300 sm:w-14 ${
            scrollState.canScrollRight ? "opacity-90" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
