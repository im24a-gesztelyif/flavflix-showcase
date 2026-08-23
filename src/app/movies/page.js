import { BrowseScreen } from "@/components/screens/browse-screen";
import { MOVIE_SORT_OPTIONS } from "@/lib/discovery";

export default function MoviesPage() {
  return (
    <BrowseScreen
      mediaType="movie"
      title="Movies"
      description="Filtered movie discovery powered by TMDB discover endpoints with local profile state layered on top."
      sortOptions={MOVIE_SORT_OPTIONS}
    />
  );
}
