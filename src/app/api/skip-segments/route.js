import { NextResponse } from "next/server";
import { buildIntroDbUrl, normalizeIntroDbSegments, parseIntroDbParams } from "@/lib/introdb";
import { buildSkipDbUrl, mergeSkipSegments, normalizeSkipDbSegments } from "@/lib/skipdb";
import { tmdbGet } from "@/lib/tmdb-server";

async function readJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 86400 },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Skip service unavailable");
  return response.json();
}

export async function GET(request) {
  const query = parseIntroDbParams(new URL(request.url).searchParams);
  if (!query) return NextResponse.json({ segments: [] }, { status: 400, headers: { "Cache-Control": "no-store" } });

  // Independent lookups: either service can fail without losing the other's data.
  const [intro, skip] = await Promise.allSettled([
    readJson(buildIntroDbUrl(query)).then((data) => normalizeIntroDbSegments(data, query)),
    (async () => {
      const ids = await tmdbGet(`${query.mediaType}/${query.tmdbId}/external_ids`, {}, {
        revalidate: 86400, signal: AbortSignal.timeout(5000),
      });
      const url = buildSkipDbUrl(ids?.imdb_id, query);
      return url ? normalizeSkipDbSegments(await readJson(url), query, ids.imdb_id) : { segments: [], coveredTypes: [] };
    })(),
  ]);
  const segments = mergeSkipSegments(
    skip.status === "fulfilled" ? skip.value : { segments: [], coveredTypes: [] },
    intro.status === "fulfilled" ? intro.value : [],
  );
  const failed = intro.status === "rejected" || skip.status === "rejected";
  return NextResponse.json({ segments }, {
    status: failed && !segments.length ? 503 : 200,
    headers: { "Cache-Control": failed ? "no-store" : `public, max-age=${segments.length ? 86400 : 3600}` },
  });
}
