import { NextResponse } from "next/server";
import { tmdbAwardsGet } from "@/lib/tmdb-awards-server";

function isValidMediaType(value) {
  return value === "movie" || value === "tv";
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mediaType = String(searchParams.get("mediaType") || "").trim();
  const id = String(searchParams.get("id") || "").trim();
  const language = String(searchParams.get("language") || "en-US").trim();

  if (!isValidMediaType(mediaType) || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Missing or invalid TMDB awards lookup params." }, { status: 400 });
  }

  try {
    const data = await tmdbAwardsGet({ mediaType, id, language });
    return NextResponse.json({ awards: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch TMDB awards data.",
      },
      { status: 500 },
    );
  }
}
