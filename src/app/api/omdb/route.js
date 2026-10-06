import { NextResponse } from "next/server";
import { omdbGet } from "@/lib/omdb-server";

function isValidImdbId(value) {
  return /^tt\d+$/.test(String(value || "").trim());
}

function toPositiveInteger(value) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imdbId = String(searchParams.get("imdbId") || "").trim();
  const season = toPositiveInteger(searchParams.get("season"));
  const episode = toPositiveInteger(searchParams.get("episode"));

  if (!isValidImdbId(imdbId)) {
    return NextResponse.json({ error: "Missing or invalid IMDb ID." }, { status: 400 });
  }

  if (season === null || episode === null) {
    return NextResponse.json({ error: "Season and episode must be positive integers." }, { status: 400 });
  }

  if (episode && !season) {
    return NextResponse.json({ error: "Episode lookups require a season." }, { status: 400 });
  }

  try {
    const data = await omdbGet(
      {
        i: imdbId,
        plot: "short",
        ...(season ? { Season: season } : {}),
        ...(episode ? { Episode: episode } : {}),
      },
      {
        revalidate: season || episode ? 60 * 60 * 24 * 7 : 60 * 60 * 24,
      },
    );

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        error: "External ratings are unavailable right now.",
      },
      { status: 500 },
    );
  }
}
