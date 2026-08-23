import { DEFAULT_SETTINGS } from "@/lib/storage";

export const MAX_PROFILES = 4;
export const DEFAULT_PROFILE_NAME = "Main Room";
export const DEFAULT_PROFILE_ACCENT = "from-accent-500 via-rose-400 to-orange-300";

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
