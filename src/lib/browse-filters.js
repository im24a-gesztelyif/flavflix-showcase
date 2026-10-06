export function getBrowseYearParams(mediaType, yearFrom, yearTo) {
  const validYear = (value) => /^\d{4}$/.test(String(value)) && Number(value) >= 1870 && Number(value) <= 2200;
  let from = validYear(yearFrom) ? Number(yearFrom) : null;
  let to = validYear(yearTo) ? Number(yearTo) : null;

  if (from !== null && to !== null && from > to) {
    [from, to] = [to, from];
  }

  const dateField = mediaType === "movie" ? "primary_release_date" : "first_air_date";
  return {
    [`${dateField}.gte`]: from !== null ? `${from}-01-01` : undefined,
    [`${dateField}.lte`]: to !== null ? `${to}-12-31` : undefined,
  };
}
