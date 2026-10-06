"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LibraryScreen } from "@/components/screens/library-screen";
import { useAppState } from "@/lib/app-state";
import { createMediaActivityKey } from "@/lib/media";
import { getContinueWatchingEntries, getFinalEpisode } from "@/lib/watch-history";
import { tmdbClientGet } from "@/lib/tmdb-client";
import { formatFullDate } from "@/lib/utils";

function ContinueWatchingClient() {
  const { activeProfileData, clearMediaActivity } = useAppState();
  const [seriesEndings, setSeriesEndings] = useState({});
  const progress = Object.values(activeProfileData.progress || {});
  const missingSeriesIds = JSON.stringify([...new Set(progress
    .filter((entry) => entry.mediaType === "tv" && Number(entry.percent) >= 0.9 && !getFinalEpisode(entry.snapshot))
    .map((entry) => Number(entry.id)))].sort((a, b) => a - b));

  useEffect(() => {
    let cancelled = false;
    // Older saved progress predates finale metadata. Resolve it without changing watch progress.
    Promise.all(JSON.parse(missingSeriesIds).map(async (id) => {
      try {
        return [id, getFinalEpisode(await tmdbClientGet(`tv/${id}`))];
      } catch {
        return [id, null];
      }
    })).then((endings) => {
      if (!cancelled) setSeriesEndings(Object.fromEntries(endings));
    });
    return () => { cancelled = true; };
  }, [missingSeriesIds]);

  const items = getContinueWatchingEntries(progress.map((entry) => (
    entry.mediaType === "tv" && seriesEndings[entry.id]
      ? { ...entry, snapshot: { ...entry.snapshot, finalEpisode: seriesEndings[entry.id] } }
      : entry
  )))
    .reduce((collection, entry) => {
      const key = createMediaActivityKey(entry);

      if (!collection.some((item) => createMediaActivityKey(item.progressMeta) === key)) {
        collection.push({
          ...entry.snapshot,
          mediaType: entry.mediaType,
          media_type: entry.mediaType,
          progressMeta: entry,
        });
      }

      return collection;
    }, []);

  return (
    <LibraryScreen
      eyebrow="Continue Watching"
      title="Resume where you left off"
      description="Your unfinished movies and series, saved locally for this profile."
      items={items}
      emptyTitle="No unfinished sessions"
      emptyDescription="Start a movie or episode on the watch page and progress will land here automatically."
      actionLabel="Start watching"
      actionHref="/movies"
      secondaryLabelForItem={(item) =>
        item.progressMeta?.mediaType === "tv"
          ? `Latest episode | S${item.progressMeta.season} | E${item.progressMeta.episode} | ${Math.round(item.progressMeta.percent * 100)}% | ${formatFullDate(item.progressMeta.updatedAt)}`
          : `${Math.round(item.progressMeta.percent * 100)}% | ${formatFullDate(item.progressMeta.updatedAt)}`
      }
      renderOverlayAction={(item) => (
        <button
          type="button"
          onClick={() => clearMediaActivity(item.id, item.mediaType)}
          className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] p-2.5 text-white/80"
          aria-label="Clear continue watching data"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    />
  );
}

export default function ContinueWatchingPage() {
  return <ContinueWatchingClient />;
}
