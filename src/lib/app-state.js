"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  clearMediaActivityEntries,
  clearProfileData,
  createEmptyBucket,
  createProfile as createRemoteProfile,
  ensureAccountProfiles,
  fetchProfileBundle,
  removeProfile as deleteRemoteProfile,
  renameProfile,
  setSavedState,
  upsertHistoryEntry,
  upsertProfileSettings,
  upsertProgressEntry,
} from "@/lib/account-store";
import { createMediaActivityKey, createMediaSnapshot, createProgressKey, normalizeProgressMetrics } from "@/lib/media";
import {
  clearLegacyPersonalStorage,
  clearSessionState,
  DEFAULT_SETTINGS,
} from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabasePublicEnv } from "@/lib/supabase/shared";

const AppStateContext = createContext(null);

function updateHistoryEntries(entries, progressEntry) {
  const key = createMediaActivityKey(progressEntry);
  const nextEntries = (entries || []).filter((entry) => entry.key !== key);

  nextEntries.unshift({
    key,
    mediaType: progressEntry.mediaType,
    id: progressEntry.id,
    season: progressEntry.season,
    episode: progressEntry.episode,
    watchedAt: progressEntry.updatedAt,
    provider: progressEntry.provider,
    percent: progressEntry.percent,
    snapshot: progressEntry.snapshot,
  });

  return nextEntries.slice(0, 150);
}

function createInitialState() {
  return {
    profiles: [],
    activeProfileId: null,
    profileData: {},
  };
}

export function AppStateProvider({ children }) {
  const supabase = useMemo(() => (hasSupabasePublicEnv() ? getSupabaseBrowserClient() : null), []);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  const [state, setState] = useState(createInitialState);
  const [error, setError] = useState(null);
  const bootstrapSequenceRef = useRef(0);
  const profileLoadSequenceRef = useRef(0);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateProfileBucket = useCallback((profileId, updater) => {
    setState((current) => {
      const existingBucket = current.profileData[profileId] || createEmptyBucket();
      const nextBucket = typeof updater === "function" ? updater(existingBucket) : updater;

      return {
        ...current,
        profileData: {
          ...current.profileData,
          [profileId]: nextBucket,
        },
      };
    });
  }, []);

  const loadProfileBucket = useCallback(
    async (profileId, options = {}) => {
      if (!profileId) {
        return;
      }

      const force = options.force === true;
      const currentBucket = stateRef.current.profileData[profileId];

      if (!force && (currentBucket?.loaded || currentBucket?.loading)) {
        return;
      }

      const sequence = profileLoadSequenceRef.current + 1;
      profileLoadSequenceRef.current = sequence;

      updateProfileBucket(profileId, (current) => ({
        ...createEmptyBucket(),
        ...current,
        loaded: false,
        loading: true,
      }));

      try {
        const nextBucket = await fetchProfileBundle(supabase, profileId);

        if (profileLoadSequenceRef.current !== sequence) {
          return;
        }

        updateProfileBucket(profileId, {
          ...nextBucket,
          loaded: true,
          loading: false,
        });
      } catch (loadError) {
        if (profileLoadSequenceRef.current !== sequence) {
          return;
        }

        setError(loadError);
        updateProfileBucket(profileId, (current) => ({
          ...createEmptyBucket(),
          ...current,
          loaded: true,
          loading: false,
        }));
      }
    },
    [supabase, updateProfileBucket],
  );

  const bootstrapAccount = useCallback(
    async (nextUser) => {
      const sequence = bootstrapSequenceRef.current + 1;
      bootstrapSequenceRef.current = sequence;
      setAccountReady(false);
      setError(null);

      try {
        const profiles = await ensureAccountProfiles(supabase, nextUser.id);

        if (bootstrapSequenceRef.current !== sequence) {
          return;
        }

        clearSessionState(nextUser.id);

        setState({
          profiles,
          activeProfileId: null,
          profileData: {},
        });

        setAccountReady(true);
      } catch (bootstrapError) {
        if (bootstrapSequenceRef.current !== sequence) {
          return;
        }

        setState(createInitialState());
        setError(bootstrapError);
        setAccountReady(true);
      }
    },
    [supabase],
  );

  useEffect(() => {
    let mounted = true;

    clearLegacyPersonalStorage();

    if (!supabase) {
      setError(new Error("Missing Supabase environment variables."));
      setAuthReady(true);
      setAccountReady(true);
      return undefined;
    }

    fetch("/api/auth/session", {
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!mounted) {
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error || "Session lookup failed.");
        }

        const nextUser = payload.user || null;

        setSession(nextUser ? { user: nextUser } : null);
        setUser(nextUser);
        setAuthReady(true);

        if (nextUser) {
          await bootstrapAccount(nextUser);
        } else {
          setAccountReady(true);
        }
      })
      .catch((sessionError) => {
        if (!mounted) {
          return;
        }

        setError(sessionError);
        setAuthReady(true);
        setAccountReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [bootstrapAccount, supabase]);

  useEffect(() => {
    if (!user || !state.activeProfileId) {
      return;
    }

    const activeBucket = state.profileData[state.activeProfileId];

    if (!activeBucket || (!activeBucket.loaded && !activeBucket.loading)) {
      loadProfileBucket(state.activeProfileId);
    }
  }, [loadProfileBucket, state.activeProfileId, state.profileData, user]);

  const activeProfile = state.profiles.find((profile) => profile.id === state.activeProfileId) || null;
  const activeProfileData = activeProfile ? state.profileData[activeProfile.id] || createEmptyBucket() : createEmptyBucket();
  const ready = authReady && accountReady && (!state.activeProfileId || activeProfileData.loaded);

  const setActiveProfile = useCallback(
    async (profileId) => {
      if (!user) {
        return;
      }

      if (!profileId) {
        clearSessionState(user.id);
        setState((current) => ({
          ...current,
          activeProfileId: null,
        }));
        return;
      }

      setState((current) => ({
        ...current,
        activeProfileId: profileId,
      }));
    },
    [user],
  );

  const createProfile = useCallback(
    async (name) => {
      if (!user) {
        return null;
      }

      const profile = await createRemoteProfile(supabase, user.id, name);

      if (!profile) {
        return null;
      }

      setState((current) => ({
        ...current,
        profiles: [...current.profiles, profile],
      }));
      updateProfileBucket(profile.id, createEmptyBucket());
      await setActiveProfile(profile.id);
      return profile.id;
    },
    [setActiveProfile, supabase, updateProfileBucket, user],
  );

  const updateProfile = useCallback(
    async (profileId, patch) => {
      const nextProfile = await renameProfile(supabase, profileId, patch);

      if (!nextProfile) {
        return;
      }

      setState((current) => ({
        ...current,
        profiles: current.profiles.map((profile) => (profile.id === profileId ? nextProfile : profile)),
      }));
    },
    [supabase],
  );

  const removeProfile = useCallback(
    async (profileId) => {
      if (state.profiles.length <= 1) {
        return;
      }

      await deleteRemoteProfile(supabase, profileId);

      setState((current) => {
        const nextProfiles = current.profiles.filter((profile) => profile.id !== profileId);
        const nextProfileData = { ...current.profileData };
        delete nextProfileData[profileId];

        return {
          ...current,
          profiles: nextProfiles,
          activeProfileId: current.activeProfileId === profileId ? null : current.activeProfileId,
          profileData: nextProfileData,
        };
      });
    },
    [state.profiles.length, supabase],
  );

  const updateSettings = useCallback(
    async (patch) => {
      if (!activeProfile) {
        return;
      }

      const nextSettings = {
        ...DEFAULT_SETTINGS,
        ...activeProfileData.settings,
        ...patch,
      };

      updateProfileBucket(activeProfile.id, (current) => ({
        ...current,
        settings: nextSettings,
        loaded: true,
      }));

      try {
        await upsertProfileSettings(supabase, activeProfile.id, nextSettings);
      } catch (settingsError) {
        setError(settingsError);
        await loadProfileBucket(activeProfile.id, { force: true });
      }
    },
    [activeProfile, activeProfileData.settings, loadProfileBucket, supabase, updateProfileBucket],
  );

  const toggleSaved = useCallback(
    async (item, fallbackType) => {
      if (!activeProfile) {
        return;
      }

      const snapshot = createMediaSnapshot(item, fallbackType);

      if (!snapshot) {
        return;
      }

      const exists = activeProfileData.saved.some(
        (entry) => entry.id === snapshot.id && entry.mediaType === snapshot.mediaType,
      );

      updateProfileBucket(activeProfile.id, (current) => ({
        ...current,
        saved: exists
          ? current.saved.filter((entry) => !(entry.id === snapshot.id && entry.mediaType === snapshot.mediaType))
          : [{ ...snapshot, savedAt: new Date().toISOString() }, ...current.saved],
        loaded: true,
      }));

      try {
        await setSavedState(supabase, activeProfile.id, item, fallbackType, !exists);
      } catch (saveError) {
        setError(saveError);
        await loadProfileBucket(activeProfile.id, { force: true });
      }
    },
    [activeProfile, activeProfileData.saved, loadProfileBucket, supabase, updateProfileBucket],
  );

  const isSaved = useCallback(
    (id, mediaType) =>
      activeProfileData.saved.some((entry) => entry.id === Number(id) && entry.mediaType === mediaType),
    [activeProfileData.saved],
  );

  const recordProgress = useCallback(
    async (payload) => {
      if (!activeProfile || !payload?.id || !payload?.mediaType || !payload?.duration) {
        return;
      }

      const progressKey = createProgressKey(payload);
      const previousSnapshot = activeProfileData.progress[progressKey]?.snapshot || null;
      const snapshot = payload.snapshot ? createMediaSnapshot(payload.snapshot, payload.mediaType) : previousSnapshot;
      const metrics = normalizeProgressMetrics({
        mediaType: payload.mediaType,
        currentTime: payload.currentTime,
        duration: payload.duration,
        percent: payload.percent,
        snapshot,
      });

      const nextEntry = {
        key: progressKey,
        id: Number(payload.id),
        mediaType: payload.mediaType,
        season: payload.mediaType === "tv" && payload.season ? Number(payload.season) : undefined,
        episode: payload.mediaType === "tv" && payload.episode ? Number(payload.episode) : undefined,
        currentTime: metrics.currentTime,
        duration: metrics.duration,
        percent: metrics.percent,
        watchedComplete: metrics.watchedComplete,
        provider: payload.provider || activeProfileData.settings.defaultProvider,
        updatedAt: new Date().toISOString(),
        snapshot,
      };

      updateProfileBucket(activeProfile.id, (current) => ({
        ...current,
        progress: {
          ...current.progress,
          [progressKey]: nextEntry,
        },
        history: updateHistoryEntries(current.history, nextEntry),
        loaded: true,
      }));

      try {
        await Promise.all([
          upsertProgressEntry(supabase, activeProfile.id, nextEntry),
          upsertHistoryEntry(supabase, activeProfile.id, nextEntry),
        ]);
      } catch (progressError) {
        setError(progressError);
      }
    },
    [activeProfile, activeProfileData.progress, activeProfileData.settings.defaultProvider, supabase, updateProfileBucket],
  );

  const clearMediaActivity = useCallback(
    async (id, mediaType) => {
      if (!activeProfile) {
        return;
      }

      updateProfileBucket(activeProfile.id, (current) => ({
        ...current,
        progress: Object.fromEntries(
          Object.entries(current.progress || {}).filter(
            ([, entry]) => !(entry.id === Number(id) && entry.mediaType === mediaType),
          ),
        ),
        history: (current.history || []).filter(
          (entry) => !(entry.id === Number(id) && entry.mediaType === mediaType),
        ),
        loaded: true,
      }));

      try {
        await clearMediaActivityEntries(supabase, activeProfile.id, id, mediaType);
      } catch (clearError) {
        setError(clearError);
        await loadProfileBucket(activeProfile.id, { force: true });
      }
    },
    [activeProfile, loadProfileBucket, supabase, updateProfileBucket],
  );

  const clearActiveProfileData = useCallback(async () => {
    if (!activeProfile) {
      return;
    }

    updateProfileBucket(activeProfile.id, createEmptyBucket());

      try {
        await clearProfileData(supabase, activeProfile.id);
        await loadProfileBucket(activeProfile.id, { force: true });
      } catch (clearError) {
        setError(clearError);
        await loadProfileBucket(activeProfile.id, { force: true });
        throw clearError;
      }
  }, [activeProfile, loadProfileBucket, supabase, updateProfileBucket]);

  const signIn = useCallback(
    async ({ email, password }) => {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Sign in failed.");
      }

      return payload;
    },
    [],
  );

  const signUp = useCallback(
    async ({ email, password }) => {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Sign up failed.");
      }

      return payload;
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (user) {
      clearSessionState(user.id);
    }

    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "Sign out failed.");
    }

    if (supabase) {
      await supabase.auth.signOut();
    }

    setSession(null);
    setUser(null);
    setState(createInitialState());
    setError(null);
    setAuthReady(true);
    setAccountReady(true);

    if (typeof window !== "undefined") {
      window.location.replace("/auth?mode=login");
    }
  }, [supabase, user]);

  const requestPasswordReset = useCallback(
    async (email) => {
      if (!supabase) {
        throw new Error("Supabase authentication is not configured.");
      }

      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth?mode=reset` : undefined;
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (authError) {
        throw authError;
      }
    },
    [supabase],
  );

  const updatePassword = useCallback(
    async (password) => {
      if (!supabase) {
        throw new Error("Supabase authentication is not configured.");
      }

      const { error: authError } = await supabase.auth.updateUser({
        password,
      });

      if (authError) {
        throw authError;
      }
    },
    [supabase],
  );

  const deleteAccount = useCallback(
    async ({ password, confirmation }) => {
      if (!supabase) {
        throw new Error("Supabase authentication is not configured.");
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          password,
          confirmation,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Account deletion failed.");
      }

      if (user) {
        clearSessionState(user.id);
      }

      await supabase.auth.signOut();
    },
    [supabase, user],
  );

  const value = {
    authReady,
    ready,
    error,
    session,
    user,
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
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    deleteAccount,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider.");
  }

  return context;
}
