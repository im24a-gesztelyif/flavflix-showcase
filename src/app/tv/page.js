import { BrowseScreen } from "@/components/screens/browse-screen";
import { TV_SORT_OPTIONS } from "@/lib/discovery";

export default function TvPage() {
  return (
    <BrowseScreen
      mediaType="tv"
      title="TV Shows"
      description="Series discovery, episodic browsing, and season-aware navigation tuned for a smooth watch-page handoff."
      sortOptions={TV_SORT_OPTIONS}
    />
  );
}
