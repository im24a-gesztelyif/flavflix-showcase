const OMDB_BASE_URL = "https://www.omdbapi.com/";

export async function omdbGet(params = {}, options = {}) {
  const apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    throw new Error("OMDB_API_KEY is not configured.");
  }

  const url = new URL(OMDB_BASE_URL);

  Object.entries({
    apikey: apiKey,
    r: "json",
    ...params,
  }).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    next: {
      revalidate: options.revalidate ?? 86400,
    },
  });

  if (!response.ok) {
    throw new Error(`OMDb ${response.status}`);
  }

  const data = await response.json();

  if (data?.Response === "False") {
    throw new Error(data?.Error || "OMDb lookup failed.");
  }

  return data;
}
