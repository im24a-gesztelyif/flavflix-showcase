import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export function FiltersPanel({ genres = [], filters, onChange, sortOptions, mediaType = "movie" }) {
  const [open, setOpen] = useState(false);
  const activeFilterCount = [filters.genre, filters.year, filters.rating, filters.runtime, filters.language].filter(Boolean).length;

  const fields = (
    <>
      <label className="flex flex-col gap-2 text-sm text-white/55">
        <span>Genre</span>
        <select
          value={filters.genre}
          onChange={(event) => onChange("genre", event.target.value)}
          className="brand-select"
        >
          <option value="">All genres</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm text-white/55">
        <span>{mediaType === "movie" ? "Release year" : "First air year"}</span>
        <input
          type="number"
          value={filters.year}
          onChange={(event) => onChange("year", event.target.value)}
          placeholder="2026"
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-white/55">
        <span>Rating floor</span>
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={filters.rating}
          onChange={(event) => onChange("rating", event.target.value)}
          placeholder="7.5"
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-white/55">
        <span>{mediaType === "movie" ? "Runtime floor" : "Episode runtime floor"}</span>
        <input
          type="number"
          min="0"
          value={filters.runtime}
          onChange={(event) => onChange("runtime", event.target.value)}
          placeholder="90"
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-white/55">
        <span>Original language</span>
        <input
          type="text"
          value={filters.language}
          onChange={(event) => onChange("language", event.target.value)}
          placeholder="en"
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-white/55">
        <span>Sort by</span>
        <select
          value={filters.sort}
          onChange={(event) => onChange("sort", event.target.value)}
          className="brand-select"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  return (
    <>
      <div className="surface flex items-center justify-between gap-3 p-4 lg:hidden">
        <div>
          <p className="text-sm font-semibold text-white">Filters</p>
          <p className="mt-1 text-xs text-white/52">
            {activeFilterCount ? `${activeFilterCount} active filters` : "All genres, years, and languages"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex touch-target items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[90] !m-0 bg-[#040406b8] backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-[#09090df6] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-30px_90px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto max-w-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Filters</p>
                  <p className="mt-2 text-xl font-semibold text-white">Refine discovery</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] p-0 leading-none text-white/76"
                  aria-label="Close filters"
                >
                  <X className="block h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-4">{fields}</div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="surface hidden gap-4 p-5 lg:grid lg:grid-cols-6">{fields}</div>
    </>
  );
}
