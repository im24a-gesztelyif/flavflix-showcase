"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaCard } from "@/components/media-card";

const RAIL_VARIANTS = {
  default: {
    rowClassName: "h-[clamp(15.5rem,28vw,22rem)] gap-3 py-2 sm:gap-4 lg:gap-5",
    cardSize: "default",
  },
  compact: {
    rowClassName: "h-[clamp(13.5rem,24vw,18rem)] gap-3 py-1.5 sm:gap-3.5 lg:gap-4",
    cardSize: "compact",
  },
};

function getWholeCardScrollTarget(element, direction) {
  const cards = Array.from(element.children).filter((child) => child instanceof HTMLElement);

  if (!cards.length) {
    return element.scrollLeft + direction * element.clientWidth;
  }

  const scrollLeft = element.scrollLeft;
  const viewportEnd = scrollLeft + element.clientWidth;
  const epsilon = 2;
  const fullyVisibleCards = cards.filter(
    (card) => card.offsetLeft >= scrollLeft - epsilon && card.offsetLeft + card.offsetWidth <= viewportEnd + epsilon,
  );
  const firstVisibleIndex = cards.findIndex((card) => card.offsetLeft + card.offsetWidth > scrollLeft + epsilon);
  const firstFullyVisibleIndex = cards.findIndex(
    (card) => card.offsetLeft >= scrollLeft - epsilon && card.offsetLeft + card.offsetWidth <= viewportEnd + epsilon,
  );
  const visibleCount = Math.max(fullyVisibleCards.length, 1);
  const anchorIndex = firstFullyVisibleIndex >= 0 ? firstFullyVisibleIndex : Math.max(firstVisibleIndex, 0);
  const targetIndex =
    direction > 0
      ? Math.min(anchorIndex + visibleCount, cards.length - 1)
      : Math.max(anchorIndex - visibleCount, 0);

  return cards[targetIndex]?.offsetLeft ?? element.scrollLeft + direction * element.clientWidth;
}

export function MediaRail({
  title,
  subtitle,
  items = [],
  configuration,
  secondaryLabelForItem,
  renderOverlayAction,
  variant = "default",
  className,
}) {
  const railRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    isOverflowing: false,
  });
  const activeVariant = RAIL_VARIANTS[variant] || RAIL_VARIANTS.default;

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
        const nextIsOverflowing = element.scrollWidth > element.clientWidth + 8;
        const nextCanScrollRight = nextIsOverflowing && element.scrollLeft + element.clientWidth < element.scrollWidth - 8;

        setScrollState((current) =>
          current.canScrollLeft === nextCanScrollLeft &&
          current.canScrollRight === nextCanScrollRight &&
          current.isOverflowing === nextIsOverflowing
            ? current
            : {
                canScrollLeft: nextCanScrollLeft,
                canScrollRight: nextCanScrollRight,
                isOverflowing: nextIsOverflowing,
              },
        );
      });
    }

    updateState();
    element.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateState) : null;
    resizeObserver?.observe(element);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver?.disconnect();
      element.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [items.length]);

  if (!items.length) {
    return null;
  }

  function scrollByWholeCards(direction) {
    const element = railRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({
      left: getWholeCardScrollTarget(element, direction),
      behavior: "smooth",
    });
  }

  return (
    <section className={className || "min-w-0 space-y-3 sm:space-y-4"}>
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[clamp(1.05rem,1.2vw+0.85rem,1.7rem)] font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs leading-6 text-white/55 sm:text-sm">{subtitle}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => scrollByWholeCards(-1)}
            disabled={!scrollState.canScrollLeft}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] p-0 leading-none text-white/82 shadow-[0_12px_30px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:w-11"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="block h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByWholeCards(1)}
            disabled={!scrollState.canScrollRight}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] p-0 leading-none text-white/82 shadow-[0_12px_30px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:w-11"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="block h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={railRef}
          className={`flex touch-pan-y items-start overflow-x-hidden overflow-y-hidden ${activeVariant.rowClassName}`}
        >
          {items.map((item) => (
            <MediaCard
              key={`${item.media_type || item.mediaType}-${item.id}`}
              item={item}
              configuration={configuration}
              size={activeVariant.cardSize}
              secondaryLabel={secondaryLabelForItem ? secondaryLabelForItem(item) : undefined}
              overlayAction={renderOverlayAction ? renderOverlayAction(item) : undefined}
            />
          ))}
        </div>
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#050507] to-transparent transition-opacity duration-300 sm:w-14 ${
            scrollState.canScrollLeft ? "opacity-90" : "opacity-0"
          }`}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#050507] to-transparent transition-opacity duration-300 sm:w-14 ${
            scrollState.isOverflowing && scrollState.canScrollRight ? "opacity-90" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
