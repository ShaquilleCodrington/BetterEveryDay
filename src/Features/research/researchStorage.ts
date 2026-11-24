// ======================================================
// research/researchStorage.ts
// ------------------------------------------------------
// State, persistence, and operations for the Research
// object. Also holds the URL / search resolution, since
// navigation is one of the object's operations.
//
// Runtime state lives in a small store read with
// useResearch(). Only preferences are saved to
// localStorage (under RESEARCH_STORAGE_KEY).
// ======================================================

import { useSyncExternalStore } from "react";
import {
  DEFAULT_SPLIT_PERCENT,
  RESEARCH_HOME_URL,
  RESEARCH_MOBILE_QUERY,
  RESEARCH_SEARCH_PROVIDER,
  RESEARCH_STORAGE_KEY,
} from "./types";
import type {
  ResearchPreferences,
  ResearchResolveResult,
  ResearchState,
} from "./types";

/* ------------------------------------------------------------------ */
/* URL / search resolution                                             */
/* ------------------------------------------------------------------ */

const HTTP_PREFIX = /^https?:\/\//i;
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
// "localhost:3000" and "example.com:8080/x" look like schemes but are host:port.
const HOST_WITH_PORT = /^[^\s/:]+:\d+(?:[/?#]|$)/;
const BLOCKED_SCHEMES = new Set(["javascript", "data", "vbscript", "file", "blob", "about"]);
const DOMAIN =
  /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d{1,5})?(?:[/?#]\S*)?$/i;

function toHttpUrl(candidate: string, kind: "url" | "search"): ResearchResolveResult {
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, reason: "unsupported-scheme" };
    }
    return { ok: true, kind, url: parsed.href };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/**
 * Turns whatever the user typed into a destination:
 *  - http(s) URL            -> that URL
 *  - domain / host:port     -> https://<input>
 *  - other schemes          -> rejected (javascript:, data:, file:, mailto:, ...)
 *  - anything else          -> a search on RESEARCH_SEARCH_PROVIDER
 */
export function resolveResearchInput(raw: string): ResearchResolveResult {
  const input = raw.trim();
  if (!input) return { ok: false, reason: "empty" };

  if (HTTP_PREFIX.test(input)) return toHttpUrl(input, "url");

  const hasSpace = /\s/.test(input);
  const scheme = SCHEME.exec(input);
  if (scheme && !HOST_WITH_PORT.test(input)) {
    // "note: buy milk" is search text; "javascript: x" and "mailto:a@b.c" are not.
    if (BLOCKED_SCHEMES.has(scheme[1].toLowerCase()) || !hasSpace) {
      return { ok: false, reason: "unsupported-scheme" };
    }
  }

  if (!hasSpace && DOMAIN.test(input)) return toHttpUrl(`https://${input}`, "url");

  return toHttpUrl(RESEARCH_SEARCH_PROVIDER.buildUrl(input), "search");
}

/** User-facing text for a rejected input (the "empty" case shows no message). */
export function describeResolveError(reason: "unsupported-scheme" | "invalid"): string {
  return reason === "unsupported-scheme"
    ? "Only http and https addresses are supported."
    : "That address is not valid.";
}

/** True for a string that parses as an http(s) URL. Used to validate stored values. */
export function isResearchHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Preferences (localStorage, validated on read)                       */
/* ------------------------------------------------------------------ */

function defaultPreferences(): ResearchPreferences {
  return { splitPercent: DEFAULT_SPLIT_PERCENT, rememberLastUrl: false, lastUrl: null };
}

function isValidSplit(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function readPreferences(): ResearchPreferences {
  const defaults = defaultPreferences();
  try {
    const raw = window.localStorage.getItem(RESEARCH_STORAGE_KEY);
    if (!raw) return defaults;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return defaults;
    const stored = data as Record<string, unknown>;
    const rememberLastUrl = stored.rememberLastUrl === true;
    return {
      splitPercent: isValidSplit(stored.splitPercent) ? stored.splitPercent : defaults.splitPercent,
      rememberLastUrl,
      lastUrl: rememberLastUrl && isResearchHttpUrl(stored.lastUrl) ? stored.lastUrl : null,
    };
  } catch {
    // Storage missing, blocked, or malformed JSON: fall back to defaults.
    return defaults;
  }
}

function writePreferences(prefs: ResearchPreferences): void {
  try {
    window.localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable or full: preferences simply won't persist.
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

let state: ResearchState | null = null;
let preferences: ResearchPreferences | null = null;
const listeners = new Set<() => void>();

function getPreferences(): ResearchPreferences {
  if (!preferences) preferences = readPreferences();
  return preferences;
}

function savePreferences(next: ResearchPreferences): void {
  preferences = next;
  writePreferences(next);
}

function setState(next: ResearchState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/**
 * Builds the closed initial state from saved preferences. Called lazily on first use.
 * Starts on the homepage unless "remember last destination" has a saved page.
 */
export function initializeResearch(): ResearchState {
  preferences = readPreferences();
  const remembered = preferences.rememberLastUrl ? preferences.lastUrl : null;
  state = {
    mode: "closed",
    view: remembered ? "page" : "home",
    focus: "app",
    url: remembered ?? RESEARCH_HOME_URL,
    splitPercent: preferences.splitPercent,
  };
  return state;
}

export function getResearchState(): ResearchState {
  return state ?? initializeResearch();
}

export function subscribeResearch(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook: re-renders when Research state changes. */
export function useResearch(): ResearchState {
  return useSyncExternalStore(subscribeResearch, getResearchState);
}

/* ------------------------------------------------------------------ */
/* Mobile layout                                                       */
/* ------------------------------------------------------------------ */

function subscribeMobile(listener: () => void): () => void {
  const query = window.matchMedia(RESEARCH_MOBILE_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function getMobileSnapshot(): boolean {
  return window.matchMedia(RESEARCH_MOBILE_QUERY).matches;
}

/** True on a narrow screen, where Research is full-screen instead of a split. */
export function useResearchMobile(): boolean {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot);
}

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

/**
 * Opens Research in split mode at the saved proportion (50/50 the first time).
 * The destination is kept as it was: reopening does not send the user back to
 * the homepage; only goHomeResearch() does that. On mobile it opens with the
 * Research side in front.
 */
export function openResearch(): void {
  const current = getResearchState();
  if (current.mode === "split") return;
  setState({ ...current, mode: "split", focus: "research" });
}

/** Sidebar control: opens Research when closed, closes it when open. */
export function toggleResearch(): void {
  if (getResearchState().mode === "closed") openResearch();
  else closeResearch();
}

/** Closes Research. The pane (and its iframe) unmounts; the destination stays in the store. */
export function closeResearch(): void {
  const current = getResearchState();
  if (current.mode === "closed") return;
  setState({ ...current, mode: "closed", focus: "app" });
}

/**
 * Mobile: moves the screen to the other side (app <-> Research).
 * Nothing is unmounted, so both sides keep their state.
 */
export function cycleResearchFocus(): void {
  const current = getResearchState();
  if (current.mode !== "split") return;
  setState({ ...current, focus: current.focus === "app" ? "research" : "app" });
}

/**
 * Navigates the iframe. Accepts a URL, a domain, or search text.
 * Switches to the "page" view (the homepage header goes away).
 * Returns the resolution so the caller can show an error for rejected input.
 * Ignored (but still resolved) if Research has been closed in the meantime.
 */
export function navigateResearch(input: string): ResearchResolveResult {
  const result = resolveResearchInput(input);
  if (!result.ok) return result;

  const current = getResearchState();
  if (current.mode !== "split") return result;

  setState({ ...current, view: "page", url: result.url });

  const prefs = getPreferences();
  if (prefs.rememberLastUrl) savePreferences({ ...prefs, lastUrl: result.url });
  return result;
}

/** Returns to the homepage: search bar + shortcuts above the home page. */
export function goHomeResearch(): void {
  const current = getResearchState();
  if (current.view === "home") return;
  setState({ ...current, view: "home", url: RESEARCH_HOME_URL });

  const prefs = getPreferences();
  if (prefs.rememberLastUrl && prefs.lastUrl) savePreferences({ ...prefs, lastUrl: null });
}

/** Updates the split live (during drag). Does not write to localStorage. */
export function setResearchSplitPercent(percent: number): void {
  if (!Number.isFinite(percent)) return;
  const clamped = Math.min(100, Math.max(0, percent));
  const current = getResearchState();
  if (clamped === current.splitPercent) return;
  setState({ ...current, splitPercent: clamped });
}

/** Persists the current split. Call when a drag or keyboard adjustment ends. */
export function saveResearchSplitPercent(): void {
  savePreferences({ ...getPreferences(), splitPercent: getResearchState().splitPercent });
}

/** Turns "reopen at the last destination" on or off. Turning it off forgets the saved URL. */
export function setRememberLastUrl(enabled: boolean): void {
  const prefs = getPreferences();
  savePreferences({ ...prefs, rememberLastUrl: enabled, lastUrl: enabled ? prefs.lastUrl : null });
}