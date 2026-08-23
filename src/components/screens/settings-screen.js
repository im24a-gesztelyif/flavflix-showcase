"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, HardDriveDownload, Trash2, UserRound, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { useAppState } from "@/lib/app-state";
import { resolveProviderId } from "@/lib/providers";
import { clearTmdbCache, getStorageUsage } from "@/lib/storage";
import { formatBytes } from "@/lib/utils";

function DangerModal({
  action,
  secondsLeft,
  password,
  confirmationText,
  onPasswordChange,
  onConfirmationChange,
  onConfirm,
  onClose,
}) {
  const deletingCache = action === "cache";
  const deletingProfile = action === "profile";
  const deletingAccount = action === "account";

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-[#040406cc] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:px-4 sm:pb-0 sm:pt-0"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-xl rounded-[28px] border border-red-300/28 bg-[linear-gradient(180deg,rgba(49,7,13,0.96),rgba(11,9,13,0.98))] p-5 shadow-[0_35px_100px_rgba(0,0,0,0.52)] sm:rounded-[36px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-300/24 bg-red-500/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-red-50/90">
              <AlertTriangle className="h-3.5 w-3.5" />
              Confirm deletion
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-white">
              {deletingCache
                ? "Clear cached TMDB data?"
                : deletingProfile
                  ? "Clear current profile data?"
                  : "Delete this account?"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-red-50/75">
              {deletingCache
                ? "This only removes cached metadata and posters from this browser. FlavFlix rebuilds it the next time you browse."
                : deletingProfile
                  ? "This wipes saved titles, continue watching, history, and settings for the active profile only."
                  : "This permanently deletes the account, all profiles, and every synced row tied to them."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/72 transition hover:text-white"
            aria-label="Close confirmation modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-[28px] border border-red-300/22 bg-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-red-50/62">Safety timer</p>
          <p className="mt-3 text-sm leading-7 text-red-50/74">
            The destructive action is locked for five seconds to prevent accidental clicks.
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-red-400 transition-[width] duration-1000"
              style={{ width: `${((5 - Math.min(secondsLeft, 5)) / 5) * 100}%` }}
            />
          </div>
        </div>

        {deletingAccount ? (
          <div className="mt-6 space-y-4">
            <label className="flex flex-col gap-2 text-sm text-red-50/72">
              <span>Type DELETE ACCOUNT</span>
              <input
                value={confirmationText}
                onChange={(event) => onConfirmationChange(event.target.value)}
                className="rounded-2xl border border-red-300/24 bg-black/30 px-4 py-3 text-white outline-none"
                placeholder="DELETE ACCOUNT"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-red-50/72">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                className="rounded-2xl border border-red-300/24 bg-black/30 px-4 py-3 text-white outline-none"
                placeholder="Re-enter your password"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={secondsLeft > 0}
            className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            {secondsLeft > 0
              ? `Confirm in ${secondsLeft}s`
              : deletingCache
                ? "Delete Cache"
                : deletingProfile
                  ? "Delete Profile Data"
                  : "Delete Account"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/76 transition hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const { settings, updateSettings, activeProfile, activeProfileData, user, clearActiveProfileData, deleteAccount } = useAppState();
  const [pendingAction, setPendingAction] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [usage, setUsage] = useState({
    cacheBytes: 0,
    sessionBytes: 0,
    legacyBytes: 0,
  });
  const [usageLoading, setUsageLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");

  useEffect(() => {
    if (!pendingAction || secondsLeft <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [pendingAction, secondsLeft]);

  useEffect(() => {
    let cancelled = false;

    async function refreshUsageState() {
      setUsageLoading(true);
      const nextUsage = await getStorageUsage();

      if (!cancelled) {
        setUsage(nextUsage);
        setUsageLoading(false);
      }
    }

    refreshUsageState();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshUsage() {
    setUsageLoading(true);
    const nextUsage = await getStorageUsage();
    setUsage(nextUsage);
    setUsageLoading(false);
  }

  function queueDangerAction(action) {
    setPendingAction(action);
    setSecondsLeft(5);
    setPassword("");
    setConfirmationText("");
    setStatusMessage("");
    setErrorMessage("");
  }

  async function confirmDangerAction() {
    if (!pendingAction || secondsLeft > 0) {
      return;
    }

    setErrorMessage("");

    try {
      if (pendingAction === "cache") {
        clearTmdbCache();
        setPendingAction(null);
        setStatusMessage("TMDB cache cleared.");
        await refreshUsage();
        return;
      }

      if (pendingAction === "profile") {
        await clearActiveProfileData();
        setPendingAction(null);
        setStatusMessage("Current profile data cleared.");
        return;
      }

      await deleteAccount({
        password,
        confirmation: confirmationText,
      });
      window.location.replace("/auth?mode=login");
    } catch (actionError) {
      setErrorMessage(actionError.message || "Destructive action failed.");
    }
  }

  const remoteSummary = useMemo(
    () => ({
      savedCount: activeProfileData.saved.length,
      historyCount: activeProfileData.history.length,
      progressCount: Object.keys(activeProfileData.progress || {}).length,
    }),
    [activeProfileData.history.length, activeProfileData.progress, activeProfileData.saved.length],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Account and discovery preferences"
        description="These settings belong to the active profile and sync through your FlavFlix account."
      />

      {errorMessage ? (
        <div className="surface border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">{errorMessage}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="surface space-y-5 p-6">
          <h2 className="text-2xl font-semibold text-white">Public showcase mode</h2>

          <label className="flex flex-col gap-2 text-sm text-white/55">
            <span>Playback mode</span>
            <select
              value={resolveProviderId(settings.defaultProvider)}
              onChange={(event) => updateSettings({ defaultProvider: event.target.value })}
              className="brand-select"
            >
              <option value="showcase">Playback disabled</option>
            </select>
          </label>

          <label className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <span className="text-sm text-white/70">External playback providers</span>
            <input
              type="checkbox"
              checked={settings.fallbackEnabled}
              disabled
              className="h-5 w-5 accent-[#e31f5c]"
            />
          </label>

          <label className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <span className="text-sm text-white/70">Autoplay next episode</span>
            <input
              type="checkbox"
              checked={settings.autoplayNextEpisode}
              disabled
              className="h-5 w-5 accent-[#e31f5c]"
            />
          </label>
        </div>

        <div className="surface space-y-5 p-6">
          <h2 className="text-2xl font-semibold text-white">TMDB Locale</h2>

          <label className="flex flex-col gap-2 text-sm text-white/55">
            <span>Language</span>
            <input
              value={settings.language}
              onChange={(event) => updateSettings({ language: event.target.value })}
              placeholder="en-US"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-white/55">
            <span>Region</span>
            <input
              value={settings.region}
              onChange={(event) => updateSettings({ region: event.target.value })}
              placeholder="US"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
            />
          </label>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/55">
            TMDB localization affects metadata language, discover filters, release-date presentation, and country-specific watch-provider availability data.
          </div>

          <TmdbAttribution
            variant="primaryFull"
            logoScale={1.18}
            className="w-full"
            title="Metadata attribution"
            body="FlavFlix uses TMDB for localized title metadata, discovery filters, release data, cast information, and related content."
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6 rounded-[32px] border border-red-500/35 bg-[linear-gradient(180deg,rgba(127,18,31,0.38),rgba(48,7,12,0.92))] p-6 shadow-[0_30px_90px_rgba(127,18,31,0.35)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-300/30 bg-red-500/18 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-red-50">
                <AlertTriangle className="h-3.5 w-3.5" />
                Warning
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">Data controls</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-red-50/78">
                TMDB cache stays local to this browser. Profile data and account data now live remotely in Supabase.
              </p>
            </div>
            {statusMessage ? <p className="text-sm font-semibold text-red-50">{statusMessage}</p> : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-[28px] border border-red-400/30 bg-black/30 p-5">
              <h3 className="text-lg font-semibold text-white">Clear TMDB cache</h3>
              <p className="mt-2 text-sm leading-7 text-red-50/72">
                Removes locally cached metadata responses so posters, rails, and details are fetched again.
              </p>
              <div className="mt-5 rounded-[24px] border border-red-300/18 bg-red-950/20 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-red-50/62">
                  <Database className="h-3.5 w-3.5" />
                  Cache on disk
                </div>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {usageLoading ? "Calculating..." : formatBytes(usage.cacheBytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => queueDangerAction("cache")}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-300/35 bg-red-500/20 px-5 py-3 text-sm font-semibold text-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Cache
              </button>
            </div>

            <div className="rounded-[28px] border border-red-400/30 bg-black/30 p-5">
              <h3 className="text-lg font-semibold text-white">Clear current profile data</h3>
              <p className="mt-2 text-sm leading-7 text-red-50/72">
                Wipes only the active profile&apos;s saved titles, history, progress, and synced settings.
              </p>
              <div className="mt-5 rounded-[24px] border border-red-300/18 bg-red-950/20 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-red-50/62">
                  <HardDriveDownload className="h-3.5 w-3.5" />
                  Active profile
                </div>
                <p className="mt-3 text-xl font-semibold text-white">{activeProfile?.name || "No profile selected"}</p>
                <p className="mt-2 text-sm leading-7 text-red-50/62">
                  {remoteSummary.savedCount} saved | {remoteSummary.progressCount} in progress | {remoteSummary.historyCount} history rows
                </p>
              </div>
              <button
                type="button"
                onClick={() => queueDangerAction("profile")}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-300/35 bg-red-500/20 px-5 py-3 text-sm font-semibold text-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Profile Data
              </button>
            </div>

            <div className="rounded-[28px] border border-red-400/30 bg-black/30 p-5">
              <h3 className="text-lg font-semibold text-white">Delete account</h3>
              <p className="mt-2 text-sm leading-7 text-red-50/72">
                Permanently removes the signed-in account and all of its profiles from Supabase.
              </p>
              <div className="mt-5 rounded-[24px] border border-red-300/18 bg-red-950/20 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-red-50/62">
                  <UserRound className="h-3.5 w-3.5" />
                  Account owner
                </div>
                <p className="mt-3 truncate text-xl font-semibold text-white">{user?.email || "Unknown user"}</p>
                <p className="mt-2 text-sm leading-7 text-red-50/62">
                  Requires typed confirmation and password re-entry.
                </p>
              </div>
              <button
                type="button"
                onClick={() => queueDangerAction("account")}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-300/35 bg-red-500/20 px-5 py-3 text-sm font-semibold text-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="text-2xl font-semibold text-white">Local browser state</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">TMDB cache</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {usageLoading ? "Calculating..." : formatBytes(usage.cacheBytes)}
              </p>
              <p className="mt-2 text-sm leading-7 text-white/55">Public metadata cache kept local for speed and lower hosted usage.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Local account hints</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {usageLoading ? "Calculating..." : formatBytes(usage.sessionBytes + usage.legacyBytes)}
              </p>
              <p className="mt-2 text-sm leading-7 text-white/55">
                Only profile selection and any leftover legacy browser state remain local.
              </p>
            </div>
          </div>
        </section>
      </div>

      {pendingAction ? (
        <DangerModal
          action={pendingAction}
          secondsLeft={secondsLeft}
          password={password}
          confirmationText={confirmationText}
          onPasswordChange={setPassword}
          onConfirmationChange={setConfirmationText}
          onConfirm={confirmDangerAction}
          onClose={() => {
            setPendingAction(null);
            setSecondsLeft(0);
            setPassword("");
            setConfirmationText("");
          }}
        />
      ) : null}
    </div>
  );
}
