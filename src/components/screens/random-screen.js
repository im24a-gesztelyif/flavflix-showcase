"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, ChevronRight, Clock3, Dice6, Film, Play, RefreshCcw, SlidersHorizontal, Sparkles, Star, Tv } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { useTmdbConfiguration, useTmdbQuery } from "@/hooks/use-tmdb-query";
import { useAppState } from "@/lib/app-state";
import { getDetailHref, getWatchHref, normalizeMediaItem } from "@/lib/media";
import { buildRandomDiscoverParams, DEFAULT_RANDOM_PREFERENCES, getRandomPickReason, RANDOM_MOODS, selectRandomCandidates } from "@/lib/random-picker";
import { tmdbClientGet } from "@/lib/tmdb-client";
import { buildImageUrl, cn, formatRuntime, formatVote } from "@/lib/utils";

const RECENT_KEY = "flavflix:random-recent";
const MEDIA_OPTIONS = [
  { id: "mixed", label: "Both", icon: Sparkles },
  { id: "movie", label: "Movies", icon: Film },
  { id: "tv", label: "Series", icon: Tv },
];
function getRuntimeOptions(mediaType) {
  if (mediaType === "tv") {
    return [
      { id: "any", label: "Any length" }, { id: "quick", label: "Under 30m" },
      { id: "standard", label: "30-60m" }, { id: "epic", label: "Over 60m" },
    ];
  }
  if (mediaType === "movie") {
    return [
      { id: "any", label: "Any length" }, { id: "quick", label: "Under 90m" },
      { id: "standard", label: "80-125m" }, { id: "epic", label: "Over 2h" },
    ];
  }
  return [
    { id: "any", label: "Any length" }, { id: "quick", label: "Quick" },
    { id: "standard", label: "Standard" }, { id: "epic", label: "Long-form" },
  ];
}
const QUALITY_OPTIONS = [
  { id: "popular", label: "Crowd pleaser" }, { id: "acclaimed", label: "Highly rated" },
  { id: "biggest", label: "Biggest hits" },
];
const RATING_OPTIONS = [
  { id: "", label: "Any" }, { id: "6", label: "6+ Solid" },
  { id: "7", label: "7+ Good" }, { id: "8", label: "8+ Great" },
];

function ChoiceButton({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(
      "touch-target rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70",
      active ? "border-accent-400/65 bg-accent-600 text-white shadow-[0_10px_30px_rgba(227,31,92,0.2)]" : "border-white/10 bg-white/[0.035] text-white/65 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
    )}>{children}</button>
  );
}

function getGenreId(genres, name) {
  return genres.find((genre) => genre.name === name)?.id;
}

function pickTitleLogo(logos = [], language = "en-US") {
  const preferred = [language, language.split("-")[0], "en", null];
  return [...logos].sort((left, right) => {
    const leftIndex = preferred.indexOf(left.iso_639_1);
    const rightIndex = preferred.indexOf(right.iso_639_1);
    const leftPriority = leftIndex === -1 ? preferred.length : leftIndex;
    const rightPriority = rightIndex === -1 ? preferred.length : rightIndex;
    return leftPriority - rightPriority || (right.vote_average || 0) - (left.vote_average || 0);
  })[0] || null;
}

function readRecentKeys() {
  try { return JSON.parse(sessionStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

function writeRecentKeys(keys) {
  try { sessionStorage.setItem(RECENT_KEY, JSON.stringify(keys.slice(-30))); } catch { /* Storage is optional. */ }
}

function CandidateCard({ item, configuration, language, onChoose }) {
  const media = normalizeMediaItem(item, item.media_type);
  const imagesQuery = useTmdbQuery(
    `${media.mediaType}/${media.id}/images`,
    { include_image_language: `${language},en,null` },
    { enabled: Boolean(media.id), ttl: 1000 * 60 * 60 },
  );
  const titleLogo = pickTitleLogo(imagesQuery.data?.logos, language);

  return (
    <button type="button" onClick={() => onChoose(item)} aria-label={`Choose ${media.title}`} className="group flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#101014] text-left shadow-panel transition-colors hover:border-white/25 hover:bg-[#141419] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70">
      <div className="relative overflow-hidden">
        <img src={buildImageUrl(media.backdropPath, "w780", configuration)} alt="" width="780" height="439" loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover opacity-80 transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.025]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101014]/80 via-transparent to-transparent" />
      </div>
      <div className="flex flex-1 items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex min-h-[3rem] items-center">
            {titleLogo?.file_path ? (
              <img src={buildImageUrl(titleLogo.file_path, "w300", configuration)} alt={media.title} width="300" height="72" loading="lazy" decoding="async" className="max-h-7 w-auto max-w-[min(100%,220px)] object-contain object-left drop-shadow-[0_5px_14px_rgba(0,0,0,0.7)]" />
            ) : (
              <p className="line-clamp-2 text-base font-semibold leading-6 text-white">{media.title}</p>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/48">
            <span>{media.mediaType === "movie" ? "Movie" : "Series"}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{media.year}</span>
            <span aria-hidden="true">&middot;</span>
            <span className="inline-flex items-center gap-1 text-[#f0c36a]"><Star className="h-3.5 w-3.5 fill-current" /> {formatVote(media.voteAverage)}</span>
          </div>
          <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-white/50">{media.overview}</p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-white/45 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
      </div>
    </button>
  );
}

export function RandomScreen() {
  const { settings, isSaved, toggleSaved } = useAppState();
  const { data: configuration } = useTmdbConfiguration();
  const movieGenresQuery = useTmdbQuery("genre/movie/list", { language: settings.language });
  const tvGenresQuery = useTmdbQuery("genre/tv/list", { language: settings.language });
  const languagesQuery = useTmdbQuery("configuration/languages");
  const [preferences, setPreferences] = useState(DEFAULT_RANDOM_PREFERENCES);
  const [deck, setDeck] = useState([]);
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [rollContext, setRollContext] = useState(null);
  const resultRef = useRef(null);
  const selectedMediaType = selection?.media_type || (selection?.title ? "movie" : "tv");
  const titleImagesQuery = useTmdbQuery(
    `${selectedMediaType}/${selection?.id}/images`,
    { include_image_language: `${settings.language},en,null` },
    { enabled: Boolean(selection?.id), ttl: 1000 * 60 * 60 },
  );

  const movieGenres = movieGenresQuery.data?.genres || [];
  const tvGenres = tvGenresQuery.data?.genres || [];
  const genreNames = [...new Set([...movieGenres, ...tvGenres].map((genre) => genre.name))].sort();
  const languages = [...(languagesQuery.data || [])]
    .filter((language) => language.iso_639_1)
    .sort((left, right) => (left.english_name || left.name || left.iso_639_1).localeCompare(right.english_name || right.name || right.iso_639_1));
  const media = selection ? normalizeMediaItem(selection, selectedMediaType) : null;
  const titleLogo = pickTitleLogo(titleImagesQuery.data?.logos, settings.language);
  const saved = media ? isSaved(media.id, media.mediaType) : false;
  const reasons = getRandomPickReason(preferences);
  const runtimeOptions = getRuntimeOptions(preferences.mediaType);

  function updatePreference(key, value) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function toggleMood(moodId) {
    setPreferences((current) => ({
      ...current,
      moods: current.moods.includes(moodId)
        ? current.moods.filter((id) => id !== moodId)
        : [...current.moods, moodId],
    }));
  }

  async function enrichSelection(item) {
    const mediaType = item.media_type || (item.title ? "movie" : "tv");
    const detail = await tmdbClientGet(`${mediaType}/${item.id}`, { language: settings.language });
    return { ...item, ...detail, media_type: mediaType };
  }

  async function fetchCandidates(nextPreferences, pages) {
    const mediaTypes = nextPreferences.mediaType === "mixed" ? ["movie", "tv"] : [nextPreferences.mediaType];
    const requests = mediaTypes.flatMap((mediaType) => {
      const genres = mediaType === "movie" ? movieGenres : tvGenres;
      const genreId = nextPreferences.genre ? getGenreId(genres, nextPreferences.genre) : undefined;
      if (nextPreferences.genre && !genreId) return [];
      return pages.map((page) => ({
        mediaType,
        promise: tmdbClientGet(`discover/${mediaType}`, buildRandomDiscoverParams({ preferences: nextPreferences, mediaType, genreId, language: settings.language, region: settings.region, page })),
      }));
    });
    if (!requests.length) throw new Error("That genre is not available for the selected format.");
    const responses = await Promise.all(requests.map((request) => request.promise));
    return {
      items: responses.flatMap((response, responseIndex) => (response?.results || []).map((item) => ({ ...item, media_type: requests[responseIndex].mediaType }))),
      totalPages: Math.min(500, Math.max(0, ...responses.map((response) => Number(response?.total_pages) || 0))),
    };
  }

  async function pickTonight() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const randomPage = Math.floor(Math.random() * 8) + 2;
      const rolledPreferences = { ...preferences, moods: [...preferences.moods] };
      const { items: candidates, totalPages } = await fetchCandidates(rolledPreferences, [1, randomPage]);
      const recentKeys = readRecentKeys();
      const nextDeck = selectRandomCandidates(candidates, recentKeys, 9);
      if (!nextDeck.length) throw new Error("Nothing matched that combination. Loosen one filter and try again.");
      const primary = await enrichSelection(nextDeck[0]);
      writeRecentKeys([...recentKeys, ...nextDeck.map((item) => `${item.media_type}:${item.id}`)]);
      setDeck([primary, ...nextDeck.slice(1)]);
      setSelection(primary);
      setRollContext({ preferences: rolledPreferences, nextPage: 2, totalPages });
    } catch (pickError) {
      setError(pickError.message || "The picker could not reach TMDB. Try again.");
    } finally { setLoading(false); }
  }

  async function loadMoreCandidates() {
    if (loadingMore || !rollContext || rollContext.nextPage > rollContext.totalPages) return;
    setLoadingMore(true);
    setError("");
    try {
      const pages = [rollContext.nextPage, rollContext.nextPage + 1].filter((page) => page <= rollContext.totalPages);
      const { items, totalPages } = await fetchCandidates(rollContext.preferences, pages);
      const existingKeys = new Set(deck.map((item) => `${item.media_type}:${item.id}`));
      const unseenItems = items.filter((item) => !existingKeys.has(`${item.media_type}:${item.id}`));
      const recentKeys = readRecentKeys();
      const additions = selectRandomCandidates(unseenItems, recentKeys, 8);
      const nextPage = rollContext.nextPage + pages.length;

      if (additions.length) {
        setDeck((current) => [...current, ...additions]);
        writeRecentKeys([...recentKeys, ...additions.map((item) => `${item.media_type}:${item.id}`)]);
      }
      setRollContext((current) => ({ ...current, nextPage, totalPages: Math.max(current.totalPages, totalPages) }));
      if (!additions.length && nextPage > totalPages) setError("You reached the end of this combination.");
    } catch (loadError) {
      setError(loadError.message || "More titles could not be loaded.");
    } finally { setLoadingMore(false); }
  }

  async function chooseCandidate(item) {
    setLoading(true);
    setError("");
    try {
      const nextSelection = await enrichSelection(item);
      setSelection(nextSelection);
      setDeck((current) => [nextSelection, ...current.filter((candidate) => candidate.id !== item.id)]);
    } catch (pickError) {
      setError(pickError.message || "That title could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!selection || loading) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, selection]);

  return (
    <div className="relative -mx-4 -mt-4 overflow-visible sm:-mx-6 sm:-mt-6 xl:-mx-8 xl:-mt-8">
      <div className="pointer-events-none absolute inset-x-0 -top-24 bottom-0 bg-cover bg-center opacity-20 transition-opacity duration-700 motion-reduce:transition-none" style={media ? { backgroundImage: `url(${buildImageUrl(media.backdropPath, "original", configuration)})` } : undefined} />
      <div className="pointer-events-none absolute inset-x-0 -top-24 bottom-0 bg-[radial-gradient(circle_at_78%_18%,rgba(229,156,70,0.12),transparent_28%),radial-gradient(circle_at_18%_12%,rgba(227,31,92,0.22),transparent_32%),linear-gradient(180deg,rgba(6,6,8,0.7),#060608_72%)]" />

      <main className="relative mx-auto max-w-[1500px] px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12 xl:px-8">
        <header className="mx-auto max-w-5xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-accent-300/20 bg-accent-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-200"><Dice6 className="h-4 w-4" /> Tonight&apos;s roulette</div>
          <h1 className="mt-5 text-balance font-[family-name:var(--font-display)] text-[clamp(2.7rem,8vw,7rem)] font-semibold leading-[0.9] tracking-[-0.045em] text-white">Stop browsing.<br /><span className="gradient-text">Start watching.</span></h1>
        </header>

        <section className="mx-auto mt-9 max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0ed9] shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:mt-12 sm:rounded-[36px]">
          <div className="grid border-b border-white/10 lg:grid-cols-[0.8fr_1.2fr]">
            <fieldset className="border-b border-white/10 p-5 sm:p-7 lg:border-b-0 lg:border-r lg:p-8">
              <legend className="sr-only">Choose movies, series, or both</legend>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/42">Pick from</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {MEDIA_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" aria-pressed={preferences.mediaType === id} onClick={() => updatePreference("mediaType", id)} className={cn("touch-target flex flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70", preferences.mediaType === id ? "border-accent-400/60 bg-accent-600/20 text-white" : "border-white/10 bg-white/[0.03] text-white/58 hover:bg-white/[0.07] hover:text-white")}><Icon className="h-5 w-5" /> {label}</button>
                ))}
              </div>
            </fieldset>
            <fieldset className="p-5 pt-6 sm:p-7 sm:pt-8 lg:p-8 lg:pt-9">
              <legend className="sr-only">Choose one or more moods</legend>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/42">What&apos;s the mood?</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <ChoiceButton active={!preferences.moods.length} onClick={() => updatePreference("moods", [])}>Anything</ChoiceButton>
                {RANDOM_MOODS.map((mood) => <ChoiceButton key={mood.id} active={preferences.moods.includes(mood.id)} onClick={() => toggleMood(mood.id)}>{mood.label}</ChoiceButton>)}
              </div>
            </fieldset>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-2 lg:grid-cols-[1fr_1fr_0.85fr_auto] lg:items-end lg:p-8">
            <fieldset>
              <legend className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/42"><Clock3 className="h-4 w-4" /> Time tonight</legend>
              <div className="mt-4 flex flex-wrap gap-2">{runtimeOptions.map((option) => <ChoiceButton key={option.id} active={preferences.runtime === option.id} onClick={() => updatePreference("runtime", option.id)}>{option.label}</ChoiceButton>)}</div>
            </fieldset>
            <fieldset>
              <legend className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/42"><Star className="h-4 w-4" /> Discovery style</legend>
              <div className="mt-4 flex flex-wrap gap-2">{QUALITY_OPTIONS.map((option) => <ChoiceButton key={option.id} active={preferences.quality === option.id} onClick={() => updatePreference("quality", option.id)}>{option.label}</ChoiceButton>)}</div>
            </fieldset>
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-[0.24em] text-white/42">Rating</legend>
              <div className="mt-4 flex flex-wrap gap-2">{RATING_OPTIONS.map((option) => <ChoiceButton key={option.id || "any"} active={preferences.rating === option.id} onClick={() => updatePreference("rating", option.id)}>{option.label}</ChoiceButton>)}</div>
            </fieldset>
            <button type="button" onClick={pickTonight} disabled={loading} className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-base font-bold text-black shadow-[0_18px_55px_rgba(255,255,255,0.14)] transition-transform hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none lg:w-auto">
              {loading ? <RefreshCcw className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : <Dice6 className="h-5 w-5 transition-transform group-hover:rotate-12 motion-reduce:transition-none" />}{loading ? "Choosing..." : selection ? "Pick again" : "Pick my watch"}
            </button>
          </div>

          <details className="group border-t border-white/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-white/68 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-300/70 sm:px-8"><span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Fine-tune the pick</span><span className="text-xs font-medium uppercase tracking-[0.18em] text-white/35 group-open:hidden">Optional</span></summary>
            <div className="grid gap-4 border-t border-white/10 px-5 py-5 sm:grid-cols-3 sm:px-8 sm:py-6">
              <label className="text-sm text-white/55"><span className="mb-2 block">Genre</span><select name="genre" value={preferences.genre} onChange={(event) => updatePreference("genre", event.target.value)} className="brand-select"><option value="">Any genre</option>{genreNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
              <fieldset className="text-sm text-white/55"><legend className="mb-2 block">Year span</legend><div className="flex min-h-12 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] focus-within:ring-2 focus-within:ring-accent-300/60"><input name="year-from" type="number" min="1870" max="2200" value={preferences.yearFrom} onChange={(event) => updatePreference("yearFrom", event.target.value.slice(0, 4))} placeholder="From" aria-label="Starting year" className="min-w-0 flex-1 bg-transparent px-4 text-white placeholder:text-white/28 focus:outline-none" /><span className="self-center text-white/25">-</span><input name="year-to" type="number" min="1870" max="2200" value={preferences.yearTo} onChange={(event) => updatePreference("yearTo", event.target.value.slice(0, 4))} placeholder="To" aria-label="Finishing year" className="min-w-0 flex-1 bg-transparent px-4 text-white placeholder:text-white/28 focus:outline-none" /></div></fieldset>
              <label className="text-sm text-white/55"><span className="mb-2 block">Original language</span><select name="language" value={preferences.language} onChange={(event) => updatePreference("language", event.target.value)} className="brand-select"><option value="">Any language</option>{languages.map((language) => <option key={language.iso_639_1} value={language.iso_639_1}>{language.english_name || language.name} ({language.iso_639_1})</option>)}</select></label>
            </div>
          </details>
        </section>

        <div aria-live="polite" aria-atomic="true">
          {error ? <p className="mx-auto mt-6 max-w-3xl rounded-2xl border border-rose-400/25 bg-rose-500/10 px-5 py-4 text-center text-sm text-rose-100">{error}</p> : null}
          {media ? (
            <section ref={resultRef} className="scroll-mt-24 pt-10 sm:pt-14">
              <div className="relative min-h-[620px] overflow-hidden rounded-[30px] border border-white/10 bg-black shadow-[0_40px_120px_rgba(0,0,0,0.65)] sm:min-h-[680px] sm:rounded-[42px] lg:min-h-[720px]">
                <img src={buildImageUrl(media.backdropPath, "original", configuration)} alt="" width="1920" height="1080" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center opacity-70" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,5,0.98)_0%,rgba(3,3,5,0.78)_40%,rgba(3,3,5,0.12)_76%),linear-gradient(0deg,rgba(3,3,5,0.98)_0%,transparent_52%)]" />
                <div className="relative flex min-h-[620px] flex-col justify-end p-6 sm:min-h-[680px] sm:p-10 lg:min-h-[720px] lg:max-w-[68%] lg:p-14">
                  <div className="mb-auto flex items-center gap-3"><span className="rounded-full border border-accent-300/25 bg-accent-500/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-100">Tonight&apos;s pick</span><span className="text-xs uppercase tracking-[0.2em] text-white/45">{media.mediaType === "movie" ? "Movie" : "Series"}</span></div>
                  {titleLogo?.file_path ? (
                    <img src={buildImageUrl(titleLogo.file_path, "w780", configuration)} alt={media.title} width="780" height="300" decoding="async" className="max-h-[150px] w-auto max-w-[min(86vw,680px)] object-contain object-left drop-shadow-[0_18px_44px_rgba(0,0,0,0.65)]" />
                  ) : (
                    <h2 className="text-balance font-[family-name:var(--font-display)] text-[clamp(2.7rem,7vw,6.8rem)] font-semibold leading-[0.88] tracking-[-0.045em] text-white">{media.title}</h2>
                  )}
                  {selection.tagline ? <p className="mt-4 text-lg italic text-white/60 sm:text-xl">{selection.tagline}</p> : null}
                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-white/72"><span>{media.year}</span>{media.runtime ? <span>{formatRuntime(media.runtime)}</span> : null}<span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-[#f0c36a] text-[#f0c36a]" /> {formatVote(media.voteAverage)}</span>{selection.genres?.slice(0, 3).map((genre) => <span key={genre.id}>{genre.name}</span>)}</div>
                  <div className="mt-5 flex flex-wrap gap-2">{reasons.map((reason) => <span key={reason} className="rounded-full border border-white/12 bg-black/30 px-3 py-1.5 text-xs font-medium text-white/66 backdrop-blur">{reason}</span>)}</div>
                  <p className="mt-6 max-w-3xl text-pretty text-sm leading-7 text-white/68 sm:text-base sm:leading-8">{media.overview}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <AppLink href={getWatchHref(media.mediaType, media.id)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"><Play className="h-4 w-4 fill-current" /> Watch now</AppLink>
                    <AppLink href={getDetailHref(media.mediaType, media.id)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">Details <ChevronRight className="h-4 w-4" /></AppLink>
                    <button type="button" onClick={() => toggleSaved(selection, media.mediaType)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">{saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />} {saved ? "In My List" : "My List"}</button>
                  </div>
                </div>
              </div>
              {deck.length > 1 ? (
                <div className="mt-8">
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/38">Not feeling it?</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">More from this roll</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {deck.slice(1).map((item) => <CandidateCard key={`${item.media_type}:${item.id}`} item={item} configuration={configuration} language={settings.language} onChoose={chooseCandidate} />)}
                  </div>
                  {rollContext?.nextPage <= rollContext?.totalPages ? (
                    <div className="mt-7 flex justify-center">
                      <button type="button" onClick={loadMoreCandidates} disabled={loadingMore} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.055] px-7 py-3 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-60">
                        {loadingMore ? <RefreshCcw className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
                        {loadingMore ? "Loading..." : "Show 8 more"} {!loadingMore ? <ChevronRight className="h-4 w-4 rotate-90" /> : null}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : <div className="mx-auto flex min-h-44 max-w-3xl items-center justify-center text-center" aria-hidden={loading}><p className="text-sm text-white/38">Set the mood, then leave the decision to us.</p></div>}
        </div>
      </main>
    </div>
  );
}
