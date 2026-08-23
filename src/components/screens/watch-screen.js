"use client";

import { AppLink } from "@/components/app-link";

export function WatchScreen({ mediaType, id }) {
  const detailHref = `/${mediaType}/${id}`;

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-4 py-16 sm:px-6">
      <div className="surface w-full space-y-6 p-8 text-center sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#e31f5c]">Public learning showcase</p>
        <h1 className="text-3xl font-semibold text-white sm:text-5xl">Playback is intentionally disabled</h1>
        <p className="mx-auto max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
          This public repository demonstrates FlavFlix&apos;s discovery, account, profile, list, history, and interface
          architecture. Experimental third-party playback integrations remain outside the public showcase.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <AppLink className="brand-button brand-button-primary" href={detailHref}>
            Return to title details
          </AppLink>
          <AppLink className="brand-button brand-button-secondary" href="/">
            Browse FlavFlix
          </AppLink>
        </div>
      </div>
    </section>
  );
}
