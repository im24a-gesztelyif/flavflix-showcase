"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  History,
  House,
  ListVideo,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Tv,
  UserRound,
  X,
} from "lucide-react";
import { AppLink } from "@/components/app-link";
import { BrandLogo } from "@/components/brand-logo";
import { LoadingState } from "@/components/loading-state";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { MAX_PROFILES } from "@/lib/account-store";
import { PRIMARY_NAV_ITEMS, USER_MENU_ITEMS } from "@/lib/discovery";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

const ICONS = {
  "/": House,
  "/movies": Film,
  "/tv": Tv,
  "/search": Search,
  "/random": Sparkles,
  "/my-list": ListVideo,
  "/continue-watching": Clapperboard,
  "/history": History,
  "/settings": Settings,
};

const PROFILE_GRID_CLASSNAMES = {
  1: "grid-cols-1 max-w-[260px]",
  2: "grid-cols-2 max-w-[540px]",
  3: "grid-cols-2 xl:grid-cols-3 max-w-[840px]",
  4: "grid-cols-2 xl:grid-cols-4 max-w-[1120px]",
};

const MOBILE_PRIMARY_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/continue-watching", label: "Continue" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV" },
  { href: "/my-list", label: "My List" },
];

const MOBILE_MENU_ITEMS = [
  { href: "/history", label: "History" },
  { href: "/random", label: "Random" },
  { href: "/settings", label: "Settings" },
];

function IntroOverlay({ onFinish }) {
  const videoRef = useRef(null);
  const finishedRef = useRef(false);
  const playbackStartedRef = useRef(false);
  const startupTimerRef = useRef(null);
  const maxTimerRef = useRef(null);

  const finish = useCallback(() => {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    window.clearTimeout(startupTimerRef.current);
    window.clearTimeout(maxTimerRef.current);
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    startupTimerRef.current = window.setTimeout(() => {
      const video = videoRef.current;
      const hasStarted = playbackStartedRef.current || Number(video?.currentTime || 0) > 0.1;

      if (!hasStarted) {
        finish();
      }
    }, 5200);
    maxTimerRef.current = window.setTimeout(() => {
      finish();
    }, 15000);

    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(startupTimerRef.current);
      window.clearTimeout(maxTimerRef.current);
      document.body.style.overflow = previousOverflow;
    };
  }, [finish]);

  function markPlaybackStarted() {
    playbackStartedRef.current = true;
    window.clearTimeout(startupTimerRef.current);
  }

  function syncIntroDuration(event) {
    const duration = Number(event.currentTarget.duration);

    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    window.clearTimeout(maxTimerRef.current);
    maxTimerRef.current = window.setTimeout(() => {
      finish();
    }, Math.min(Math.max(duration * 1000 + 1200, 6000), 20000));
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-black px-5 py-8 sm:px-8 sm:py-10"
      onClick={finish}
      role="presentation"
    >
      <div className="flex h-full w-full items-center justify-center">
        <video
          ref={videoRef}
          src="/flavflix_primary_intro.mov"
          autoPlay
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={syncIntroDuration}
          onPlay={markPlaybackStarted}
          onPlaying={markPlaybackStarted}
          onTimeUpdate={markPlaybackStarted}
          onEnded={finish}
          onError={finish}
          className="h-auto max-h-[58svh] w-auto max-w-[min(84vw,940px)] object-contain"
        />
      </div>
    </div>
  );
}

function getProfileInitial(name) {
  return (name || "F").trim().slice(0, 1).toUpperCase();
}

function HeaderLink({ href, label }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <AppLink
      href={href}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        active ? "bg-white/12 text-white" : "text-white/78 hover:bg-white/8 hover:text-white",
      )}
    >
      {label}
    </AppLink>
  );
}

function MobileLink({ href, label }) {
  const pathname = usePathname();
  const Icon = ICONS[href] || House;
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <AppLink
      href={href}
      className={cn(
        "flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-[10px] font-semibold transition",
        active ? "bg-accent-500/18 text-white" : "text-white/65 hover:bg-white/8 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </AppLink>
  );
}

function ProfileTile({ profile, onClick, action, manageMode = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-[32px] border border-white/10 bg-white/[0.03] p-5 text-center transition",
        manageMode ? "hover:border-white/20 hover:bg-white/[0.05]" : "hover:border-accent-400/30 hover:bg-white/[0.05]",
      )}
    >
      <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-[24px] bg-gradient-to-br sm:h-32 sm:w-32 md:h-44 md:w-44 md:rounded-[32px] ${profile.accent}`}>
        <span className="font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl md:text-7xl">
          {getProfileInitial(profile.name)}
        </span>
      </div>
      <p className="mt-3 text-base font-semibold text-white sm:mt-4 sm:text-lg md:text-2xl">{profile.name}</p>

      {action ? <div className="absolute right-4 top-4">{action}</div> : null}
    </button>
  );
}

function AddProfileTile({ disabled = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-[32px] border border-dashed p-5 text-center transition",
        disabled
          ? "cursor-not-allowed border-white/8 bg-white/[0.01] text-white/38"
          : "border-white/12 bg-white/[0.02] hover:border-white/22 hover:bg-white/[0.05]",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-24 w-24 items-center justify-center rounded-[24px] border border-dashed sm:h-32 sm:w-32 md:h-44 md:w-44 md:rounded-[32px]",
          disabled ? "border-white/8 bg-white/[0.01]" : "border-white/14 bg-white/[0.03]",
        )}
      >
        <Plus className="h-7 w-7 text-white/80 sm:h-9 sm:w-9 md:h-10 md:w-10" />
      </div>
      <p className="mt-3 text-base font-semibold text-white sm:mt-4 sm:text-lg md:text-2xl">
        {disabled ? "Profile Limit Reached" : "Add Profile"}
      </p>
      {disabled ? <p className="mt-2 text-sm text-white/45">This showcase is capped at {MAX_PROFILES} profiles.</p> : null}
    </button>
  );
}

function ProfileGate({ profiles, onSelect, onCreate, onUpdate, onRemove }) {
  const [manageMode, setManageMode] = useState(() => profiles.length === 0);
  const [editor, setEditor] = useState(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorError, setEditorError] = useState("");
  const stripRef = useRef(null);
  const [railState, setRailState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  function openCreate() {
    setEditorError("");
    setEditor({
      id: "new",
      name: "",
    });
  }

  function openEdit(profile) {
    setEditorError("");
    setEditor({
      id: profile.id,
      name: profile.name,
    });
  }

  async function handleSave() {
    const trimmed = editor?.name?.trim();

    if (!trimmed) {
      return;
    }

    setEditorBusy(true);
    setEditorError("");

    try {
      if (editor.id === "new") {
        await onCreate(trimmed);
      } else {
        await onUpdate(editor.id, { name: trimmed });
      }

      setEditor(null);
    } catch (saveError) {
      setEditorError(saveError.message || "Profile changes failed.");
    } finally {
      setEditorBusy(false);
    }
  }

  const tileCount = profiles.length + (manageMode ? 1 : 0);
  const usesRail = tileCount > 4;
  const canAddProfile = profiles.length < MAX_PROFILES;

  useEffect(() => {
    const element = stripRef.current;
    let frameId = null;

    if (!usesRail || !element) {
      setRailState({
        canScrollLeft: false,
        canScrollRight: false,
      });
      return undefined;
    }

    function updateRailState() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        const nextCanScrollLeft = element.scrollLeft > 8;
        const nextCanScrollRight = element.scrollLeft + element.clientWidth < element.scrollWidth - 8;

        setRailState((current) =>
          current.canScrollLeft === nextCanScrollLeft && current.canScrollRight === nextCanScrollRight
            ? current
            : {
                canScrollLeft: nextCanScrollLeft,
                canScrollRight: nextCanScrollRight,
              },
        );
      });
    }

    updateRailState();
    element.addEventListener("scroll", updateRailState, { passive: true });
    window.addEventListener("resize", updateRailState);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      element.removeEventListener("scroll", updateRailState);
      window.removeEventListener("resize", updateRailState);
    };
  }, [profiles.length, usesRail, manageMode]);

  function scrollProfiles(direction) {
    const element = stripRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({
      left: direction * 280,
      behavior: "smooth",
    });
  }

  const gridClassName = PROFILE_GRID_CLASSNAMES[Math.min(Math.max(tileCount, 1), 4)];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[#050507] safe-px safe-pb safe-pt">
      <div className="flex min-h-full items-start justify-center px-0 py-6 sm:px-2 sm:py-10">
        <div className="w-full max-w-7xl text-center">
          <div className="mb-6 sm:mb-8">
            <BrandLogo className="mx-auto w-[200px] sm:w-[250px] md:w-[290px]" priority />
            <p className="mt-3 text-base text-white/60 sm:mt-4 sm:text-lg">
              {profiles.length === 0 ? "Create a local profile to begin" : manageMode ? "Manage Profiles" : "Who's watching?"}
            </p>
          </div>

          {usesRail ? (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => scrollProfiles(-1)}
                disabled={!railState.canScrollLeft}
                className="hidden rounded-full border border-white/10 bg-white/[0.04] p-3 text-white/80 disabled:cursor-not-allowed disabled:opacity-30 md:inline-flex"
                aria-label="Scroll profiles left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div ref={stripRef} className="scrollbar-none flex max-w-[1160px] snap-x snap-mandatory gap-4 overflow-x-auto px-1 py-2 sm:gap-6">
                {profiles.map((profile) => (
                  <div key={profile.id} className="w-[156px] shrink-0 snap-center sm:w-[188px] md:w-[248px]">
                    <ProfileTile
                      profile={profile}
                      manageMode={manageMode}
                      onClick={() => (manageMode ? openEdit(profile) : onSelect(profile.id))}
                      action={
                        manageMode ? (
                          <span className="inline-flex items-center justify-center rounded-full border border-white/12 bg-black/30 p-2 text-white/80">
                            <Pencil className="h-4 w-4" />
                          </span>
                        ) : null
                      }
                    />
                  </div>
                ))}

                {manageMode ? (
                  <div className="w-[156px] shrink-0 snap-center sm:w-[188px] md:w-[248px]">
                    <AddProfileTile disabled={!canAddProfile} onClick={canAddProfile ? openCreate : undefined} />
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => scrollProfiles(1)}
                disabled={!railState.canScrollRight}
                className="hidden rounded-full border border-white/10 bg-white/[0.04] p-3 text-white/80 disabled:cursor-not-allowed disabled:opacity-30 md:inline-flex"
                aria-label="Scroll profiles right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className={cn("mx-auto grid gap-6", gridClassName)}>
              {profiles.map((profile) => (
                <ProfileTile
                  key={profile.id}
                  profile={profile}
                  manageMode={manageMode}
                  onClick={() => (manageMode ? openEdit(profile) : onSelect(profile.id))}
                  action={
                    manageMode ? (
                      <span className="inline-flex items-center justify-center rounded-full border border-white/12 bg-black/30 p-2 text-white/80">
                        <Pencil className="h-4 w-4" />
                      </span>
                    ) : null
                  }
                />
              ))}

              {manageMode ? <AddProfileTile disabled={!canAddProfile} onClick={canAddProfile ? openCreate : undefined} /> : null}
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-3 sm:mt-10">
            <button
              type="button"
              onClick={() => {
                setManageMode((current) => !current);
                setEditor(null);
              }}
              className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 hover:text-white"
            >
              {manageMode ? "Done" : "Manage Profiles"}
            </button>
          </div>

          {manageMode ? (
            <p className="mt-4 text-sm text-white/45">
              {profiles.length} / {MAX_PROFILES} profiles stored in this browser.
            </p>
          ) : null}

          {editor ? (
            <div className="mx-auto mt-6 max-w-xl rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-left shadow-panel sm:mt-8 sm:rounded-[32px] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    {editor.id === "new" ? "Create Profile" : "Edit Profile"}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                    {editor.id === "new" ? "New profile" : "Rename profile"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  className="rounded-full border border-white/10 p-2 text-white/70"
                  aria-label="Close profile editor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="mt-5 flex flex-col gap-2 text-sm text-white/55">
                <span>Name</span>
                <input
                  value={editor.name}
                  onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Family Room"
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
                />
              </label>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={editorBusy}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black"
                >
                  <Check className="h-4 w-4" />
                  {editorBusy ? "Saving..." : "Save"}
                </button>

                {editor.id !== "new" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setEditorBusy(true);
                      setEditorError("");

                      try {
                        await onRemove(editor.id);
                        setEditor(null);
                      } catch (removeError) {
                        setEditorError(removeError.message || "Profile deletion failed.");
                      } finally {
                        setEditorBusy(false);
                      }
                    }}
                    disabled={profiles.length <= 1 || editorBusy}
                    className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : null}
              </div>

              {editorError ? <p className="mt-4 text-sm text-red-100">{editorError}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UserMenu({ onChangeProfile }) {
  const { activeProfile } = useAppState();
  const [open, setOpen] = useState(false);
  const desktopItems = USER_MENU_ITEMS;
  const mobileItems = MOBILE_MENU_ITEMS;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-black/22 px-3 py-2 text-sm font-semibold text-white"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-orange-300 text-sm font-bold text-white">
          {getProfileInitial(activeProfile?.name)}
        </span>
        <span className="hidden md:block">{activeProfile?.name || "Profile"}</span>
        <ChevronDown className="h-4 w-4 text-white/70" />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-[#040406b8] backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 rounded-[28px] border border-white/10 bg-[#0a0a0ef2] p-4 shadow-panel backdrop-blur-xl md:absolute md:right-0 md:top-full md:mt-3 md:w-[320px] md:inset-x-auto md:bottom-auto">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onChangeProfile();
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/78 transition hover:bg-white/6 hover:text-white"
          >
            <UserRound className="h-4 w-4" />
            <span>Change Profile</span>
          </button>

          <div className="mt-4 border-t border-white/8 pt-4">
            <div className="space-y-1 md:hidden">
              {mobileItems.map((item) => {
                const Icon = ICONS[item.href];

                return (
                  <AppLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/72 transition hover:bg-white/6 hover:text-white"
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    <span>{item.label}</span>
                  </AppLink>
                );
              })}
            </div>

            <div className="hidden space-y-1 md:block">
              {desktopItems.map((item) => {
                const Icon = ICONS[item.href];

                return (
                  <AppLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/72 transition hover:bg-white/6 hover:text-white"
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    <span>{item.label}</span>
                  </AppLink>
                );
              })}
            </div>

          </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function NavigationOverlay() {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050507c7] px-6 backdrop-blur-sm">
      <div className="rounded-[32px] border border-white/10 bg-black/45 px-8 py-7 text-center shadow-panel">
        <div className="mx-auto flex items-center justify-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-accent-500/30" />
          <BrandLogo className="w-[180px]" priority />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-white/55">Opening Page</p>
      </div>
    </div>
  );
}

function HeaderSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    setOpen(false);
    setValue("");
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (containerRef.current?.contains(event.target)) {
        return;
      }

      if (!pathname.startsWith("/search") && !value.trim()) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      closeSearch();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, pathname, value]);

  function closeSearch() {
    setValue("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function submitSearch(event) {
    event.preventDefault();

    const trimmed = value.trim();

    if (!trimmed) {
      closeSearch();
      return;
    }

    const nextParams = new URLSearchParams(pathname.startsWith("/search") ? searchParams.toString() : "");
    nextParams.set("q", trimmed);

    const nextHref = `/search?${nextParams.toString()}`;

    if (pathname.startsWith("/search")) {
      router.replace(nextHref);
    } else {
      router.push(nextHref);
    }

    setValue("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <form
      ref={containerRef}
      onSubmit={submitSearch}
      className={cn(
        "relative flex h-11 items-center overflow-hidden rounded-full border transition-all duration-300",
        open
          ? "w-[min(64vw,340px)] sm:w-[min(72vw,440px)] border-white/16 bg-[rgba(8,8,12,0.82)] shadow-[0_18px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          : "w-auto border-white/12 bg-black/18",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-full shrink-0 items-center gap-2 px-4 text-sm font-semibold text-white/82 transition",
          open ? "pointer-events-none absolute inset-y-0 left-0 z-10" : "relative",
        )}
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
        {!open ? <span className="hidden md:block">Search</span> : null}
      </button>

      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search titles, shows, people..."
        className={cn(
          "h-full bg-transparent text-sm text-white outline-none transition-all duration-300 placeholder:text-white/38",
          open ? "w-full pl-11 pr-12 opacity-100" : "w-0 pr-0 opacity-0 pointer-events-none",
        )}
      />

      {open ? (
        <button
          type="button"
          onClick={closeSearch}
          className="absolute right-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/72 transition hover:text-white"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </form>
  );
}

function HeaderSearchFallback() {
  return (
    <div className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-black/18 px-4 text-sm font-semibold text-white/82">
      <Search className="h-4 w-4" />
      <span className="hidden md:block">Search</span>
    </div>
  );
}

function ShellFooter() {
  return (
    <footer className="px-4 pb-[calc(7.25rem+env(safe-area-inset-bottom))] pt-0 xl:px-8 lg:pb-10">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4 rounded-[28px] border border-[#163d46]/45 bg-[linear-gradient(180deg,rgba(11,18,22,0.92),rgba(7,11,14,0.96))] px-4 py-4 sm:gap-5 sm:rounded-[32px] sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <BrandLogo className="w-[148px] sm:w-[180px]" />
          <p className="mt-2 max-w-2xl text-xs leading-6 text-white/52 sm:text-sm">
            A cinematic shell for discovery, lists, and local watch state, with film and TV metadata attributed to TMDB.
          </p>
        </div>
        <TmdbAttribution
          variant="primaryLong"
          className="border-[#1a4650]/40 bg-black/28 max-sm:w-full"
          title="Movie metadata by TMDB"
          body="Browse, details, people, and discovery metadata across FlavFlix are sourced from TMDB."
        />
      </div>
    </footer>
  );
}

export function AppShell({ children }) {
  const pathname = usePathname();
  const { authReady, ready, user, profiles, activeProfile, setActiveProfile, createProfile, updateProfile, removeProfile } = useAppState();
  const [navigationPending, setNavigationPending] = useState(false);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [showNextIndicator, setShowNextIndicator] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const mobileItems = useMemo(() => MOBILE_PRIMARY_ITEMS, []);
  const navigationTimeoutRef = useRef(null);
  const isWatchPage = pathname.startsWith("/watch/");
  const isHomePage = pathname === "/";

  useEffect(() => {
    function handleNavigationStart() {
      setNavigationPending(true);

      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
      }

      navigationTimeoutRef.current = window.setTimeout(() => {
        setNavigationPending(false);
      }, 12000);
    }

    document.addEventListener("flavflix:navigation-start", handleNavigationStart);

    return () => {
      document.removeEventListener("flavflix:navigation-start", handleNavigationStart);

      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setNavigationPending(false);

    if (navigationTimeoutRef.current) {
      window.clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    let frameId = null;

    function updateHeaderElevation() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        const nextState = window.scrollY > 18;
        setHeaderElevated((current) => (current === nextState ? current : nextState));
      });
    }

    updateHeaderElevation();
    window.addEventListener("scroll", updateHeaderElevation, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", updateHeaderElevation);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return undefined;
    }

    function applyNextIndicatorVisibility() {
      document.querySelectorAll("nextjs-portal").forEach((portal) => {
        portal.shadowRoot
          ?.querySelectorAll("[data-nextjs-toast]")
          .forEach((element) => element.setAttribute("data-hidden", showNextIndicator ? "false" : "true"));
      });
    }

    const observer = new MutationObserver(applyNextIndicatorVisibility);

    applyNextIndicatorVisibility();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [showNextIndicator]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.repeat || !event.altKey || event.key.toLowerCase() !== "n") {
        return;
      }

      setShowNextIndicator((current) => !current);
      event.preventDefault();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (introVisible) {
    return <IntroOverlay onFinish={() => setIntroVisible(false)} />;
  }

  if (!authReady || !ready) {
    return <LoadingState fullScreen brand title="FlavFlix" description="Opening the showcase." />;
  }

  if (!user) {
    return <LoadingState fullScreen brand title="FlavFlix" description="Preparing local profile access." />;
  }

  if (!activeProfile) {
    return (
      <ProfileGate
        profiles={profiles}
        onSelect={(profileId) => setActiveProfile(profileId)}
        onCreate={async (name) => {
          await createProfile(name);
        }}
        onUpdate={updateProfile}
        onRemove={removeProfile}
      />
    );
  }

  if (isWatchPage) {
    return <div className="min-h-screen bg-black">{children}</div>;
  }

  return (
    <div className="min-h-screen">
      {navigationPending ? <NavigationOverlay /> : null}

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-30 h-[148px] transition-opacity duration-500",
          headerElevated ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="h-full bg-[linear-gradient(180deg,rgba(5,5,7,0.97)_0%,rgba(5,5,7,0.84)_38%,rgba(5,5,7,0)_100%)]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-40 px-4 pb-3 pt-[calc(0.875rem+env(safe-area-inset-top))] xl:px-8">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 lg:gap-8">
            <AppLink href="/" className="block">
              <BrandLogo className="w-[126px] sm:w-[146px] lg:w-[158px]" priority />
            </AppLink>

            <nav className="hidden items-center gap-1 lg:flex">
              {PRIMARY_NAV_ITEMS.map((item) => (
                <HeaderLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Suspense fallback={<HeaderSearchFallback />}>
              <HeaderSearch />
            </Suspense>
            <UserMenu
              onChangeProfile={() => {
                setActiveProfile(null);
              }}
            />
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto min-h-screen w-full max-w-[1800px] px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] xl:px-8 lg:pb-12",
          isHomePage ? "pt-0" : "pt-24 sm:pt-28",
        )}
      >
        {children}
      </main>

      <ShellFooter />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#06060adf]/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-2">
          {mobileItems.map((item) => (
            <MobileLink key={item.href} href={item.href} label={item.label} />
          ))}
        </div>
      </nav>
    </div>
  );
}
