// ======================================================
// pages/ResearchPage.tsx
// ------------------------------------------------------
// The Research page: what fills the Research side of the
// workspace.
//
// Two views (state lives in researchStorage):
//   home: our search bar + shortcuts above the home page
//   page: the compact toolbar above the current page
//
// The page owns the single iframe. It gets everything it
// needs from researchStorage; it is rendered by App.tsx
// into ResearchWorkspace's `pane`, so it only exists while
// Research is open.
// ======================================================

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Calculator,
  Code,
  GraduationCap,
  Globe,
  Home,
  Sigma,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  RESEARCH_IFRAME_ALLOW,
  RESEARCH_IFRAME_SANDBOX,
  RESEARCH_SEARCH_PROVIDER,
  RESEARCH_SHORTCUTS,
} from "../Features/research/types";
import type { ResearchShortcut, ResearchShortcutId } from "../Features/research/types";
import {
  closeResearch,
  cycleResearchFocus,
  describeResolveError,
  goHomeResearch,
  navigateResearch,
  useResearch,
  useResearchMobile,
} from "../Features/research/researchStorage";

const SEARCH_PLACEHOLDER = `Search ${RESEARCH_SEARCH_PROVIDER.label} or enter a URL`;

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

// lucide-react is already used by the sidebar. No brand logos: GitHub uses a code icon.
const SHORTCUT_ICONS: Record<ResearchShortcutId, LucideIcon> = {
  web: Globe,
  wiki: BookOpen,
  github: Code,
  desmos: Calculator,
  wolfram: Sigma,
  khan: GraduationCap,
};

/* ------------------------------------------------------------------ */
/* Switch button (mobile only): moves the screen to the app side       */
/* ------------------------------------------------------------------ */

function SwitchButton() {
  return (
    <button
      type="button"
      className="toolbar-icon-btn research-cycle-btn"
      onClick={cycleResearchFocus}
      title="Switch to BetterEveryDay"
      aria-label="Switch to BetterEveryDay"
    >
      <ArrowLeftRight size={16} aria-hidden="true" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Home view: search bar + shortcuts                                   */
/* ------------------------------------------------------------------ */

function ResearchHome({ isMobile }: { isMobile: boolean }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = navigateResearch(query);
    setError(!result.ok && result.reason !== "empty" ? describeResolveError(result.reason) : null);
  }

  function openShortcut(shortcut: ResearchShortcut) {
    if (shortcut.embeddable) navigateResearch(shortcut.url);
    else window.open(shortcut.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="research-home">
      <div className="research-home__bar">
        {isMobile && <SwitchButton />}
        <form className="research-home__search" role="search" onSubmit={handleSubmit} data-invalid={error ? "true" : undefined}>
          <input
            className="research-home__input"
            type="text"
            inputMode="url"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError(null);
            }}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label={SEARCH_PLACEHOLDER}
            aria-invalid={error ? true : undefined}
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />
          <button type="submit" className="btn-primary research-home__submit" aria-label="Go">
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
        <button
          type="button"
          className="toolbar-icon-btn"
          onClick={closeResearch}
          title="Close Research"
          aria-label="Close Research"
        >
          <CloseIcon />
        </button>
      </div>
      {error && (
        <div className="research-home__error" role="alert">
          {error}
        </div>
      )}
      <div className="research-home__shortcuts">
        {RESEARCH_SHORTCUTS.map((shortcut) => {
          const ShortcutIcon = SHORTCUT_ICONS[shortcut.id];
          const hint = shortcut.embeddable ? shortcut.label : `${shortcut.label} (opens in a new tab)`;
          return (
            <button
              key={shortcut.id}
              type="button"
              className="research-home__shortcut"
              onClick={() => openShortcut(shortcut)}
              title={hint}
              aria-label={hint}
            >
              <ShortcutIcon size={26} strokeWidth={1.8} aria-hidden="true" />
              <span>{shortcut.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page view: compact toolbar                                          */
/* ------------------------------------------------------------------ */

function ResearchToolbar({ url, isMobile }: { url: string; isMobile: boolean }) {
  const [draft, setDraft] = useState(url);
  const [error, setError] = useState<string | null>(null);

  // Keep the address bar in step with the destination (one source of truth: `url`).
  useEffect(() => {
    setDraft(url);
    setError(null);
  }, [url]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = navigateResearch(draft);
    setError(!result.ok && result.reason !== "empty" ? describeResolveError(result.reason) : null);
  }

  function openExternally() {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <form className="research-toolbar" onSubmit={handleSubmit}>
        {isMobile && <SwitchButton />}
        <button
          type="button"
          className="toolbar-icon-btn"
          onClick={goHomeResearch}
          title="Research home"
          aria-label="Research home"
        >
          <Home size={16} aria-hidden="true" />
        </button>
        <input
          className="research-toolbar__input"
          type="text"
          inputMode="url"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          placeholder={SEARCH_PLACEHOLDER}
          aria-label={SEARCH_PLACEHOLDER}
          aria-invalid={error ? true : undefined}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          className="toolbar-icon-btn"
          onClick={openExternally}
          title="Open in a new tab (some sites block embedding)"
          aria-label="Open in a new tab"
        >
          <ExternalIcon />
        </button>
        <button
          type="button"
          className="toolbar-icon-btn"
          onClick={closeResearch}
          title="Close Research"
          aria-label="Close Research"
        >
          <CloseIcon />
        </button>
      </form>
      {error && (
        <div className="research-toolbar__error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * The iframe is only re-pointed when `url` changes, so resizing the split never
 * reloads it, and switching between the home header and the toolbar never
 * touches it. It unmounts with this page (Research closed).
 */
export default function ResearchPage() {
  const { view, url } = useResearch();
  const isMobile = useResearchMobile();

  return (
    <div className="research-pane">
      {view === "home" ? (
        <ResearchHome isMobile={isMobile} />
      ) : (
        <ResearchToolbar url={url} isMobile={isMobile} />
      )}
      <iframe
        className="research-frame"
        title="Research"
        src={url}
        sandbox={RESEARCH_IFRAME_SANDBOX}
        allow={RESEARCH_IFRAME_ALLOW}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}