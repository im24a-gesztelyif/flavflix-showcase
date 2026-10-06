function parseCount(summary, pattern) {
  const match = String(summary || "").match(pattern);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function parseHighlights(summary) {
  return String(summary || "")
    .split(/\.\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(Won|Nominated for)\s+([\d,]+)\s+(.+?)$/i);

      if (!match) {
        return null;
      }

      return {
        result: /^won$/i.test(match[1]) ? "Winner" : "Nominee",
        count: Number(match[2].replace(/,/g, "")),
        title: match[3].replace(/\s+total$/i, "").trim(),
      };
    })
    .filter(Boolean);
}

export function parseAwardsSummary(summary) {
  const normalized = String(summary || "").trim();

  if (!normalized || normalized === "N/A") {
    return null;
  }

  const highlights = parseHighlights(normalized);
  const oscarHighlight = highlights.find((highlight) => /^oscars?$/i.test(highlight.title));

  return {
    summary: normalized,
    wins: parseCount(normalized, /([\d,]+)\s+wins?\b/i),
    nominations: parseCount(normalized, /([\d,]+)\s+nominations?\b/i),
    oscars: oscarHighlight?.count ?? null,
    highlights,
  };
}
