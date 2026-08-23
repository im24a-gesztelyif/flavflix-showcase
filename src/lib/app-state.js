"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createEmptyBucket, DEFAULT_PROFILE_ACCENT, MAX_PROFILES } from "@/lib/account-store";
import { createMediaActivityKey, createMediaSnapshot, createProgressKey, normalizeProgressMetrics } from "@/lib/media";
import { DEFAULT_SETTINGS } from "@/lib/storage";

const AppStateContext = createContext(null);
const STORAGE_KEY = "flavflix-showcase-state:v1";
const SHOWCASE_USER = { id: "showcase-visitor", isShowcase: true };

function createInitialState() {
  return { profiles: [], activeProfileId: null, profileData: {} };
}

function normalizeState(value) {
  if (!value || !Array.isArray(value.profiles)) return createInitialState();
  const profiles = value.profiles.slice(0, MAX_PROFILES);
  const profileData = Object.fromEntries(profiles.map((profile) => [
    profile.id,
    { ...createEmptyBucket(), ...(value.profileData?.[profile.id] || {}), loaded: true, loading: false },
  ]));
  return {
    profiles,
    activeProfileId: profiles.some((profile) => profile.id === value.activeProfileId) ? value.activeProfileId : null,
    profileData,
  };
}

function updateHistory(entries, progressEntry) {
  const key = createMediaActivityKey(progressEntry);
  const entry = {
    key,
    mediaType: progressEntry.mediaType,
    id: progressEntry.id,
    season: progressEntry.season,
    episode: progressEntry.episode,
    watchedAt: progressEntry.updatedAt,
    provider: progressEntry.provider,
    percent: progressEntry.percent,
    snapshot: progressEntry.snapshot,
  };
  return [entry, ...(entries || []).filter((item) => item.key !== key)].slice(0, 150);
}

export function AppStateProvider({ children }) {
  const [state, setState] = useState(createInitialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setState(saved ? normalizeState(JSON.parse(saved)) : createInitialState());
    } catch (loadError) {
      setError(loadError);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (saveError) {
      setError(saveError);
    }
  }, [ready, state]);

  const activeProfile = state.profiles.find((profile) => profile.id === state.activeProfileId) || null;
  const activeProfileData = activeProfile ? state.profileData[activeProfile.id] || createEmptyBucket() : createEmptyBucket();

  const updateProfileBucket = useCallback((profileId, updater) => {
    setState((current) => {
      const bucket = current.profileData[profileId] || createEmptyBucket();
      const nextBucket = typeof updater === "function" ? updater(bucket) : updater;
      return { ...current, profileData: { ...current.profileData, [profileId]: nextBucket } };
    });
  }, []);

  const setActiveProfile = useCallback(async (profileId) => {
    setState((current) => ({ ...current, activeProfileId: profileId || null }));
  }, []);

  const createProfile = useCallback(async (name) => {
    const cleanName = String(name || "").trim().slice(0, 30);
    if (!cleanName) throw new Error("Enter a profile name.");
    let createdId = null;
    setState((current) => {
      if (current.profiles.length >= MAX_PROFILES) return current;
      createdId = globalThis.crypto?.randomUUID?.() || `profile-${Date.now()}`;
      const profile = { id: createdId, name: cleanName, accent: DEFAULT_PROFILE_ACCENT, createdAt: new Date().toISOString() };
      return {
        profiles: [...current.profiles, profile],
        activeProfileId: createdId,
        profileData: { ...current.profileData, [createdId]: createEmptyBucket() },
      };
    });
    return createdId;
  }, []);

  const updateProfile = useCallback(async (profileId, patch) => {
    setState((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => profile.id === profileId
        ? { ...profile, ...patch, name: String(patch?.name || profile.name).trim().slice(0, 30) || profile.name }
        : profile),
    }));
  }, []);

  const removeProfile = useCallback(async (profileId) => {
    setState((current) => {
      if (current.profiles.length <= 1) return current;
      const profileData = { ...current.profileData };
      delete profileData[profileId];
      return {
        profiles: current.profiles.filter((profile) => profile.id !== profileId),
        activeProfileId: current.activeProfileId === profileId ? null : current.activeProfileId,
        profileData,
      };
    });
  }, []);

  const updateSettings = useCallback(async (patch) => {
    if (!activeProfile) return;
    updateProfileBucket(activeProfile.id, (current) => ({
      ...current,
      settings: { ...DEFAULT_SETTINGS, ...current.settings, ...patch },
    }));
  }, [activeProfile, updateProfileBucket]);

  const toggleSaved = useCallback(async (item, fallbackType) => {
    if (!activeProfile) return;
    const snapshot = createMediaSnapshot(item, fallbackType);
    if (!snapshot) return;
    updateProfileBucket(activeProfile.id, (current) => {
      const exists = current.saved.some((entry) => entry.id === snapshot.id && entry.mediaType === snapshot.mediaType);
      return {
        ...current,
        saved: exists
          ? current.saved.filter((entry) => !(entry.id === snapshot.id && entry.mediaType === snapshot.mediaType))
          : [{ ...snapshot, savedAt: new Date().toISOString() }, ...current.saved],
      };
    });
  }, [activeProfile, updateProfileBucket]);

  const isSaved = useCallback((id, mediaType) =>
    activeProfileData.saved.some((entry) => entry.id === Number(id) && entry.mediaType === mediaType),
  [activeProfileData.saved]);

  const recordProgress = useCallback(async (payload) => {
    if (!activeProfile || !payload?.id || !payload?.mediaType || !payload?.duration) return;
    updateProfileBucket(activeProfile.id, (current) => {
      const key = createProgressKey(payload);
      const metrics = normalizeProgressMetrics(payload);
      const entry = {
        key,
        id: Number(payload.id),
        mediaType: payload.mediaType,
        season: payload.mediaType === "tv" ? Number(payload.season || 1) : undefined,
        episode: payload.mediaType === "tv" ? Number(payload.episode || 1) : undefined,
        currentTime: metrics.currentTime,
        duration: metrics.duration,
        percent: metrics.percent,
        watchedComplete: metrics.watchedComplete,
        provider: payload.provider || current.settings.defaultProvider,
        updatedAt: new Date().toISOString(),
        snapshot: payload.snapshot ? createMediaSnapshot(payload.snapshot, payload.mediaType) : current.progress[key]?.snapshot || null,
      };
      return { ...current, progress: { ...current.progress, [key]: entry }, history: updateHistory(current.history, entry) };
    });
  }, [activeProfile, updateProfileBucket]);

  const clearMediaActivity = useCallback(async (id, mediaType) => {
    if (!activeProfile) return;
    updateProfileBucket(activeProfile.id, (current) => ({
      ...current,
      progress: Object.fromEntries(Object.entries(current.progress).filter(([, entry]) => !(entry.id === Number(id) && entry.mediaType === mediaType))),
      history: current.history.filter((entry) => !(entry.id === Number(id) && entry.mediaType === mediaType)),
    }));
  }, [activeProfile, updateProfileBucket]);

  const clearActiveProfileData = useCallback(async () => {
    if (activeProfile) updateProfileBucket(activeProfile.id, createEmptyBucket());
  }, [activeProfile, updateProfileBucket]);

  const value = useMemo(() => ({
    authReady: ready,
    ready,
    error,
    session: { user: SHOWCASE_USER },
    user: SHOWCASE_USER,
    profiles: state.profiles,
    activeProfile,
    activeProfileData,
    settings: activeProfileData.settings || DEFAULT_SETTINGS,
    setActiveProfile,
    createProfile,
    updateProfile,
    removeProfile,
    updateSettings,
    toggleSaved,
    isSaved,
    recordProgress,
    clearMediaActivity,
    clearActiveProfileData,
  }), [activeProfile, activeProfileData, clearActiveProfileData, clearMediaActivity, createProfile, error, isSaved, ready, recordProgress, removeProfile, setActiveProfile, state.profiles, toggleSaved, updateProfile, updateSettings]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider.");
  return context;
}
