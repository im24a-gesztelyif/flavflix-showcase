import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

export function LoadingState({
  title = "Loading",
  description = "Pulling in metadata and local profile state.",
  fullScreen = false,
  brand = false,
}) {
  return (
    <div
      className={cn(
        fullScreen
          ? "flex min-h-screen items-center justify-center bg-[#060608] px-5 py-10 sm:px-8 sm:py-12"
          : "surface flex min-h-[220px] items-center justify-center px-5 py-10 sm:px-8 sm:py-12",
      )}
    >
      <div className="max-w-xl text-center">
        <div className="mx-auto flex items-center justify-center gap-3">
          {brand ? <BrandLogo className="w-[180px] sm:w-[220px] md:w-[250px]" priority /> : <div className="h-10 w-10 animate-pulse rounded-full bg-accent-500/30 sm:h-12 sm:w-12" />}
        </div>
        {brand ? null : <h2 className="mt-5 text-xl font-semibold text-white sm:text-2xl">{title}</h2>}
        <p className="mt-4 text-sm leading-6 text-white/55 sm:leading-7">{description}</p>
      </div>
    </div>
  );
}

export function PosterRowSkeleton({ cards = 6 }) {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 rounded-full bg-white/10" />
      <div className="flex gap-3 overflow-hidden sm:gap-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="w-[148px] shrink-0 sm:w-[178px] md:w-[220px]">
            <div className="aspect-[2/3] animate-pulse rounded-[22px] bg-white/8 sm:rounded-[26px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PosterGridSkeleton({ cards = 12 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="aspect-[2/3] animate-pulse rounded-[22px] bg-white/8 sm:rounded-[26px]" />
      ))}
    </div>
  );
}
