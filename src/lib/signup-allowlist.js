import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ENV_SPLIT_PATTERN = /[\n,;]+/;

export function normalizeSignupEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function getAllowedSignupEmailsFromEnv() {
  const rawValue = process.env.ALLOWED_SIGNUP_EMAILS || "";

  return new Set(
    rawValue
      .split(ENV_SPLIT_PATTERN)
      .map((value) => normalizeSignupEmail(value))
      .filter(Boolean),
  );
}

export async function isEmailApprovedForSignup(email) {
  const normalizedEmail = normalizeSignupEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  if (getAllowedSignupEmailsFromEnv().has(normalizedEmail)) {
    return true;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("signup_allowlist")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.email);
}

export async function markSignupEmailUsed(email) {
  const normalizedEmail = normalizeSignupEmail(email);

  if (!normalizedEmail || getAllowedSignupEmailsFromEnv().has(normalizedEmail)) {
    return;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from("signup_allowlist")
    .update({
      used_at: new Date().toISOString(),
    })
    .eq("email", normalizedEmail);

  if (error) {
    throw error;
  }
}
