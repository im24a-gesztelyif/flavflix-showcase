"use client";

import { LibraryScreen } from "@/components/screens/library-screen";
import { useAppState } from "@/lib/app-state";

function MyListClient() {
  const { activeProfileData } = useAppState();

  return (
    <LibraryScreen
      eyebrow="My List"
      title="Saved titles"
      description="Manually curated titles stored for the active profile."
      items={activeProfileData.saved.map((item) => ({
        ...item,
        mediaType: item.mediaType,
        media_type: item.mediaType,
      }))}
      emptyTitle="Nothing saved yet"
      emptyDescription="Save titles from browse rails, search, or detail pages to build your shortlist."
      actionLabel="Browse titles"
      actionHref="/movies"
    />
  );
}

export default function MyListPage() {
  return <MyListClient />;
}
