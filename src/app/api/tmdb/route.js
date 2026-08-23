import { NextResponse } from "next/server";
import { tmdbGet } from "@/lib/tmdb-server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing TMDB path." }, { status: 400 });
  }

  const params = {};

  searchParams.forEach((value, key) => {
    if (key === "path") {
      return;
    }

    params[key] = value;
  });

  try {
    const data = await tmdbGet(path, params);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch TMDB data.",
      },
      { status: 500 },
    );
  }
}
