// ======================================================
// research/types.ts
// ------------------------------------------------------
// Definition of the Research object: constants, state,
// preferences, presets, and component props.
//
// Research is an embedded web workspace. The Research
// object owns one iframe, the active destination, and the
// split between the app and the web pane.
//
// Pop-out is reserved as a mode but is not built yet.
// ======================================================

import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Dedicated localStorage key. Only Research preferences live here. */
export const RESEARCH_STORAGE_KEY = "bettereveryday.research";

/**
 * The Research landing page, loaded in the iframe when Research opens.
 * It is served by the same app, so it uses whatever origin the app is running
 * on (dev server or production). When the app isn't running over http(s)
 * (for example a file:// Electron build) it falls back to the production URL.
 */
/** Initial page displayed when Research opens. */
export const RESEARCH_LANDING_URL = "https://en.wikipedia.org/wiki/Main_Page";

/** The public BetterEveryDay site (used by the BetterEveryDay preset). */
export const RESEARCH_HOME_URL = "https://bettereveryday.study";

/** Search text is routed to Wikipedia. */
export const RESEARCH_SEARCH_URL =
  "https://en.wikipedia.org/w/index.php?search=";

/** Initial split: main BetterEveryDay pane percentage (Research gets the rest). */
export const DEFAULT_SPLIT_PERCENT = 50;

/** Open/close transition. Matches the sidebar's 0.2s ease. */
export const RESEARCH_TRANSITION_MS = 200;

/** postMessage type the landing page sends to the Research object. */
export const RESEARCH_NAVIGATE_MESSAGE = "bettereveryday:research:navigate";

/**
 * Iframe sandbox. Deliberately NOT granted: allow-top-navigation (an embedded
 * site must not be able to navigate the whole BetterEveryDay app away).
 * allow-same-origin is required so sites keep their own cookies/storage
 * (without it every site gets an opaque origin and logins break).
 */
export const RESEARCH_IFRAME_SANDBOX = [
  "allow-scripts",
  "allow-same-origin",
  "allow-forms",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-modals",
  "allow-downloads",
].join(" ");

/** Permissions delegated to the embedded site (permissions policy). */
export const RESEARCH_IFRAME_ALLOW = "fullscreen; clipboard-write";

/* ------------------------------------------------------------------ */
/* Object definition                                                   */
/* ------------------------------------------------------------------ */

/** `popout` is reserved for a future phase and is not implemented. */
export type ResearchMode = "closed" | "split" | "popout";

/** Runtime state of the Research object. */
export interface ResearchState {
  mode: ResearchMode;
  /** Single source of truth for the iframe destination. */
  url: string;
  /** Percentage (0-100) of the workspace given to the main pane. Research gets the rest. */
  splitPercent: number;
}

/** The only things persisted to localStorage. */
export interface ResearchPreferences {
  splitPercent: number;
  rememberLastUrl: boolean;
  /** Only ever set while rememberLastUrl is true. */
  lastUrl: string | null;
}

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

export type ResearchPresetId =
  | "bettereveryday"
  | "google"
  | "youtube"
  | "github"
  | "wikipedia";

export interface ResearchPreset {
  id: ResearchPresetId;
  label: string;
  url: string;
}

export const RESEARCH_PRESETS: readonly ResearchPreset[] = [
  { id: "bettereveryday", label: "BetterEveryDay", url: RESEARCH_HOME_URL },
  { id: "google", label: "Google", url: "https://www.google.com" },
  { id: "youtube", label: "YouTube", url: "https://www.youtube.com" },
  { id: "github", label: "GitHub", url: "https://github.com" },
  { id: "wikipedia", label: "Wikipedia", url: "https://www.wikipedia.org" },
];

/* ------------------------------------------------------------------ */
/* URL / search resolution                                             */
/* ------------------------------------------------------------------ */

export type ResearchResolveResult =
  | { ok: true; kind: "url" | "search"; url: string }
  | { ok: false; reason: "empty" | "unsupported-scheme" | "invalid" };

/** Message sent by the landing page (inside the iframe) to the Research object. */
export interface ResearchNavigateMessage {
  type: typeof RESEARCH_NAVIGATE_MESSAGE;
  url: string;
}

/* ------------------------------------------------------------------ */
/* Component props                                                     */
/* ------------------------------------------------------------------ */

export interface ResearchWorkspaceProps {
  /** The existing page area (toolbar + page). Always rendered, never remounted. */
  children: ReactNode;
}

export interface ResearchPaneProps {
  url: string;
  /** Resolves input (URL, domain or search text) and navigates the iframe. */
  onNavigate: (input: string) => ResearchResolveResult;
  onClose: () => void;
}