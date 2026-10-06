"use client";

import { useEffect, useRef, useState } from "react";
import { SkipForward } from "lucide-react";

export function CreditsNextEpisode({ visible, paused, previewStart, canSeek, season, episode, onNext, onPreview }) {
  const [manual, setManual] = useState(false);
  const [counting, setCounting] = useState(false);
  const cancelledRef = useRef(false);
  const timerRef = useRef(null);
  const nextRef = useRef(onNext);
  nextRef.current = onNext;

  function cancelCountdown() {
    cancelledRef.current = true;
    window.clearTimeout(timerRef.current);
    setManual(true);
    setCounting(false);
  }

  function isIframeFullscreen() {
    const element = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    return element?.tagName === "IFRAME";
  }

  useEffect(() => {
    if (!visible || manual || paused) return;
    if (isIframeFullscreen()) {
      cancelCountdown();
      return;
    }
    cancelledRef.current = false;
    setCounting(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setCounting(false);
      if (!cancelledRef.current) nextRef.current();
    }, 5000);
    return () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      setCounting(false);
    };
  }, [visible, manual, paused]);

  useEffect(() => {
    if (!counting) return;
    function handleFullscreen() {
      if (isIframeFullscreen()) cancelCountdown();
    }
    window.addEventListener("mousemove", cancelCountdown);
    window.addEventListener("pointerdown", cancelCountdown);
    window.addEventListener("keydown", cancelCountdown);
    document.addEventListener("fullscreenchange", handleFullscreen);
    document.addEventListener("webkitfullscreenchange", handleFullscreen);
    return () => {
      window.removeEventListener("mousemove", cancelCountdown);
      window.removeEventListener("pointerdown", cancelCountdown);
      window.removeEventListener("keydown", cancelCountdown);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      document.removeEventListener("webkitfullscreenchange", handleFullscreen);
    };
  }, [counting]);

  if (!visible) return null;

  return (
    <>
      {counting ? (
        <div
          className="absolute inset-0 z-[54]"
          onMouseMove={cancelCountdown}
          onPointerDown={cancelCountdown}
          aria-hidden="true"
        />
      ) : null}
      <div className="absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 z-[55] flex flex-col items-end gap-2 md:bottom-28 md:right-8">
        {canSeek && previewStart !== null ? (
          <button
            type="button"
            onClick={() => { cancelCountdown(); onPreview(previewStart); }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/75 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md hover:bg-black/90"
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            Skip to preview
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => { cancelCountdown(); onNext(); }}
          className="relative inline-flex min-h-11 items-center gap-3 overflow-hidden rounded-full border border-accent-300/34 bg-[rgba(58,10,25,0.88)] px-4 py-3 text-sm font-semibold text-white shadow-[0_24px_62px_rgba(0,0,0,0.48)] backdrop-blur-xl hover:bg-[rgba(74,14,33,0.94)] sm:px-5"
          aria-label={counting ? `Next episode S${season} E${episode}, starting automatically in 5 seconds` : `Next episode S${season} E${episode}`}
        >
          {counting ? <span aria-hidden="true" className="absolute inset-0 origin-left bg-accent-400/35 animate-[episode-countdown-fill_5s_linear_forwards]" /> : null}
          <SkipForward className="relative h-4 w-4" aria-hidden="true" />
          <span className="relative">Next Episode</span>
          <span className="relative text-white/62">S{season} E{episode}</span>
        </button>
      </div>
    </>
  );
}
