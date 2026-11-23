// ======================================================
// research/ResearchWorkspace.tsx
// ------------------------------------------------------
// The Research object's UI.
//
// ResearchWorkspace wraps the existing page area and, when
// Research is open, shares the space with the Research
// pane (navigation bar + the single iframe) through a
// draggable divider.
//
// The wrapped content is always rendered in the same place
// in the tree, so opening and closing Research never
// remounts it. The iframe only exists while Research is
// open.
// ======================================================

import { memo, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent, PointerEvent } from "react";
import {
  RESEARCH_IFRAME_ALLOW,
  RESEARCH_IFRAME_SANDBOX,
  RESEARCH_LANDING_URL,
  RESEARCH_NAVIGATE_MESSAGE,
  RESEARCH_TRANSITION_MS,
} from "./types";
import type {
  ResearchNavigateMessage,
  ResearchPaneProps,
  ResearchWorkspaceProps,
} from "./types";
import {
  closeResearch,
  isResearchLandingUrl,
  navigateResearch,
  saveResearchSplitPercent,
  setResearchSplitPercent,
  useResearch,
} from "./researchStorage";

const LANDING_ORIGIN = new URL(RESEARCH_LANDING_URL).origin;
const KEYBOARD_STEP = 2;

/* ------------------------------------------------------------------ */
/* Pane: navigation bar + iframe                                       */
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

function errorMessage(reason: "unsupported-scheme" | "invalid"): string {
  return reason === "unsupported-scheme"
    ? "Only http and https addresses are supported."
    : "That address is not valid.";
}

/**
 * The iframe is only re-pointed when `url` changes, so resizing the split never
 * reloads it, and it unmounts when this component unmounts (Research closed).
 */
const ResearchPane = memo(function ResearchPane({ url, onNavigate, onClose }: ResearchPaneProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const isLanding = isResearchLandingUrl(url);
  const [draft, setDraft] = useState(isLanding ? "" : url);
  const [error, setError] = useState<string | null>(null);

  // Keep the address bar in step with the destination (one source of truth: `url`).
  useEffect(() => {
    setDraft(isResearchLandingUrl(url) ? "" : url);
    setError(null);
  }, [url]);

  // The landing page lives inside the iframe and asks us to navigate via postMessage.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.origin !== LANDING_ORIGIN) return;
      const data = event.data as Partial<ResearchNavigateMessage> | null;
      if (!data || data.type !== RESEARCH_NAVIGATE_MESSAGE || typeof data.url !== "string") return;
      onNavigate(data.url);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onNavigate]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = onNavigate(draft);
    setError(!result.ok && result.reason !== "empty" ? errorMessage(result.reason) : null);
  }

  function openExternally() {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="research-pane">
      <form className="research-toolbar" onSubmit={handleSubmit}>
        <input
          className="research-toolbar__input"
          type="text"
          inputMode="url"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          placeholder="Search or enter a URL"
          aria-label="Search or enter a URL"
          aria-invalid={error ? true : undefined}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          className="toolbar-icon-btn"
          onClick={openExternally}
          disabled={isLanding}
          title="Open in a new tab (some sites block embedding)"
          aria-label="Open in a new tab"
        >
          <ExternalIcon />
        </button>
        <button
          type="button"
          className="toolbar-icon-btn"
          onClick={onClose}
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
      <iframe
        ref={frameRef}
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
});

/* ------------------------------------------------------------------ */
/* Workspace: split layout + divider                                   */
/* ------------------------------------------------------------------ */

export function ResearchWorkspace({ children }: ResearchWorkspaceProps) {
  const { mode, url, splitPercent } = useResearch();
  const open = mode === "split";

  const [mounted, setMounted] = useState(open); // pane is in the DOM
  const [expanded, setExpanded] = useState(false); // pane has its share of the space
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Open: mount collapsed, then expand on the next painted frame so it transitions.
  // Close: collapse, then unmount (releasing the iframe) once the transition ends.
  useEffect(() => {
    if (open) {
      setMounted(true);
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setExpanded(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setExpanded(false);
    const timer = window.setTimeout(() => setMounted(false), RESEARCH_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault(); // no text selection while dragging
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    setResearchSplitPercent(((event.clientX - rect.left) / rect.width) * 100);
  }

  // Fires on pointer up, cancel, and any other loss of capture.
  function handleLostPointerCapture() {
    setDragging(false);
    saveResearchSplitPercent();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -KEYBOARD_STEP : KEYBOARD_STEP;
    setResearchSplitPercent(splitPercent + delta);
    saveResearchSplitPercent();
  }

  const classes = [
    "research-workspace",
    expanded ? "research-workspace--expanded" : "",
    dragging ? "research-workspace--dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    "--research-transition-ms": `${RESEARCH_TRANSITION_MS}ms`,
  } as CSSProperties;

  return (
    <div ref={containerRef} className={classes} style={style}>
      <div className="research-main" style={{ flexGrow: expanded ? splitPercent : 100 }}>
        {children}
      </div>
      {mounted && (
        <>
          <div
            className="research-divider"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Research pane"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(splitPercent)}
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onLostPointerCapture={handleLostPointerCapture}
            onKeyDown={handleKeyDown}
          />
          <div className="research-pane-wrap" style={{ flexGrow: expanded ? 100 - splitPercent : 0 }}>
            <ResearchPane url={url} onNavigate={navigateResearch} onClose={closeResearch} />
          </div>
        </>
      )}
    </div>
  );
}