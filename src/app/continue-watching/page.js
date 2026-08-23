"use client";

import { Trash2 } from "lucide-react";
import { LibraryScreen } from "@/components/screens/library-screen";
import { useAppState } from "@/lib/app-state";
import { createMediaActivityKey, shouldShowInContinueWatching } from "@/lib/media";
import { formatFullDate } from "@/lib/utils";

function ContinueWatchingClient() {
  const { activeProfileData, clearMediaActivity } = useAppState();
  const items = Object.values(activeProfileData.progress || {})
    .filter((entry) => shouldShowInContinueWatching(entry))
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
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
      description="Saved progress records are grouped by profile and displayed as resumable watch entries in the interface."
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
