import { WatchScreen } from "@/components/screens/watch-screen";

export default async function WatchPage({ params, searchParams }) {
  const { mediaType, id } = await params;
  const query = await searchParams;

  return (
    <WatchScreen
      mediaType={mediaType}
      id={id}
      initialSeason={query.season}
      initialEpisode={query.episode}
      initialProvider={query.provider}
    />
  );
}
