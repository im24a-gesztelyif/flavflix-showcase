import { NextResponse } from "next/server";
import { buildIntroDbUrl, normalizeIntroDbSegments, parseIntroDbParams } from "@/lib/introdb";

export async function GET(request) {
  const query = parseIntroDbParams(new URL(request.url).searchParams);
  if (!query) {
    return NextResponse.json({ segments: [] }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await fetch(buildIntroDbUrl(query), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 },
    });
    if (!response.ok && response.status !== 404) throw new Error("TheIntroDB unavailable");
    const segments = response.status === 404 ? [] : normalizeIntroDbSegments(await response.json(), query);
    return NextResponse.json({ segments }, {
      headers: { "Cache-Control": `public, max-age=${segments.length ? 86400 : 3600}` },
    });
  } catch {
    return NextResponse.json({ segments: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
