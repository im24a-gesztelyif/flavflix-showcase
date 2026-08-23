"use client";

const PLAYER_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; fullscreen *";

export function PlayerShell({ src, title, fullViewport = false, iframeRef }) {
  if (fullViewport) {
    return (
      <div className="absolute inset-0 bg-black">
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          className="h-full w-full border-0"
          allow={PLAYER_IFRAME_ALLOW}
          allowFullScreen
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
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          className="h-full w-full border-0"
          allow={PLAYER_IFRAME_ALLOW}
          allowFullScreen
          loading="eager"
          referrerPolicy="origin-when-cross-origin"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
