import { createMediaActivityKey, createMediaSnapshot, createProgressKey, normalizeProgressMetrics } from "@/lib/media";
import { DEFAULT_SETTINGS } from "@/lib/storage";

export const MAX_PROFILES = 4;
export const DEFAULT_PROFILE_NAME = "Main Room";
export const DEFAULT_PROFILE_ACCENT = "from-accent-500 via-rose-400 to-orange-300";

function normalizeProfile(row) {
  return {
    id: row.id,
    name: row.name,
    accent: row.accent || DEFAULT_PROFILE_ACCENT,
    createdAt: row.created_at,
  };
}

function normalizeSettings(row) {
  return {
    defaultProvider: row?.default_provider || DEFAULT_SETTINGS.defaultProvider,
    fallbackEnabled: row?.fallback_enabled ?? DEFAULT_SETTINGS.fallbackEnabled,
    autoplayNextEpisode: row?.autoplay_next_episode ?? DEFAULT_SETTINGS.autoplayNextEpisode,
    language: row?.language || DEFAULT_SETTINGS.language,
    region: row?.region || DEFAULT_SETTINGS.region,
  };
}

function normalizeSavedTitle(row) {
  const snapshot = row.snapshot || {};

  return {
    ...snapshot,
    id: row.tmdb_id,
    mediaType: row.media_type,
    savedAt: row.saved_at,
  };
}

function normalizeProgressEntry(row) {
  const metrics = normalizeProgressMetrics({
    mediaType: row.media_type,
    currentTime: row.position_seconds,
    duration: row.duration,
    percent: row.percent,
    snapshot: row.snapshot || null,
  });

  return {
    key: row.entry_key,
    id: row.tmdb_id,
    mediaType: row.media_type,
    season: row.season_number ?? undefined,
    episode: row.episode_number ?? undefined,
    currentTime: metrics.currentTime,
    duration: metrics.duration,
    percent: metrics.percent,
    watchedComplete: metrics.watchedComplete,
    provider: row.provider,
    updatedAt: row.updated_at,
    snapshot: row.snapshot || null,
  };
}

function normalizeHistoryEntry(row) {
  return {
    key: row.entry_key,
    id: row.tmdb_id,
    mediaType: row.media_type,
    season: row.season_number ?? undefined,
    episode: row.episode_number ?? undefined,
    watchedAt: row.watched_at,
    provider: row.provider,
    percent: Number(row.percent || 0),
    snapshot: row.snapshot || null,
  };
}

function serializeSettings(profileId, settings) {
  return {
    profile_id: profileId,
    default_provider: settings.defaultProvider,
    fallback_enabled: settings.fallbackEnabled,
    autoplay_next_episode: settings.autoplayNextEpisode,
    language: settings.language,
    region: settings.region,
  };
}

function serializeSavedTitle(profileId, snapshot) {
  return {
    profile_id: profileId,
    tmdb_id: snapshot.id,
    media_type: snapshot.mediaType,
    media_activity_key: createMediaActivityKey(snapshot),
    snapshot,
    saved_at: new Date().toISOString(),
  };
}

function serializeProgress(profileId, entry) {
  return {
    profile_id: profileId,
    entry_key: entry.key || createProgressKey(entry),
    media_activity_key: createMediaActivityKey(entry),
    tmdb_id: Number(entry.id),
    media_type: entry.mediaType,
    season_number: entry.season ?? null,
    episode_number: entry.episode ?? null,
    position_seconds: Number(entry.currentTime || 0),
    duration: Number(entry.duration || 1),
    percent: Number(entry.percent || 0),
    watched_complete: Boolean(entry.watchedComplete),
    provider: entry.provider,
    snapshot: entry.snapshot || null,
    updated_at: entry.updatedAt || new Date().toISOString(),
  };
}

function serializeHistory(profileId, entry) {
  return {
    profile_id: profileId,
    entry_key: entry.key || createProgressKey(entry),
    media_activity_key: createMediaActivityKey(entry),
    tmdb_id: Number(entry.id),
    media_type: entry.mediaType,
    season_number: entry.season ?? null,
    episode_number: entry.episode ?? null,
    provider: entry.provider,
    percent: Number(entry.percent || 0),
    snapshot: entry.snapshot || null,
    watched_at: entry.updatedAt || new Date().toISOString(),
  };
}

export function createEmptyBucket() {
  return {
    saved: [],
    history: [],
    progress: {},
    settings: { ...DEFAULT_SETTINGS },
    loaded: true,
    loading: false,
  };
}

async function fetchProfiles(supabase) {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeProfile);
}

export async function ensureAccountProfiles(supabase, userId) {
  let profiles = await fetchProfiles(supabase);

  if (profiles.length) {
    return profiles;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      name: DEFAULT_PROFILE_NAME,
      accent: DEFAULT_PROFILE_ACCENT,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await upsertProfileSettings(supabase, data.id, DEFAULT_SETTINGS);
  profiles = [normalizeProfile(data)];
  return profiles;
}

export async function fetchProfileBundle(supabase, profileId) {
  const [settingsResult, savedResult, progressResult, historyResult] = await Promise.all([
    supabase.from("profile_settings").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("saved_titles").select("*").eq("profile_id", profileId).order("saved_at", { ascending: false }),
    supabase.from("watch_progress").select("*").eq("profile_id", profileId).order("updated_at", { ascending: false }),
    supabase.from("watch_history").select("*").eq("profile_id", profileId).order("watched_at", { ascending: false }),
  ]);

  if (settingsResult.error) {
    throw settingsResult.error;
  }

  if (savedResult.error) {
    throw savedResult.error;
  }

  if (progressResult.error) {
    throw progressResult.error;
  }

  if (historyResult.error) {
    throw historyResult.error;
  }

  let settings = settingsResult.data ? normalizeSettings(settingsResult.data) : null;

  if (!settings) {
    await upsertProfileSettings(supabase, profileId, DEFAULT_SETTINGS);
    settings = { ...DEFAULT_SETTINGS };
  }

  const saved = (savedResult.data || []).map(normalizeSavedTitle);
  const history = (historyResult.data || []).map(normalizeHistoryEntry);
  const progressEntries = (progressResult.data || []).map(normalizeProgressEntry);

  return {
    saved,
    history,
    progress: Object.fromEntries(progressEntries.map((entry) => [entry.key, entry])),
    settings,
    loaded: true,
  };
}

export async function createProfile(supabase, userId, name) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return null;
  }

  const existingProfiles = await fetchProfiles(supabase);

  if (existingProfiles.length >= MAX_PROFILES) {
    throw new Error(`Accounts are limited to ${MAX_PROFILES} profiles.`);
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      name: trimmedName,
      accent: DEFAULT_PROFILE_ACCENT,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await upsertProfileSettings(supabase, data.id, DEFAULT_SETTINGS);
  return normalizeProfile(data);
}

export async function renameProfile(supabase, profileId, patch) {
  const payload = {};

  if (patch.name?.trim()) {
    payload.name = patch.name.trim();
  }

  if (patch.accent) {
    payload.accent = patch.accent;
  }

  if (!Object.keys(payload).length) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profileId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeProfile(data);
}

export async function removeProfile(supabase, profileId) {
  const { error } = await supabase.from("profiles").delete().eq("id", profileId);

  if (error) {
    throw error;
  }
}

export async function upsertProfileSettings(supabase, profileId, settings) {
  const { error } = await supabase
    .from("profile_settings")
    .upsert(serializeSettings(profileId, settings), { onConflict: "profile_id" });

  if (error) {
    throw error;
  }
}

export async function setSavedState(supabase, profileId, item, fallbackType, shouldSave) {
  const snapshot = createMediaSnapshot(item, fallbackType);

  if (!snapshot) {
    return;
  }

  const mediaActivityKey = createMediaActivityKey(snapshot);

  if (!shouldSave) {
    const { error } = await supabase
      .from("saved_titles")
      .delete()
      .eq("profile_id", profileId)
      .eq("media_activity_key", mediaActivityKey);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from("saved_titles")
    .upsert(serializeSavedTitle(profileId, snapshot), { onConflict: "profile_id,media_activity_key" });

  if (error) {
    throw error;
  }
}

export async function upsertProgressEntry(supabase, profileId, entry) {
  const { error } = await supabase
    .from("watch_progress")
    .upsert(serializeProgress(profileId, entry), { onConflict: "profile_id,entry_key" });

  if (error) {
    throw error;
  }
}

export async function upsertHistoryEntry(supabase, profileId, entry) {
  const { error } = await supabase
    .from("watch_history")
    .upsert(serializeHistory(profileId, entry), { onConflict: "profile_id,entry_key" });

  if (error) {
    throw error;
  }
}

export async function clearMediaActivityEntries(supabase, profileId, id, mediaType) {
  const mediaActivityKey = createMediaActivityKey({
    id: Number(id),
    mediaType,
  });

  const [progressResult, historyResult] = await Promise.all([
    supabase.from("watch_progress").delete().eq("profile_id", profileId).eq("media_activity_key", mediaActivityKey),
    supabase.from("watch_history").delete().eq("profile_id", profileId).eq("media_activity_key", mediaActivityKey),
  ]);

  if (progressResult.error) {
    throw progressResult.error;
  }

  if (historyResult.error) {
    throw historyResult.error;
  }
}

export async function clearProfileData(supabase, profileId) {
  const [savedResult, progressResult, historyResult] = await Promise.all([
    supabase.from("saved_titles").delete().eq("profile_id", profileId),
    supabase.from("watch_progress").delete().eq("profile_id", profileId),
    supabase.from("watch_history").delete().eq("profile_id", profileId),
  ]);

  if (savedResult.error) {
    throw savedResult.error;
  }

  if (progressResult.error) {
    throw progressResult.error;
  }

  if (historyResult.error) {
    throw historyResult.error;
  }

  await upsertProfileSettings(supabase, profileId, DEFAULT_SETTINGS);
}
