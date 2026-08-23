"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_MAP = {
  primaryFull: {
    src: "/tmdb_primary_full.svg",
    width: 60,
    height: 60,
  },
  primaryLong: {
    src: "/tmdb_primary_long.svg",
    width: 92,
    height: 24,
  },
  primaryShort: {
    src: "/tmdb_primary_short.svg",
    width: 44,
    height: 24,
  },
  altLong: {
    src: "/tmdb_alt_long.svg",
    width: 92,
    height: 24,
  },
  altShort: {
    src: "/tmdb_alt_short.svg",
    width: 44,
    height: 24,
  },
};

export function TmdbAttribution({
  variant = "primaryLong",
  title = "Movie metadata by TMDB",
  body = "This page uses TMDB for film and TV metadata.",
  className,
  compact = false,
  logoScale = 1,
}) {
  const logo = LOGO_MAP[variant] || LOGO_MAP.primaryLong;
  const scaledWidth = Math.round(logo.width * logoScale);
  const scaledHeight = Math.round(logo.height * logoScale);

  return (
    <a
      href="https://www.themoviedb.org/"
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group inline-flex w-full items-start gap-3 rounded-[22px] border border-[#1e5560]/35 bg-white/[0.04] text-left text-white/72 transition hover:border-[#2d8190]/50 hover:bg-white/[0.06] hover:text-white sm:w-auto sm:items-center sm:gap-4 sm:rounded-[24px]",
        compact ? "px-3.5 py-3 sm:px-4" : "px-4 py-3.5 sm:px-5 sm:py-4",
        className,
      )}
      aria-label="Movie metadata provided by TMDB"
    >
      <div className="flex shrink-0 items-center justify-center rounded-2xl border border-[#256874]/40 bg-black/18 px-2.5 py-2 sm:px-3">
        <div className="relative shrink-0" style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}>
          <Image
            src={logo.src}
            alt="TMDB"
            fill
            unoptimized
            sizes={`${scaledWidth}px`}
            className="object-contain"
          />
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn("font-semibold text-white", compact ? "text-sm" : "text-sm md:text-[15px]")}>{title}</p>
        <p className={cn("mt-1 leading-5 text-white/55 sm:leading-6", compact ? "text-xs" : "text-xs md:text-sm")}>{body}</p>
      </div>
    </a>
  );
}
