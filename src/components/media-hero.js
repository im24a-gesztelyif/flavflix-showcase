"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, CalendarDays, ChevronLeft, ChevronRight, Clapperboard, Play, Star } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { cn } from "@/lib/utils";
import { buildImageUrl, formatFullDate, formatVote } from "@/lib/utils";
import { useTmdbQuery } from "@/hooks/use-tmdb-query";
import { getDetailHref, getWatchHref, isPlayableMedia, normalizeMediaItem } from "@/lib/media";
import { useAppState } from "@/lib/app-state";

function truncateOverview(text, limit = 250) {
  if (!text) {
    return "No synopsis available yet.";
  }

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 3).trimEnd()}...`;
}

function pickHeroLogo(logos = [], language = "en-US") {
  const languagePrefix = language.split("-")[0];
  const prioritizedLanguages = [language, languagePrefix, "en", null];

  const candidates = [...logos].sort((left, right) => {
    const leftPriority = prioritizedLanguages.indexOf(left.iso_639_1);
    const rightPriority = prioritizedLanguages.indexOf(right.iso_639_1);
    const normalizedLeft = leftPriority === -1 ? prioritizedLanguages.length : leftPriority;
    const normalizedRight = rightPriority === -1 ? prioritizedLanguages.length : rightPriority;

    if (normalizedLeft !== normalizedRight) {
      return normalizedLeft - normalizedRight;
    }

    return (right.vote_average || 0) - (left.vote_average || 0);
  });

  return candidates[0] || null;
}

function HeroTitle({ activeItem, configuration, language, onReady }) {
  const imagesQuery = useTmdbQuery(
    `${activeItem.mediaType}/${activeItem.id}/images`,
    {
      include_image_language: `${language},en,null`,
    },
    {
      enabled: Boolean(activeItem?.id),
      ttl: 1000 * 60 * 60,
    },
  );
  const titleLogo = pickHeroLogo(imagesQuery.data?.logos, language);
  const titleLogoUrl = titleLogo?.file_path ? buildImageUrl(titleLogo.file_path, "w500", configuration) : null;

  useEffect(() => {
    if (!imagesQuery.loading && !titleLogoUrl) {
      onReady();
    }
  }, [imagesQuery.loading, onReady, titleLogoUrl]);

  if (titleLogoUrl) {
    return (
      <img
        src={titleLogoUrl}
        alt={activeItem.title}
        fetchPriority="high"
        decoding="async"
        onLoad={onReady}
        onError={onReady}
        className="mt-4 h-12 max-w-[min(80vw,240px)] object-contain object-left drop-shadow-[0_18px_45px_rgba(0,0,0,0.45)] sm:h-16 sm:max-w-[min(72vw,360px)] md:h-20 md:max-w-[min(70vw,440px)] lg:h-24 lg:max-w-[min(66vw,520px)]"
      />
    );
  }

  return (
    <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2rem,4vw,5.4rem)] font-semibold text-white">
      {activeItem.title}
    </h1>
  );
}

export function MediaHero({ items = [], configuration }) {
  const { isSaved, settings, toggleSaved } = useAppState();
  const [activeIndex, setActiveIndex] = useState(0);
  const [titleReady, setTitleReady] = useState(false);
  const [titleVisible, setTitleVisible] = useState(true);
  const touchStartRef = useRef(null);
  const touchDeltaRef = useRef({
    x: 0,
    y: 0,
  });
  const resumeAutoAdvanceAtRef = useRef(0);
  const heroTransitionTimerRef = useRef(null);

  const pauseAutoAdvance = useCallback((duration = 12000) => {
    resumeAutoAdvanceAtRef.current = Date.now() + duration;
  }, []);

  const clearHeroTransitionTimer = useCallback(() => {
    if (heroTransitionTimerRef.current) {
      window.clearTimeout(heroTransitionTimerRef.current);
      heroTransitionTimerRef.current = null;
    }
  }, []);

  const transitionHeroTo = useCallback((nextIndex, { pause = true } = {}) => {
    if (items.length <= 1) {
      return;
    }

    const normalizedIndex = (nextIndex + items.length) % items.length;

    if (pause) {
      pauseAutoAdvance();
    }

    if (normalizedIndex === activeIndex) {
      return;
    }

    clearHeroTransitionTimer();
    setTitleVisible(false);
    setTitleReady(false);

    heroTransitionTimerRef.current = window.setTimeout(() => {
      heroTransitionTimerRef.current = null;
      setActiveIndex(normalizedIndex);
    }, 240);
  }, [activeIndex, clearHeroTransitionTimer, items.length, pauseAutoAdvance]);

  useEffect(() => {
    if (items.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (Date.now() < resumeAutoAdvanceAtRef.current) {
        return;
      }

      transitionHeroTo(activeIndex + 1, { pause: false });
    }, 7000);

    return () => window.clearInterval(timer);
  }, [activeIndex, items.length, transitionHeroTo]);

  useEffect(() => {
    return () => clearHeroTransitionTimer();
  }, [clearHeroTransitionTimer]);

  useEffect(() => {
    if (items.length <= 1) {
      return undefined;
    }

    function handleScroll() {
      pauseAutoAdvance();
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [items.length, pauseAutoAdvance]);

  const handleHeroTitleReady = useCallback(() => {
    setTitleReady(true);
    setTitleVisible(true);
  }, []);

  const activeItem = normalizeMediaItem(items[activeIndex], items[activeIndex]?.media_type || items[activeIndex]?.mediaType);
  if (!activeItem) {
    return null;
  }
  const desktopHeroImage = buildImageUrl(activeItem.backdropPath || activeItem.posterPath, "original", configuration);
  const mobileHeroImage = buildImageUrl(activeItem.backdropPath || activeItem.posterPath, "original", configuration);
  const hasBackdrop = Boolean(activeItem.backdropPath);
  const saved = isSaved(activeItem.id, activeItem.mediaType);
  const playable = isPlayableMedia(items[activeIndex], items[activeIndex]?.media_type || items[activeIndex]?.mediaType);
  const shortOverview = truncateOverview(activeItem.overview, 250);
  const releaseLabel = formatFullDate(activeItem.releaseDate);

  function cycleHero(direction) {
    if (items.length <= 1) {
      return;
    }

    transitionHeroTo(activeIndex + direction);
  }

  function handleTouchStart(event) {
    if (items.length <= 1) {
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    touchDeltaRef.current = {
      x: 0,
      y: 0,
    };
  }

  function handleTouchMove(event) {
    if (!touchStartRef.current) {
      return;
    }

    const touch = event.touches[0];
    touchDeltaRef.current = {
      x: touch.clientX - touchStartRef.current.x,
      y: touch.clientY - touchStartRef.current.y,
    };
  }

  function handleTouchEnd() {
    const start = touchStartRef.current;
    const delta = touchDeltaRef.current;
    touchStartRef.current = null;

    if (!start) {
      return;
    }

    if (Math.abs(delta.x) < 40 || Math.abs(delta.x) <= Math.abs(delta.y)) {
      return;
    }

    cycleHero(delta.x < 0 ? 1 : -1);
  }

  return (
    <section className="-mx-4 overflow-hidden touch-pan-y xl:-mx-8">
      <div
        className="relative min-h-[clamp(39rem,92vw,52rem)] bg-[#050507] sm:min-h-[clamp(32rem,68vw,47rem)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="absolute inset-0 overflow-hidden bg-[#050507]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-22 sm:bg-top sm:opacity-18"
            style={{
              backgroundImage: `url(${mobileHeroImage})`,
              filter: "brightness(0.46)",
            }}
          />
          <div
            className="absolute inset-0 hidden bg-cover bg-top opacity-20 sm:block"
            style={{
              backgroundImage: `url(${desktopHeroImage})`,
              filter: "brightness(0.58)",
            }}
          />
        </div>
        <div className="absolute inset-0">
          <img
            src={mobileHeroImage}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            style={{ filter: "brightness(0.72)" }}
            className="absolute inset-0 z-10 h-full w-full object-cover object-center sm:hidden"
          />
          <img
            src={desktopHeroImage}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            style={{ filter: hasBackdrop ? "brightness(0.78)" : "brightness(0.84)" }}
            className={cn(
              "absolute inset-0 z-10 hidden h-full w-full sm:block",
              hasBackdrop ? "sm:object-cover" : "sm:object-contain",
            )}
          />
        </div>
        <div className="absolute inset-0 bg-[#05050764] sm:bg-[#0505075e]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050507f4] via-[#050507e2] to-[#05050778] sm:from-[#050507f2] sm:via-[#050507d8] sm:to-[#05050762]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#05050772] to-[#05050724] sm:via-[#05050736] sm:to-[#05050718]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#05050752] to-transparent" />

        <div className="absolute inset-0 z-20 flex flex-col justify-end px-4 pb-9 pt-[calc(13rem+env(safe-area-inset-top))] sm:px-6 sm:pb-10 sm:pt-32 md:px-10 md:pb-12 lg:px-12 lg:pt-36 xl:px-16 xl:pt-40">
          <div className="max-w-[min(92vw,50rem)]">
            <p className="text-[10px] uppercase tracking-[0.32em] text-accent-200 sm:text-xs">Featured Tonight</p>
            <div
              className={cn(
                "transition duration-500 ease-out",
                titleVisible && titleReady ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
              )}
            >
              <HeroTitle
                key={`${activeItem.mediaType}-${activeItem.id}`}
                activeItem={activeItem}
                configuration={configuration}
                language={settings.language}
                onReady={handleHeroTitleReady}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/82 sm:mt-5 sm:gap-3 sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
                <Clapperboard className="h-4 w-4 text-accent-200" />
                {activeItem.mediaType === "movie" ? "Movie" : "TV Series"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
                <CalendarDays className="h-4 w-4 text-accent-200" />
                {releaseLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
                <Star className="h-4 w-4 text-yellow-300" />
                {formatVote(activeItem.voteAverage)} TMDB
              </span>
            </div>
            <p className="mt-5 max-w-[min(92vw,42rem)] line-clamp-3 text-sm leading-6 text-white/72 sm:mt-6 sm:max-w-2xl sm:line-clamp-none sm:leading-7">
              {shortOverview}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 sm:mt-7">
              {playable ? (
                <AppLink
                  href={getWatchHref(activeItem.mediaType, activeItem.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-100 sm:px-6"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play Now
                </AppLink>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white/72">
                  Releases {releaseLabel}
                </div>
              )}
              <AppLink
                href={getDetailHref(activeItem.mediaType, activeItem.id)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] sm:px-6"
              >
                More Info
              </AppLink>
              <button
                type="button"
                onClick={() => toggleSaved(activeItem, activeItem.mediaType)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] sm:px-6"
              >
                {saved ? <BookmarkCheck className="h-4 w-4 text-accent-200" /> : <Bookmark className="h-4 w-4" />}
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          {items.length > 1 ? (
            <div className="mt-6 flex justify-center sm:mt-7 md:justify-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/45 bg-black/34 px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur">
                {items.slice(0, 6).map((item, index) => {
                  const candidate = normalizeMediaItem(item, item.media_type || item.mediaType);

                  if (!candidate) {
                    return null;
                  }

                  const active = index === activeIndex;

                  return (
                    <button
                      key={`${candidate.mediaType}-${candidate.id}`}
                      type="button"
                      onClick={() => {
                        transitionHeroTo(index);
                      }}
                      className={cn(
                        "rounded-full border transition-all duration-300 ease-out",
                        active
                          ? "h-4 w-4 border-white bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.12)] motion-safe:animate-[heroDotPulse_2.6s_ease-in-out_infinite]"
                          : "h-2.5 w-2.5 border-white/58 bg-white/28 hover:h-3 hover:w-3 hover:border-white/78 hover:bg-white/44",
                      )}
                      aria-label={`Show featured slide ${index + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {items.length > 1 ? (
          <div className="absolute bottom-12 right-8 z-30 hidden items-center gap-3 lg:flex xl:right-12">
            <button
              type="button"
              onClick={() => cycleHero(-1)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-black/28 text-white/84 shadow-[0_18px_46px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:border-white/24 hover:bg-white/10 hover:text-white"
              aria-label="Previous featured title"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => cycleHero(1)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-black/28 text-white/84 shadow-[0_18px_46px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:border-white/24 hover:bg-white/10 hover:text-white"
              aria-label="Next featured title"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
