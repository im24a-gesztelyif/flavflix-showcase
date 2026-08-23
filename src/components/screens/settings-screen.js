"use client";

import { useState } from "react";
import { Database, HardDrive, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { useAppState } from "@/lib/app-state";
import { PROVIDER_OPTIONS, resolveProviderId } from "@/lib/providers";
import { clearTmdbCache } from "@/lib/storage";

export function SettingsScreen() {
  const { settings, updateSettings, activeProfile, activeProfileData, clearActiveProfileData } = useAppState();
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Showcase settings"
        title="Playback and profile preferences"
        description="Everything here is stored only in this browser. No account or cloud database is used."
      />

      {message ? <div className="surface p-4 text-sm text-white/75">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface space-y-5 p-6">
          <h2 className="text-2xl font-semibold text-white">Playback</h2>
          <label className="flex flex-col gap-2 text-sm text-white/55">
            <span>Preferred third-party source</span>
            <select
              value={resolveProviderId(settings.defaultProvider)}
              onChange={(event) => updateSettings({ defaultProvider: event.target.value })}
              className="brand-select"
            >
              {PROVIDER_OPTIONS.map((provider, index) => (
                <option key={provider.id} value={provider.id}>Source {index + 1}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <span className="text-sm text-white/70">Try fallback sources</span>
            <input type="checkbox" checked={settings.fallbackEnabled} onChange={(event) => updateSettings({ fallbackEnabled: event.target.checked })} className="h-5 w-5 accent-[#e31f5c]" />
          </label>
          <label className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <span className="text-sm text-white/70">Autoplay next episode</span>
            <input type="checkbox" checked={settings.autoplayNextEpisode} onChange={(event) => updateSettings({ autoplayNextEpisode: event.target.checked })} className="h-5 w-5 accent-[#e31f5c]" />
          </label>
          <p className="text-xs leading-6 text-white/45">Every movie or episode preview is limited to five minutes in this portfolio showcase.</p>
        </section>

        <section className="surface space-y-5 p-6">
          <h2 className="text-2xl font-semibold text-white">Browser data</h2>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
            <p className="font-semibold text-white">{activeProfile?.name || "Current profile"}</p>
            <p className="mt-2">{activeProfileData.saved.length} saved · {activeProfileData.history.length} history entries</p>
          </div>
          <button type="button" onClick={() => { clearTmdbCache(); setMessage("Metadata cache cleared."); }} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/75 hover:bg-white/5">
            <Database className="h-4 w-4" /> Clear metadata cache
          </button>
          <button type="button" onClick={async () => { await clearActiveProfileData(); setMessage("Current profile data cleared."); }} className="flex w-full items-center gap-3 rounded-2xl border border-red-300/20 bg-red-500/5 px-4 py-3 text-sm text-red-100 hover:bg-red-500/10">
            <Trash2 className="h-4 w-4" /> Clear current profile data
          </button>
          <div className="flex gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/55">
            <HardDrive className="mt-1 h-4 w-4 shrink-0" /> Profiles, lists, settings, history, and preview usage remain in local storage on this device.
          </div>
        </section>
      </div>

      <TmdbAttribution variant="primaryLong" />
    </div>
  );
}
