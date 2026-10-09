"use client";

import { useEffect, useRef, useState } from "react";
import { SkipForward } from "lucide-react";
import { findIntroDbSegment, getCreditsPlayback } from "@/lib/introdb";
import { buildProviderSeekCommand, getProviderMetadata } from "@/lib/providers";
import { readProviderMessage, resolveProviderProgress } from "@/lib/provider-events";

export function IntroSkipButton({ providerId, mediaType, id, season, episode, iframeRef, hidden, raised, onPlaybackChange }) {
  const [activeSegment, setActiveSegment] = useState(null);
  const skippedSegmentRef = useRef(null);
  const onPlaybackChangeRef = useRef(onPlaybackChange);
  onPlaybackChangeRef.current = onPlaybackChange;

  useEffect(() => {
    const canSeek = Boolean(buildProviderSeekCommand(providerId, 0));
    const metadata = getProviderMetadata(providerId);
    if (!canSeek && !(mediaType === "tv" && onPlaybackChangeRef.current && metadata.id === providerId && metadata.supportsProgress)) return;
    const controller = new AbortController();
    const context = { providerId, mediaType, id, season, episode };
    let requested = false;
    let metrics = null;
    let segments = [];
    let paused = false;

    function updateSegment() {
      const credits = getCreditsPlayback(segments, metrics?.currentTime, paused);
      onPlaybackChangeRef.current?.(credits);
      const segment = canSeek ? findIntroDbSegment(segments.filter((item) =>
        !item.openEnded && !(mediaType === "tv" && credits.hasCredits && ["credits", "preview"].includes(item.type)),
      ), metrics?.currentTime) : null;
      const skipped = skippedSegmentRef.current;
      if (skipped && (metrics?.currentTime < skipped.start || metrics?.currentTime >= skipped.end)) {
        skippedSegmentRef.current = null;
      }
      const next = segment === skippedSegmentRef.current ? null : segment;
      setActiveSegment((previous) => previous === next ? previous : next);
    }

    async function loadSegments(duration) {
      const params = new URLSearchParams({ v: "3", mediaType, tmdbId: String(id), durationMs: String(Math.round(duration * 1000)) });
      if (mediaType === "tv") {
        params.set("season", String(season));
        params.set("episode", String(episode));
      }
      try {
        const response = await fetch(`/api/skip-segments?${params}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (controller.signal.aborted) return;
        segments = Array.isArray(data.segments) ? data.segments : [];
        updateSegment();
      } catch {
        // Skip controls are optional; network failures must never interrupt playback.
      }
    }

    function handleMessage(event) {
      const payload = readProviderMessage(event, context, iframeRef.current?.contentWindow);
      if (!payload || payload.cached || payload.event === "nextepisode") return;
      if (payload.event === "pause") paused = true;
      if (payload.event === "play" || (payload.event === "timeupdate" && payload.currentTime > metrics?.currentTime)) paused = false;
      metrics = resolveProviderProgress(payload, metrics);
      if (!metrics) return;
      if (!requested && metrics.duration <= 21600) {
        requested = true;
        void loadSegments(metrics.duration);
      }
      updateSegment();
    }

    window.addEventListener("message", handleMessage);
    return () => {
      controller.abort();
      window.removeEventListener("message", handleMessage);
    };
  }, [providerId, mediaType, id, season, episode, iframeRef]);

  if (!activeSegment || hidden) return null;

  function skip() {
    const command = buildProviderSeekCommand(providerId, activeSegment.end);
    const player = iframeRef.current?.contentWindow;
    if (!command || !player) return;
    player.postMessage(command, getProviderMetadata(providerId).origin);
    skippedSegmentRef.current = activeSegment;
    setActiveSegment(null);
  }

  return (
    <button
      type="button"
      onClick={skip}
      className={`absolute right-4 z-[55] inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/75 px-5 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:right-8 ${raised ? "bottom-[calc(11rem+env(safe-area-inset-bottom))]" : "bottom-[calc(7rem+env(safe-area-inset-bottom))]"}`}
    >
      <SkipForward className="h-4 w-4" aria-hidden="true" />
      {activeSegment.label}
    </button>
  );
}
