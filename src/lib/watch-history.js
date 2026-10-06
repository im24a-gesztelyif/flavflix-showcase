export function getFinalEpisode(item) {
  if (item?.finalEpisode) return item.finalEpisode;

  const seasons = (item?.seasons || []).filter((season) => Number(season.season_number) > 0);
  const lastSeason = seasons.reduce(
    (last, season) => !last || Number(season.season_number) > Number(last.season_number) ? season : last,
    null,
  );

  if (!lastSeason || !(Number(lastSeason.episode_count) > 0)) return null;
  return { season: Number(lastSeason.season_number), episode: Number(lastSeason.episode_count) };
}

export function isTitleComplete(entry) {
  if (!entry || Number(entry.percent) < 0.9 || !Number.isFinite(Number(entry.percent))) return false;
  if (entry.mediaType !== "tv") return true;
  const finalEpisode = getFinalEpisode(entry.snapshot);
  return Boolean(
    finalEpisode &&
    Number(entry.percent) >= 0.9 &&
    Number(entry.season) === finalEpisode.season &&
    Number(entry.episode) === finalEpisode.episode,
  );
}

export function getContinueWatchingEntries(entries) {
  const completedSeries = new Set(
    entries.filter((entry) => entry.mediaType === "tv" && isTitleComplete(entry))
      .map((entry) => String(entry.id)),
  );
  const seen = new Set();
  return [...entries]
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .filter((entry) => {
      const key = `${entry.mediaType}:${entry.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      if (!(Number(entry.currentTime) > 0 || Number(entry.percent) > 0)) return false;
      return entry.mediaType === "tv"
        ? !completedSeries.has(String(entry.id))
        : !isTitleComplete(entry);
    });
}

export function shouldIncludeInHistory(entry) {
  return Boolean(entry && (Number(entry.currentTime) > 0 || Number(entry.percent) > 0));
}
