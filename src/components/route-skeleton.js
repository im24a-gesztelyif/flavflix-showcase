import { LoadingState, PosterGridSkeleton, PosterRowSkeleton } from "@/components/loading-state";

export function PageRouteSkeleton({ showFilters = false, rows = 1 }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="h-10 max-w-xl animate-pulse rounded-full bg-white/10 sm:h-12" />
        <div className="h-5 max-w-2xl animate-pulse rounded-full bg-white/8" />
      </div>

      {showFilters ? (
        <>
          <div className="surface flex items-center justify-between gap-3 p-4 lg:hidden">
            <div>
              <div className="h-4 w-20 animate-pulse rounded-full bg-white/10" />
              <div className="mt-2 h-3 w-28 animate-pulse rounded-full bg-white/8" />
            </div>
            <div className="h-11 w-24 animate-pulse rounded-full bg-white/[0.05]" />
          </div>

          <div className="surface hidden gap-4 p-5 lg:grid lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="h-12 animate-pulse rounded-2xl bg-white/[0.05]" />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {Array.from({ length: rows }).map((_, index) => (
        <PosterGridSkeleton key={index} cards={15} />
      ))}
    </div>
  );
}

export function DetailRouteSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="surface-strong overflow-hidden p-5 sm:p-6 md:p-8">
        <div className="grid gap-5 sm:gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-end">
          <div className="mx-auto aspect-[2/3] w-full max-w-[180px] animate-pulse rounded-[24px] bg-white/8 sm:max-w-[220px] sm:rounded-[28px] lg:mx-0" />
          <div className="space-y-4">
            <div className="h-10 max-w-2xl animate-pulse rounded-full bg-white/10 sm:h-12" />
            <div className="h-5 max-w-3xl animate-pulse rounded-full bg-white/8" />
            <div className="h-5 max-w-xl animate-pulse rounded-full bg-white/8" />
            <div className="flex flex-wrap gap-3 pt-2">
              {Array.from({ length: 4 }).map((_, chipIndex) => (
                <div key={chipIndex} className="h-10 w-24 animate-pulse rounded-full bg-white/[0.06] sm:w-28" />
              ))}
            </div>
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:flex-wrap">
              <div className="h-12 w-full max-w-[220px] animate-pulse rounded-full bg-white/10" />
              <div className="h-12 w-full max-w-[200px] animate-pulse rounded-full bg-white/[0.06]" />
            </div>
          </div>
        </div>
      </div>

      <PosterRowSkeleton cards={5} />
      <PosterRowSkeleton cards={5} />
    </div>
  );
}

export function WatchRouteSkeleton() {
  return <LoadingState fullScreen brand title="FlavFlix" description="Preparing your player." />;
}
