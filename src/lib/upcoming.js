export function selectUpcomingTitles(items, mediaType, today, limit = 8) {
  const unique = new Map();
  for (const item of items || []) {
    const date = mediaType === "movie" ? item.release_date : item.first_air_date;
    if (!item.id || !item.backdrop_path || !item.poster_path || !date || date <= today) continue;
    unique.set(item.id, { ...item, media_type: mediaType });
  }
  // Select the most anticipated titles before ordering the shelf by release date.
  return [...unique.values()]
    .sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0))
    .slice(0, limit)
    .sort((a, b) => (a.release_date || a.first_air_date).localeCompare(b.release_date || b.first_air_date));
}
