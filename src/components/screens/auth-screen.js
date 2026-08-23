"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, KeyRound, LoaderCircle, LogIn, Mail, UserPlus } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { BrandLogo } from "@/components/brand-logo";
import { LoadingState } from "@/components/loading-state";
import { useAppState } from "@/lib/app-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabasePublicEnv } from "@/lib/supabase/shared";

const MODE_LABELS = {
  login: "Sign In",
  register: "Create Account",
  forgot: "Reset Password",
  reset: "Set New Password",
};

const RECOVERY_QUERY_PARAMS = ["code", "token_hash", "type", "error", "error_code", "error_description"];
const RECOVERY_HASH_PARAMS = [
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "type",
  "provider_token",
  "provider_refresh_token",
  "error",
  "error_code",
  "error_description",
];
const PASSWORD_SETUP_TYPES = new Set(["recovery", "invite"]);

function normalizeMode(mode) {
  return Object.hasOwn(MODE_LABELS, mode) ? mode : "login";
}

function sanitizeNextPath(nextPath) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }

  if (nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}

function stripRecoveryParamsFromUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  RECOVERY_QUERY_PARAMS.forEach((param) => {
    url.searchParams.delete(param);
  });

  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : "");

  RECOVERY_HASH_PARAMS.forEach((param) => {
    hashParams.delete(param);
  });

  const nextHash = hashParams.toString();
  url.hash = nextHash ? `#${nextHash}` : "";

  window.history.replaceState(window.history.state, "", url.toString());
}

function AuthModeButton({ active, href, label }) {
  return (
    <AppLink
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-black" : "border border-white/10 text-white/72 hover:text-white"
      }`}
    >
      {label}
    </AppLink>
  );
}

export function AuthScreen() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => (hasSupabasePublicEnv() ? getSupabaseBrowserClient() : null), []);
  const { authReady, ready, error, user, signIn, signOut, signUp, requestPasswordReset, updatePassword } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryChecking, setRecoveryChecking] = useState(false);
  const requestedMode = normalizeMode(searchParams.get("mode") || "login");
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const recoveryCode = searchParams.get("code");
  const recoveryTokenHash = searchParams.get("token_hash");
  const recoveryType = searchParams.get("type");
  const needsPasswordSetup =
    requestedMode === "reset" || Boolean(recoveryCode) || Boolean(recoveryTokenHash && PASSWORD_SETUP_TYPES.has(recoveryType));
  const mode = needsPasswordSetup ? "reset" : requestedMode;

  useEffect(() => {
    if (!supabase || !needsPasswordSetup) {
      return undefined;
    }

    let cancelled = false;

    async function activateRecoverySession() {
      setRecoveryChecking(true);

      try {
        if (recoveryCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(recoveryCode);

          if (exchangeError) {
            throw exchangeError;
          }

          stripRecoveryParamsFromUrl();
        } else if (recoveryTokenHash && PASSWORD_SETUP_TYPES.has(recoveryType)) {
          const { error: verificationError } = await supabase.auth.verifyOtp({
            token_hash: recoveryTokenHash,
            type: recoveryType,
          });

          if (verificationError) {
            throw verificationError;
          }

          stripRecoveryParamsFromUrl();
        }

        const {
          data: { session: nextSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (cancelled) {
          return;
        }

        setRecoveryReady(Boolean(nextSession));
        if (nextSession) {
          setErrorMessage("");
        }
      } catch (recoveryError) {
        if (cancelled) {
          return;
        }

        setRecoveryReady(false);
        setErrorMessage(recoveryError.message || "Could not activate the recovery session.");
      } finally {
        if (!cancelled) {
          setRecoveryChecking(false);
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || nextSession) {
        setRecoveryReady(true);
        setRecoveryChecking(false);
        setErrorMessage("");
        stripRecoveryParamsFromUrl();
      }
    });

    activateRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [needsPasswordSetup, recoveryCode, recoveryTokenHash, recoveryType, supabase]);

  useEffect(() => {
    if (!authReady || !ready) {
      return;
    }

    if (user && mode !== "reset") {
      window.location.replace(nextPath);
    }
  }, [authReady, mode, nextPath, ready, user]);

  useEffect(() => {
    setErrorMessage("");
    setStatusMessage("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRecoveryReady(false);
    setRecoveryChecking(false);
  }, [mode]);

  if (!authReady) {
    return <LoadingState fullScreen brand title="FlavFlix" description="Checking your account session." />;
  }

  if (user && !ready && mode !== "reset") {
    return <LoadingState fullScreen brand title="FlavFlix" description="Finishing your account setup." />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (mode === "login") {
        await signIn({
          email: email.trim(),
          password,
        });
        setStatusMessage("Signed in. Opening FlavFlix.");
        window.location.replace(nextPath);
        return;
      }

      if (mode === "register") {
        const result = await signUp({
          email: email.trim(),
          password,
        });

        if (result.session) {
          setStatusMessage("Account created. Finishing your profile setup.");
          window.location.replace(nextPath);
          return;
        }

        setStatusMessage("Account created. If email confirmation is enabled, finish it from your inbox.");
        return;
      }

      if (mode === "forgot") {
        await requestPasswordReset(email.trim());
        setStatusMessage("Password reset email sent.");
        return;
      }

      if (password.length < 6) {
        throw new Error("Passwords must be at least 6 characters.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await updatePassword(password);
      setStatusMessage("Password updated. Redirecting back into FlavFlix.");
      window.setTimeout(() => {
        window.location.replace(nextPath);
      }, 600);
    } catch (submitError) {
      setErrorMessage(submitError.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login"
      ? "Sign into FlavFlix"
      : mode === "register"
        ? "Create your FlavFlix account"
        : mode === "forgot"
          ? "Reset your password"
          : "Set a new password";
  const description =
    mode === "login"
      ? "FlavFlix now requires an account before the cinema opens."
      : mode === "register"
        ? "Create an account to enter your synced FlavFlix library."
        : mode === "forgot"
          ? "Send yourself a reset link and come back here to set a new password."
          : "Finish the password recovery flow to get back into your library.";

  return (
    <div className="flex min-h-screen overflow-hidden items-center justify-center bg-[#050507] px-3 py-3 sm:px-4 sm:py-4">
      <div className="grid h-[calc(100vh-1.5rem)] w-full max-w-6xl gap-4 overflow-hidden sm:h-[calc(100vh-2rem)] sm:gap-5 lg:grid-cols-[minmax(0,0.98fr)_440px] lg:gap-6">
        <section className="surface-strong noise relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:p-8 xl:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,77,99,0.25),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(246,141,93,0.18),transparent_36%)]" />
          <div className="relative max-w-2xl">
            <BrandLogo className="w-[220px] xl:w-[260px]" priority />
            <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-accent-200">Account Access</p>
            <h1 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl font-semibold text-white xl:text-[2.7rem]">
              Your watchlist, progress, and profiles now travel with your account.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/66">
              Metadata still stays fast through the local TMDB cache, but your personal state now syncs through Supabase so the app works across refreshes and devices.
            </p>

            <div className="mt-6 grid gap-3 xl:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <Mail className="h-4 w-4 text-accent-200" />
                <p className="mt-3 text-base font-semibold text-white">Email login</p>
                <p className="mt-1.5 text-sm leading-5 text-white/55">Invite-only account auth with password reset once access is granted.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <UserPlus className="h-4 w-4 text-accent-200" />
                <p className="mt-3 text-base font-semibold text-white">Profiles stay</p>
                <p className="mt-1.5 text-sm leading-5 text-white/55">Keep household-style profile switching inside each account.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <KeyRound className="h-4 w-4 text-accent-200" />
                <p className="mt-3 text-base font-semibold text-white">Cross-device state</p>
                <p className="mt-1.5 text-sm leading-5 text-white/55">Saved titles, settings, and playback history sync remotely.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="surface flex h-full items-center overflow-hidden p-4 sm:p-5 lg:p-7">
          <div className="w-full">
            <div className="mb-5 flex items-center justify-center lg:hidden">
              <BrandLogo className="w-[170px] sm:w-[190px]" priority />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">{MODE_LABELS[mode] || MODE_LABELS.login}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-[1.75rem]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/58">{description}</p>
              </div>
              {user && mode === "reset" ? (
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/76"
                >
                  Sign Out
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              <AuthModeButton label="Sign In" active={mode === "login"} href={`/auth?mode=login&next=${encodeURIComponent(nextPath)}`} />
              <AuthModeButton label="Register" active={mode === "register"} href={`/auth?mode=register&next=${encodeURIComponent(nextPath)}`} />
              <AuthModeButton label="Forgot Password" active={mode === "forgot"} href={`/auth?mode=forgot&next=${encodeURIComponent(nextPath)}`} />
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-[24px] border border-red-300/24 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {errorMessage}
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-[24px] border border-yellow-300/24 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-50/90">
                {error.message}
              </div>
            ) : null}

            {statusMessage ? (
              <div className="mt-6 rounded-[24px] border border-accent-300/22 bg-accent-500/10 px-4 py-3 text-sm text-accent-100">
                {statusMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode !== "reset" ? (
                <label className="flex flex-col gap-2 text-sm text-white/55">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-white outline-none"
                    required
                  />
                </label>
              ) : null}

              {mode === "forgot" ? null : (
                <label className="flex flex-col gap-2 text-sm text-white/55">
                  <span>{mode === "reset" ? "New Password" : "Password"}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-white outline-none"
                    required
                  />
                </label>
              )}

              {mode === "reset" ? (
                <label className="flex flex-col gap-2 text-sm text-white/55">
                  <span>Confirm Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your new password"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-white outline-none"
                    required
                  />
                </label>
              ) : null}

              {mode === "reset" && !recoveryReady ? (
                <div className="rounded-[24px] border border-yellow-300/22 bg-yellow-500/8 px-4 py-2.5 text-sm text-yellow-50/86">
                  {recoveryChecking
                    ? "Activating the password setup session from your email link."
                    : "Open the password reset or invite link from your email in this browser to activate the password setup session first."}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy || recoveryChecking || (mode === "reset" && !recoveryReady)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === "register" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {mode === "login"
                  ? "Sign In"
                  : mode === "register"
                    ? "Create Account"
                    : mode === "forgot"
                      ? "Send Reset Email"
                      : "Update Password"}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/55">
              {mode === "login" ? (
                <>
                  <span>Need approved access?</span>
                  <AppLink href={`/auth?mode=register&next=${encodeURIComponent(nextPath)}`} className="font-semibold text-white/80">
                    Register
                  </AppLink>
                </>
              ) : mode === "register" ? (
                <>
                  <span>Already have an account?</span>
                  <AppLink href={`/auth?mode=login&next=${encodeURIComponent(nextPath)}`} className="font-semibold text-white/80">
                    Sign in
                  </AppLink>
                </>
              ) : mode === "forgot" ? (
                <AppLink href={`/auth?mode=login&next=${encodeURIComponent(nextPath)}`} className="inline-flex items-center gap-2 font-semibold text-white/80">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </AppLink>
              ) : (
                <div className="inline-flex items-center gap-2 text-yellow-50/82">
                  <AlertTriangle className="h-4 w-4" />
                  Reset mode stays public so recovery links can land cleanly.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
