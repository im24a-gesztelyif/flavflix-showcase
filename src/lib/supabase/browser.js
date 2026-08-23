"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/shared";

let browserClient;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }

  return browserClient;
}
