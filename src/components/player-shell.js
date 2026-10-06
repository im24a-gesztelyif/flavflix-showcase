"use client";

import { useEffect, useState } from "react";
import { AppLink } from "@/components/app-link";

const PLAYER_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen 'none'";

export function PlayerShell({ src, title, fullViewport = false, iframeRef, previewKey }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!previewKey) return;
    const budget = 300;
    let used;
    try {
      const saved = Number(window.localStorage.getItem(previewKey) || 0);
      used = Number.isFinite(saved) ? Math.min(budget, Math.max(0, saved)) : budget;
    } catch {
      setRemaining(0);
      return;
    }
    const started = Date.now();
    const persist = () => {
      const consumed = Math.min(budget, used + Math.max(0, Date.now() - started) / 1000);
      try {
        const otherTab = Number(window.localStorage.getItem(previewKey) || 0);
        const total = Math.max(consumed, Number.isFinite(otherTab) ? otherTab : budget);
        window.localStorage.setItem(previewKey, String(total));
        setRemaining(Math.max(0, Math.ceil(budget - total)));
      } catch {
        setRemaining(0);
      }
    };
    persist();
    const interval = window.setInterval(persist, 250);
    window.addEventListener("pagehide", persist);
    return () => {
      persist();
      window.clearInterval(interval);
      window.removeEventListener("pagehide", persist);
    };
  }, [previewKey]);

  if (previewKey && remaining === null) return null;
  if (previewKey && remaining === 0) {
    return (
      <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-black p-6 text-center">
        <h1 className="text-2xl font-semibold">Five-minute preview complete</h1>
        <p className="max-w-lg text-white/70">This portfolio showcase limits each movie or episode to five minutes. You can continue exploring the rest of FlavFlix.</p>
        <AppLink href="/" className="button-primary">Explore FlavFlix</AppLink>
      </div>
    );
  }
  const previewNotice = previewKey ? (
    <div className="pointer-events-none absolute bottom-2 left-2 z-[150] rounded-lg bg-black/80 px-3 py-2 text-xs text-white/80">
      Showcase preview · {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} remaining
    </div>
  ) : null;
  if (fullViewport) {
    return (
      <div className="absolute inset-0 bg-black">
        {previewNotice}
        <iframe
          key={src}
          ref={iframeRef}
          src={src}
          title={title}
          className="h-full w-full border-0"
          allow={PLAYER_IFRAME_ALLOW}
          loading="eager"
          referrerPolicy="origin-when-cross-origin"
          tabIndex={-1}
        />
      </div>
    );
  }

  return (
    <div className="surface-strong overflow-hidden p-3">
      <div className="relative aspect-video overflow-hidden rounded-[28px] bg-black">
        {previewNotice}
        <iframe
          key={src}
          ref={iframeRef}
          src={src}
          title={title}
          className="h-full w-full border-0"
          allow={PLAYER_IFRAME_ALLOW}
          loading="eager"
          referrerPolicy="origin-when-cross-origin"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
