// ======================================================
// ResearchPage.tsx
// ------------------------------------------------------
// The Research landing page at /study/research.
//
// This is the page loaded INSIDE the Research iframe. It is
// not the split container and not the Research object. It
// is rendered by App() before AuthGate, so it has no
// sidebar and no login.
//
// It asks the Research object (the parent window) to
// navigate; the object owns the iframe and the destination.
// ======================================================

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { RESEARCH_NAVIGATE_MESSAGE, RESEARCH_PRESETS } from "../Features/research/types";
import type { ResearchNavigateMessage, ResearchPresetId } from "../Features/research/types";
import { resolveResearchInput } from "../Features/research/researchStorage";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

// Neutral glyphs (not brand logos); swap for the app's icon system if one is added.
const PRESET_ICONS: Record<ResearchPresetId, ReactNode> = {
  bettereveryday: (
    <Icon>
      <path d="M4 17l5-5 4 4 7-8" />
      <path d="M15 8h5v5" />
    </Icon>
  ),
  google: (
    <Icon>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </Icon>
  ),
  youtube: (
    <Icon>
      <rect x="3" y="6" width="18" height="12" rx="3.5" />
      <path d="M10.5 9.5v5l4.5-2.5z" />
    </Icon>
  ),
  github: (
    <Icon>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M6 8v8" />
      <path d="M18 10c0 3-3 4-7 4s-5 1-5 2" />
    </Icon>
  ),
  wikipedia: (
    <Icon>
      <path d="M5 4h13a1 1 0 0 1 1 1v14H6a1 1 0 0 0-1 1z" />
      <path d="M5 20V4" />
    </Icon>
  ),
};

/**
 * Asks the Research object (the parent window) to navigate the iframe.
 * If this page was opened on its own (not embedded), it just navigates itself.
 * targetOrigin is "*" because the parent's origin isn't known here; the message
 * only carries a URL the user chose, and the parent verifies the sender.
 */
function sendToResearch(url: string): void {
  if (window.parent !== window) {
    const message: ResearchNavigateMessage = { type: RESEARCH_NAVIGATE_MESSAGE, url };
    window.parent.postMessage(message, "*");
  } else {
    window.location.assign(url);
  }
}

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = resolveResearchInput(query);
    if (!result.ok) {
      setError(
        result.reason === "empty"
          ? null
          : result.reason === "unsupported-scheme"
            ? "Only http and https addresses are supported."
            : "That address is not valid.",
      );
      return;
    }
    setError(null);
    sendToResearch(result.url);
  }

  return (
    <main className="research-landing">
      <div className="research-landing__inner">
        <h1 className="research-landing__title">BetterEveryDay</h1>
        <p className="research-landing__tagline">Explore. Learn. Make progress.</p>

        <form role="search" onSubmit={handleSubmit}>
          <div className="research-landing__search" data-invalid={error ? "true" : undefined}>
            <input
              className="research-landing__input"
              type="text"
              inputMode="url"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setError(null);
              }}
              placeholder="Search or enter a URL"
              aria-label="Search or enter a URL"
              aria-invalid={error ? true : undefined}
              spellCheck={false}
              autoComplete="off"
              autoFocus
            />
            <button type="submit" className="btn-primary research-landing__submit" aria-label="Go">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          {error && (
            <p className="research-landing__error" role="alert">
              {error}
            </p>
          )}
        </form>

        <div className="research-landing__presets">
          {RESEARCH_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="research-landing__preset"
              onClick={() => sendToResearch(preset.url)}
            >
              {PRESET_ICONS[preset.id]}
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}