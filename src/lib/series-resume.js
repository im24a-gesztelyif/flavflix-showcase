export function isEpisodeFinished(entry) {
  if (!entry) return false;
  return entry.watchedComplete === true || Number(entry.percent) >= 0.9 ||
    (Number(entry.duration) > 0 && Number(entry.currentTime) / Number(entry.duration) >= 0.9);
}

export async function resolveSeriesResume({ id, progress = {}, seasons = [], loadSeason, today = new Date().toISOString().slice(0, 10) }) {
  const entries = Object.values(progress).filter((entry) =>
    entry.mediaType === "tv" && Number(entry.id) === Number(id) &&
    Number.isInteger(Number(entry.season)) && Number(entry.season) > 0 &&
    Number.isInteger(Number(entry.episode)) && Number(entry.episode) > 0,
  );
  const latest = entries.sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0))[0];
  if (!latest) return { season: 1, episode: 1, restart: false };
  const fallback = { season: Number(latest.season), episode: Number(latest.episode), restart: isEpisodeFinished(latest) };
  if (!fallback.restart) return fallback;

  const completed = new Set(entries.filter(isEpisodeFinished).map((entry) => `${Number(entry.season)}:${Number(entry.episode)}`));
  const followingSeasons = seasons.filter((season) => season.season_number >= fallback.season && season.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number);
  for (const season of followingSeasons) {
    // Missing dates are not proof an episode is available. Never jump over an unaired episode.
    if (season.air_date && season.air_date > today) break;
    let data;
    try { data = await loadSeason(season.season_number); } catch { return fallback; }
    if (Number(data?.season_number) !== season.season_number || !Array.isArray(data.episodes) || !data.episodes.length) break;
    const episodes = [...data.episodes].sort((a, b) => a.episode_number - b.episode_number);
    for (const episode of episodes) {
      if (season.season_number === fallback.season && episode.episode_number <= fallback.episode) continue;
      if (!Number.isInteger(episode.episode_number) || episode.episode_number < 1) continue;
      if (!episode.air_date || episode.air_date > today) return fallback;
      if (!completed.has(`${season.season_number}:${episode.episode_number}`)) {
        return { season: season.season_number, episode: episode.episode_number, restart: false };
      }
    }
  }
  // Finale / no released successor: replay this episode from the start, not its credits.
  return fallback;
}
