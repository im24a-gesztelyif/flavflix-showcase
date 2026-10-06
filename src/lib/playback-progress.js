function clampProgress(value) {
  return Math.max(0, Math.min(1, value));
}

export function resolvePlaybackFraction({ event, currentTime, duration, percent }) {
  if (event === "ended") {
    return 1;
  }

  const normalizedCurrentTime = Number(currentTime);
  const normalizedDuration = Number(duration);

  if (
    Number.isFinite(normalizedCurrentTime) &&
    normalizedCurrentTime >= 0 &&
    Number.isFinite(normalizedDuration) &&
    normalizedDuration > 0
  ) {
    return clampProgress(normalizedCurrentTime / normalizedDuration);
  }

  const normalizedPercent = Number(percent);

  if (!Number.isFinite(normalizedPercent) || normalizedPercent < 0) {
    return null;
  }

  return clampProgress(normalizedPercent > 1 ? normalizedPercent / 100 : normalizedPercent);
}
