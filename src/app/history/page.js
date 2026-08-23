"use client";

import { Trash2 } from "lucide-react";
import { LibraryScreen } from "@/components/screens/library-screen";
import { useAppState } from "@/lib/app-state";
import { createMediaActivityKey } from "@/lib/media";
import { formatFullDate } from "@/lib/utils";

function HistoryClient() {
  const { activeProfileData, clearMediaActivity } = useAppState();
  const items = (activeProfileData.history || [])
    .sort((left, right) => new Date(right.watchedAt) - new Date(left.watchedAt))
    .reduce((collection, entry) => {
      const key = createMediaActivityKey(entry);

      if (!collection.some((item) => createMediaActivityKey(item.historyMeta) === key)) {
        collection.push({
          ...entry.snapshot,
          mediaType: entry.mediaType,
          media_type: entry.mediaType,
          historyMeta: entry,
        });
      }

      return collection;
    }, []);

  return (
    <LibraryScreen
      eyebrow="History"
      title="Watch history"
      description="A synced timeline of recent playback activity for the active profile."
      items={items}
      emptyTitle="History will populate automatically"
      emptyDescription="The app writes watch history automatically as playback events come in."
      actionLabel="Go home"
      actionHref="/"
      secondaryLabelForItem={(item) => {
        if (item.historyMeta?.mediaType === "tv") {
          return `Latest episode | S${item.historyMeta.season} | E${item.historyMeta.episode} | ${formatFullDate(item.historyMeta.watchedAt)}`;
        }

        return formatFullDate(item.historyMeta?.watchedAt);
      }}
      renderOverlayAction={(item) => (
        <button
          type="button"
          onClick={() => clearMediaActivity(item.id, item.mediaType)}
          className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] p-2.5 text-white/80"
          aria-label="Remove from history"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    />
  );
}

export default function HistoryPage() {
  return <HistoryClient />;
}
