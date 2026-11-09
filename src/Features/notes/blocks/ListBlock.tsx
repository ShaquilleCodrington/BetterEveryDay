import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Block, BlockType } from "../types";
import SlashMenu from "../slash/SlashMenu";
import Tooltip from "../../../Components/Tooltip";


interface Props {
    block: Block;

    onUpdateBlock: (blockId: string, content: string) => void;
    onConvertBlock: (  blockId: string,  type: BlockType,
                             content: any  ) => void;
    onCreateBlockAfter?: (  blockId: string  ) => void;
    onDeleteBlock?: (  blockId: string  ) => void;
    
    focused?: boolean;
}

// ★★★★★ CHANGED 11/09/2026 ★★★★★ — Where each bullet goes and the font it
// uses. Measured from the textarea itself, so the bullets always match
// the text, whatever the CSS says.
interface BulletMetrics {
    tops: number[];
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
}

const EMPTY_METRICS: BulletMetrics = {
    tops: [],
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    lineHeight: "inherit",
};

// Styles copied onto the hidden measuring copy so it wraps text exactly
// like the textarea does.
const MIRRORED_STYLES = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "lineHeight",
    "textTransform",
    "wordSpacing",
    "textIndent",
    "tabSize",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
] as const;

export default function ListBlock({ block, onUpdateBlock, 
    onConvertBlock, onCreateBlockAfter, onDeleteBlock, 
    focused }: Props) {

    if (block.type !== "list") return null;

const [value, setValue] = useState<string>(
        typeof block.content === "string"
            ? block.content
            : ""
    );

    const inputRef =
        useRef<HTMLTextAreaElement | null>(null);

    // ★★★★★ CHANGED 11/09/2026 ★★★★★ — Hidden copy of the text, used only
    // to measure where each line starts.
    const mirrorRef =
        useRef<HTMLDivElement | null>(null);

    const [metrics, setMetrics] =
        useState<BulletMetrics>(EMPTY_METRICS);

    // ★★★★★ CHANGED 11/09/2026 ★★★★★ — The line the cursor is on, and
    // whether the textarea has focus. That line shows a dot even while
    // it is empty, so pressing Enter puts a dot on the new line.
    const [activeLine, setActiveLine] =
        useState(0);

    const [isFocused, setIsFocused] =
        useState(false);

    const [showSlashMenu, setShowSlashMenu] =
        useState(false);

    const [slashQuery, setSlashQuery] =
        useState("");

    // ==========================================
    // Sync External Updates
    // ==========================================

    useEffect(() => {
        if (typeof block.content === "string") {
            setValue(block.content);
        }
    }, [block.content]);

    // ==========================================
    // Focus
    // ==========================================
 useEffect(() => {
        if (focused && inputRef.current) {

            inputRef.current.focus();

            // Place cursor at end of list
            const length =
                inputRef.current.value.length;

            inputRef.current.setSelectionRange(
                length,
                length
            );
        }
    }, [focused]);

    // ==========================================
    // Auto Resize
    // ==========================================

    useEffect(() => {
        autoResize();
    }, [value]);

    function autoResize() {

        if (!inputRef.current) {
            return;
        }

        inputRef.current.style.height = "0px";

        inputRef.current.style.height =
            `${inputRef.current.scrollHeight}px`;
    }

    // ==========================================
    // ★★★★★ CHANGED 11/09/2026 ★★★★★ — Bullet Positions
    // ==========================================
    // Each line of text is placed in a hidden copy that has the same
    // width, font and padding as the textarea. Where a line starts in
    // the copy is where its bullet goes, so bullets stay level with the
    // text even when a line wraps.

    function measureLines() {

        const input = inputRef.current;
        const mirror = mirrorRef.current;

        if (!input || !mirror) {
            return;
        }

        const style =
            window.getComputedStyle(input);

        for (const property of MIRRORED_STYLES) {
            mirror.style[property] = style[property];
        }

        mirror.style.boxSizing = "border-box";
        mirror.style.borderStyle = "solid";
        mirror.style.borderColor = "transparent";
        mirror.style.width = `${input.offsetWidth}px`;

        mirror.replaceChildren();

        const lines =
            input.value === ""
                ? [""]
                : input.value.split("\n");

        for (const line of lines) {

            const row =
                document.createElement("div");

            // An empty line still needs the height of one line.
            row.textContent =
                line === "" ? "\u200b" : line;

            mirror.appendChild(row);
        }

        const borderTop =
            parseFloat(style.borderTopWidth) || 0;

        const tops =
            Array.from(mirror.children).map(
                (child) =>
                    (child as HTMLElement).offsetTop + borderTop
            );

        const next: BulletMetrics = {
            tops,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
        };

        // Only update when something moved, so this can't loop.
        setMetrics((current) =>
            JSON.stringify(current) === JSON.stringify(next)
                ? current
                : next
        );
    }

    // Re-measure whenever the text changes.
    useLayoutEffect(() => {
        measureLines();
    }, [value]);

    // Re-measure when the textarea changes size (window resized, sidebar
    // toggled), because that changes where lines wrap.
    useEffect(() => {

        const input = inputRef.current;

        if (!input || typeof ResizeObserver === "undefined") {
            return;
        }

        const observer =
            new ResizeObserver(() => measureLines());

        observer.observe(input);

        return () => observer.disconnect();
    }, []);

    // ==========================================
    // ★★★★★ CHANGED 11/09/2026 ★★★★★ — Cursor Line
    // ==========================================

    function updateActiveLine() {

        const input = inputRef.current;

        if (!input) {
            return;
        }

        const textBeforeCursor =
            input.value.slice(0, input.selectionStart);

        setActiveLine(
            textBeforeCursor.split("\n").length - 1
        );
    }

    // ==========================================
    // Slash Menu
    // ==========================================

    function updateSlashMenu(
        input: string
    ) {

        if (!input.startsWith("/")) {

            setShowSlashMenu(false);
            setSlashQuery("");
            return;
        }

        setShowSlashMenu(true);

        setSlashQuery(
            input.substring(1).toLowerCase()
        );
    }

    function handleSlashCommand(command: string) {
        
        setShowSlashMenu(false);
        setSlashQuery("");
        
        switch (command) {
            case "divider":
                onConvertBlock(block.id, "divider", null);
                break;

            case "list":
                onConvertBlock(block.id, "list", null);
                break;

            case "text":
                onConvertBlock(block.id, "text", null);
                break;

                case "heading":
                onConvertBlock(block.id, "heading", null);
                break;
                case "checklist":
                onConvertBlock?.(block.id, "checklist", []);
                break;
        }

    }

    // ==========================================
    // Change
    // ==========================================

    function handleChange(
        event: React.ChangeEvent<HTMLTextAreaElement>
    ) {

        const newValue =
            event.target.value;

        updateSlashMenu(newValue);

        setValue(newValue);

        autoResize();

        updateActiveLine();

        onUpdateBlock(
            block.id,
            newValue
        );
    }

    // ==========================================
    // Keyboard
    // ==========================================

    function handleKeyDown(
        event: React.KeyboardEvent<HTMLTextAreaElement>
    ) {

        if (
            event.key === "Enter" &&
            event.shiftKey
        ) {

            event.preventDefault();

            onCreateBlockAfter?.(
                block.id
            );
        }

        if (
            event.key === "Backspace" &&
            value === ""
        ) {

            event.preventDefault();

            onDeleteBlock?.(
                block.id
            );
        }
    }

    // ==========================================
    // Bullets
    // ==========================================
    // A bullet shows on every line that has words, and on the line the
    // cursor is on. A blank line the cursor has moved off has none.

    const lines =
        value === ""
            ? [""]
            : value.split("\n");

    return (

        // ★★★★★ CHANGED 11/09/2026 ★★★★★ — Uses the same classes as
        // TextBlock and EmptyBlock, so size, padding and spacing match.
        <div className="block">

            <div className="block-row">

                <Tooltip text="Insert or convert this into a different block type" side="right">
                    <button
                        className="block-action"
                        onClick={() => setShowSlashMenu(true)}
                    >
                        +
                    </button>
                </Tooltip>

                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-start",
                        flex: "1 1 0%",
                        minWidth: 0,
                    }}
                >

                    {/* Hidden copy of the text, used only to measure. */}
                    <div
                        ref={mirrorRef}
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            visibility: "hidden",
                            pointerEvents: "none",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "break-word",
                        }}
                    />

                    {/* Bullet column. */}
                    <div
                        style={{
                            position: "relative",
                            flexShrink: 0,
                            width: "1.25em",
                            fontFamily: metrics.fontFamily,
                            fontSize: metrics.fontSize,
                            fontWeight: metrics.fontWeight,
                            lineHeight: metrics.lineHeight,
                            userSelect: "none",
                        }}
                    >
                        {lines.map((line, index) => {

                            const showBullet =
                                line.trim() !== "" ||
                                (isFocused && index === activeLine);

                            if (!showBullet) {
                                return null;
                            }

                            return (
                                <span
                                    key={index}
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: metrics.tops[index] ?? 0,
                                    }}
                                >
                                    •
                                </span>
                            );
                        })}
                    </div>

                    {/* Text Editor */}
                    <textarea
                        ref={inputRef}
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onKeyUp={updateActiveLine}
                        onClick={updateActiveLine}
                        onSelect={updateActiveLine}
                        onFocus={() => {
                            setIsFocused(true);
                            updateActiveLine();
                        }}
                        onBlur={() => setIsFocused(false)}
                        placeholder="List item..."
                        className="block-input"
                        style={{
                            flex: "1 1 0%",
                            minWidth: 0,
                            width: "auto",
                        }}
                    />

                </div>

                {showSlashMenu && (

                    <SlashMenu
                        query={slashQuery}
                        onSelect={handleSlashCommand}
                    />

                )}

            </div>

        </div>

    );
}