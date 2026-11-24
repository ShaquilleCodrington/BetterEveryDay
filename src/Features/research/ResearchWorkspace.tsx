// ======================================================
// research/ResearchWorkspace.tsx
// ------------------------------------------------------
// The Research object's split container.
//
// ResearchWorkspace wraps the existing page area and, when
// Research is open, shares the space with the Research
// page (pages/ResearchPage, passed in as `pane`) through a
// draggable divider.
//
// The wrapped content is always rendered in the same place
// in the tree, so opening and closing Research never
// remounts it. The Research page (and its iframe) only
// exists while Research is open.
//
// Mobile: no split and no divider. Both sides stay mounted
// and `data-focus` decides which one fills the screen, so
// switching sides never resets either of them. While the
// app side is in front, a floating button brings the
// Research side back (the Research side has its own switch
// button in the page's toolbar).
// ======================================================

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { ArrowLeftRight } from "lucide-react";
import { RESEARCH_TRANSITION_MS } from "./types";
import type { ResearchWorkspaceProps } from "./types";
import {
  cycleResearchFocus,
  saveResearchSplitPercent,
  setResearchSplitPercent,
  useResearch,
  useResearchMobile,
} from "./researchStorage";

const KEYBOARD_STEP = 2;

export function ResearchWorkspace({ children, pane }: ResearchWorkspaceProps) {
  const { mode, focus, splitPercent } = useResearch();
  const isMobile = useResearchMobile();
  const open = mode === "split";
  // Closed always means the app side is in front.
  const visibleSide = open ? focus : "app";

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

  // The split proportions only apply on desktop; on mobile CSS gives the visible side everything.
  const mainStyle: CSSProperties | undefined = isMobile
    ? undefined
    : { flexGrow: expanded ? splitPercent : 100 };
  const paneStyle: CSSProperties | undefined = isMobile
    ? undefined
    : { flexGrow: expanded ? 100 - splitPercent : 0 };

  return (
    <div
      ref={containerRef}
      className={classes}
      style={style}
      data-layout={isMobile ? "mobile" : "desktop"}
      data-focus={visibleSide}
    >
      <div className="research-main" style={mainStyle}>
        {children}
      </div>
      {mounted && (
        <>
          {!isMobile && (
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
          )}
          <div className="research-pane-wrap" style={paneStyle}>
            {pane}
          </div>
        </>
      )}
      {isMobile && open && focus === "app" && (
        <button
          type="button"
          className="btn-primary research-switch"
          onClick={cycleResearchFocus}
          title="Switch to Research"
          aria-label="Switch to Research"
        >
          <ArrowLeftRight size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}