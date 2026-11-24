// ======================================================
// research/types.ts
// ------------------------------------------------------
// Definition of the Research object: constants, state,
// preferences, search provider, shortcuts, and component
// props.
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
 * Page shown under the Research homepage header (search bar + shortcuts).
 * Going "home" returns to this page with the header visible.
 */
export const RESEARCH_HOME_URL = "https://en.wikipedia.org/wiki/Main_Page";

/** Initial split: main BetterEveryDay pane percentage (Research gets the rest). */
export const DEFAULT_SPLIT_PERCENT = 50;

/** Open/close transition. Matches the sidebar's 0.2s ease. */
export const RESEARCH_TRANSITION_MS = 200;

/** At or below this width Research is not a split: one side fills the screen at a time. */
export const RESEARCH_MOBILE_QUERY = "(max-width: 768px)";

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
/* Search provider (the ONE place the search engine is chosen)         */
/* ------------------------------------------------------------------ */

export interface ResearchSearchProvider {
  id: string;
  /** Shown in the search placeholder, e.g. "Search Wikipedia or enter a URL". */
  label: string;
  /** Builds the results URL for a query. It must be embeddable in the iframe. */
  buildUrl: (query: string) => string;
}

/**
 * Wikipedia is the provider for now: the big web engines (DuckDuckGo, Google,
 * Bing) refuse to be framed by other sites. To change engines later, replace
 * this one object; nothing else references a search URL.
 */
export const RESEARCH_SEARCH_PROVIDER: ResearchSearchProvider = {
  id: "wikipedia",
  label: "Wikipedia",
  buildUrl: (query) => "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(query),
};

/* ------------------------------------------------------------------ */
/* Object definition                                                   */
/* ------------------------------------------------------------------ */

/** `popout` is reserved for a future phase and is not implemented. */
export type ResearchMode = "closed" | "split" | "popout";

/**
 * "home": the homepage header (search bar + shortcuts) is shown above RESEARCH_HOME_URL.
 * "page": the header is replaced by the compact toolbar and the page fills the pane.
 */
export type ResearchView = "home" | "page";

/**
 * Which side has the screen on mobile. "app" is the left side (BetterEveryDay),
 * "research" is the right side. Both stay mounted; only one is visible.
 * Ignored on desktop, where both sides are always visible.
 */
export type ResearchFocus = "app" | "research";

/** Runtime state of the Research object. */
export interface ResearchState {
  mode: ResearchMode;
  view: ResearchView;
  focus: ResearchFocus;
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
/* Shortcuts                                                           */
/* ------------------------------------------------------------------ */

export type ResearchShortcutId = "web" | "wiki" | "github" | "desmos" | "wolfram" | "khan";

export interface ResearchShortcut {
  id: ResearchShortcutId;
  label: string;
  url: string;
  /**
   * true  -> opens inside the Research pane.
   * false -> opens in a new tab (the site refuses to be framed, or has not been tested).
   * Flip a flag to true once the site is confirmed to load in the iframe.
   */
  embeddable: boolean;
}

export const RESEARCH_SHORTCUTS: readonly ResearchShortcut[] = [
  // DuckDuckGo sends frame-ancestors / X-Frame-Options that block other sites.
  { id: "web", label: "Web", url: "https://duckduckgo.com", embeddable: false },
  { id: "wiki", label: "Wiki", url: RESEARCH_HOME_URL, embeddable: true },
  // GitHub, WolframAlpha: not yet tested in the iframe.
  { id: "github", label: "GitHub", url: "https://github.com", embeddable: false },
  // Desmos publishes embedding for its calculator.
  { id: "desmos", label: "Desmos", url: "https://www.desmos.com/calculator", embeddable: true },
  { id: "wolfram", label: "WolframAlpha", url: "https://www.wolframalpha.com", embeddable: false },
  // Khan Academy has been reported to send X-Frame-Options: sameorigin.
  { id: "khan", label: "Khan Academy", url: "https://www.khanacademy.org", embeddable: false },
];

/* ------------------------------------------------------------------ */
/* URL / search resolution                                             */
/* ------------------------------------------------------------------ */

export type ResearchResolveResult =
  | { ok: true; kind: "url" | "search"; url: string }
  | { ok: false; reason: "empty" | "unsupported-scheme" | "invalid" };

/* ------------------------------------------------------------------ */
/* Component props                                                     */
/* ------------------------------------------------------------------ */

export interface ResearchWorkspaceProps {
  /** The existing page area (toolbar + page). Always rendered, never remounted. */
  children: ReactNode;
  /** The Research page (pages/ResearchPage). Rendered only while Research is open. */
  pane: ReactNode;
}