const TMDB_WEB_BASE_URL = "https://www.themoviedb.org";

function decodeHtmlEntities(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractSummaryValue(html, label) {
  const match = html.match(new RegExp(`(\\d+)\\s+${label}`, "i"));
  return match ? Number(match[1]) : 0;
}

function parseAwardChunk(chunk) {
  const ceremonyMatch = chunk.match(
    /href="\/award\/[^"]+\/ceremony\/[^"]+[^"]*">([\s\S]*?)<\/a>/i,
  );
  const categoryMatch = chunk.match(
    /href="\/award\/[^"]+\/category\/[^"]+">([\s\S]*?)<\/a>/i,
  );
  const resultMatch = chunk.match(/<span[^>]*>\s*(Winner|Nominee)\s*<\/span>/i);
  const recipientsSectionMatch = chunk.match(/<ul class="flex flex-wrap gap-y-2 mt-1">([\s\S]*?)<\/ul>/i);
  const personMatches = Array.from(
    (recipientsSectionMatch?.[1] || "").matchAll(/href="\/person\/[^"]+"[^>]*>([\s\S]*?)<\/a>/gi),
  );
  const recipients = unique(personMatches.map((match) => stripTags(match[1])));
  const ceremony = stripTags(ceremonyMatch?.[1]);
  const category = stripTags(categoryMatch?.[1]);
  const yearMatch = ceremony.match(/\((\d{4})\)\s*$/);

  if (!ceremony || !category || !resultMatch) {
    return null;
  }

  return {
    ceremony,
    year: yearMatch ? Number(yearMatch[1]) : null,
    result: stripTags(resultMatch[1]),
    category,
    recipients,
  };
}

export function parseTmdbAwardsHtml(html) {
  const wins = extractSummaryValue(html, "Wins?");
  const nominations = extractSummaryValue(html, "Nominations?");
  const ceremonyAnchor = '<a class="!text-black !font-normal !no-underline hover:!underline" href="/award/';
  const startIndexes = [];
  let searchIndex = 0;

  while (true) {
    const index = html.indexOf(ceremonyAnchor, searchIndex);

    if (index === -1) {
      break;
    }

    startIndexes.push(index);
    searchIndex = index + ceremonyAnchor.length;
  }

  const items = startIndexes
    .map((start, position) => {
      const end = startIndexes[position + 1] || html.length;
      return parseAwardChunk(html.slice(start, end));
    })
    .filter(Boolean);

  if (!wins && !nominations && !items.length) {
    return null;
  }

  return {
    wins,
    nominations,
    items,
  };
}

export async function tmdbAwardsGet({ mediaType, id, language = "en-US" }) {
  if (mediaType !== "movie" && mediaType !== "tv") {
    throw new Error("Awards are only supported for movie and tv media types.");
  }

  const url = `${TMDB_WEB_BASE_URL}/${mediaType}/${id}/awards?language=${encodeURIComponent(language)}`;
  const response = await fetch(url, {
    headers: {
      "accept-language": `${language},en-US;q=0.9,en;q=0.8`,
      "user-agent": "Mozilla/5.0",
    },
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }

    throw new Error(`TMDB awards ${response.status}`);
  }

  const html = await response.text();
  return parseTmdbAwardsHtml(html);
}
