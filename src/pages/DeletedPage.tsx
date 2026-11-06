// ======================================================
// ★★★★★ CHANGED 11/06/2026 ★★★★★ — NEW FILE.
// DeletedPage.tsx
// ------------------------------------------------------
// Settings > Deleted.
// Two panels:
//   - Recently deleted: items in the Snapshot's deleted record
//     that still have a saved copy in the daily history. Restore
//     one, a group, or everything.
//   - Daily snapshots: one saved copy per day. "Restore missing"
//     brings back everything in that day's snapshot that the
//     current data doesn't have.
//
// After a successful restore the page reloads, because the app keeps
// tasks in memory (MainLayout) and would otherwise overwrite the
// restored tasks the next time one is edited.
// ======================================================
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
    loadCurrentSnapshot,
    DELETED_RETENTION_DAYS,
} from "../Services/Snapshot/snapshot";
import {
    findDeletedItems,
    listHistory,
    type DeletedMatch,
    type HistorySummary,
} from "../Services/Snapshot/syncHistory";
import {
    restoreDeletedItems,
    restoreFromHistory,
} from "../Services/Snapshot/syncManager";

// Carries the success message across the reload.
const RESTORE_MESSAGE_KEY = "deletedPageMessage";

const GROUP_ORDER: { key: string; label: string }[] = [
    { key: "tasks", label: "Tasks" },
    { key: "notebookFolders", label: "Notebook folders" },
    { key: "notebooks", label: "Notebooks" },
    { key: "pages", label: "Pages" },
    { key: "blocks", label: "Blocks" },
    { key: "journeyFolders", label: "Journey folders" },
    { key: "journeys", label: "Journeys" },
    { key: "invoices", label: "Invoices" },
    { key: "comments", label: "Comments" },
    { key: "commentLikes", label: "Comment likes" },
];

// Best available name for an item. Falls back to its ID.
function itemLabel(match: DeletedMatch): string {
    const item = match.item as Record<string, unknown> | null;

    if (!item) {
        return match.id;
    }

    for (const key of ["title", "name", "invoiceNumber", "content", "text"]) {
        const value = item[key];

        if (typeof value === "string" && value.trim() !== "") {
            return value.length > 80 ? value.slice(0, 80) + "…" : value;
        }
    }

    return match.id;
}

function daysLeft(deletedAt: string): number {
    const ageDays =
        (Date.now() - Date.parse(deletedAt)) / (24 * 60 * 60 * 1000);

    return Math.max(0, Math.ceil(DELETED_RETENTION_DAYS - ageDays));
}

function formatDate(iso: string): string {
    const date = new Date(iso);

    return isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function countsLine(counts: Record<string, number>): string {
    return [
        `Tasks ${counts.tasks ?? 0}`,
        `Notebooks ${counts.notebooks ?? 0}`,
        `Pages ${counts.pages ?? 0}`,
        `Blocks ${counts.blocks ?? 0}`,
        `Journeys ${counts.journeys ?? 0}`,
    ].join(" · ");
}

// Remember the message, then reload so the app re-reads restored storage.
function finishRestore(message: string): void {
    try {
        sessionStorage.setItem(RESTORE_MESSAGE_KEY, message);
    } catch {
        // The message is only a courtesy; the reload still happens.
    }

    window.location.reload();
}

export default function DeletedPage() {
    const navigate = useNavigate();

    const [userId, setUserId] = useState<string | null>(null);
    const [matches, setMatches] = useState<DeletedMatch[]>([]);
    const [history, setHistory] = useState<HistorySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const current = loadCurrentSnapshot();

            if (!current) {
                setMatches([]);
                setHistory([]);
                return;
            }

            setUserId(current.userId);

            setHistory(
                await listHistory(current.userId)
            );

            setMatches(
                await findDeletedItems(
                    current.userId,
                    current
                )
            );
        } catch (loadError) {
            console.error("[deleted] Failed to load:", loadError);
            setError("Could not load saved data. Try again in a moment.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Show the message left by a restore that just reloaded the page.
        try {
            const saved = sessionStorage.getItem(RESTORE_MESSAGE_KEY);

            if (saved) {
                sessionStorage.removeItem(RESTORE_MESSAGE_KEY);
                setMessage(saved);
            }
        } catch {
            // Nothing to show.
        }

        void load();
    }, [load]);

    async function restoreItems(list: DeletedMatch[]) {
        if (!userId || list.length === 0) {
            return;
        }

        setBusy(true);
        setMessage(null);
        setError(null);

        try {
            const result =
                await restoreDeletedItems(userId, list);

            finishRestore(`Restored ${result.restoredCount} item(s).`);
        } catch (restoreError) {
            console.error("[deleted] Restore failed:", restoreError);
            setError("Restore failed. Nothing was changed.");
            setBusy(false);
        }
    }

    async function restoreSnapshot(historyId: string) {
        if (!userId) {
            return;
        }

        setBusy(true);
        setMessage(null);
        setError(null);

        try {
            const result =
                await restoreFromHistory(userId, historyId);

            if (result.restoredCount === 0) {
                setMessage("Nothing was missing from that snapshot.");
                setBusy(false);
                return;
            }

            finishRestore(
                `Restored ${result.restoredCount} item(s) from the ${historyId} snapshot.`
            );
        } catch (restoreError) {
            console.error("[deleted] Snapshot restore failed:", restoreError);
            setError("Restore failed. Nothing was changed.");
            setBusy(false);
        }
    }

    const recoverable = matches.filter(match => match.item !== null);
    const unrecoverableCount = matches.length - recoverable.length;

    return (
        <div>
            {/* Back button */}
            <button
                onClick={() => navigate("/settings")}
                style={{
                    background: "transparent", border: "none",
                    color: "rgba(160,190,255,0.7)", fontSize: "13px",
                    cursor: "pointer", padding: "0 0 18px 0",
                    display: "flex", alignItems: "center", gap: "6px", boxShadow: "none",
                }}
            >
                ‹ Back to Settings
            </button>

            <h1>Deleted</h1>

            {loading && (
                <p style={{ color: "rgba(220,235,255,0.7)", fontSize: "13px" }}>Loading…</p>
            )}

            {error && (
                <p style={{ color: "rgba(255,150,150,0.9)", fontSize: "13px" }}>{error}</p>
            )}

            {message && (
                <p style={{ color: "rgba(150,255,190,0.9)", fontSize: "13px" }}>{message}</p>
            )}

            {/* ── Recently deleted ─────────────────────────────────────── */}
            <div className="glass-panel" style={{ padding: "20px", marginTop: "20px", maxWidth: "600px" }}>
                <h2>Recently deleted</h2>
                <hr />

                <p style={{ margin: "0 0 12px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                    Deletions are remembered for {DELETED_RETENTION_DAYS} days.
                    Restoring an item brings it back on all your devices.
                </p>

                {!loading && recoverable.length === 0 && (
                    <p style={{ color: "rgba(220,235,255,0.7)", fontSize: "13px" }}>
                        Nothing to restore.
                    </p>
                )}

                {!loading && recoverable.length > 0 && (
                    <button
                        disabled={busy}
                        onClick={() => void restoreItems(recoverable)}
                        style={{ marginBottom: "14px" }}
                    >
                        Restore everything ({recoverable.length})
                    </button>
                )}

                {GROUP_ORDER.map(group => {
                    const items = recoverable.filter(
                        match => match.collection === group.key
                    );

                    if (items.length === 0) {
                        return null;
                    }

                    return (
                        <details key={group.key} style={{ marginBottom: "10px" }}>
                            <summary style={{ cursor: "pointer", color: "rgba(220,235,255,0.9)", fontSize: "13px" }}>
                                {group.label} ({items.length})
                            </summary>

                            <div style={{ margin: "8px 0 8px 12px" }}>
                                <button
                                    disabled={busy}
                                    onClick={() => void restoreItems(items)}
                                    style={{ marginBottom: "8px" }}
                                >
                                    Restore all {group.label.toLowerCase()}
                                </button>

                                {items.map(match => (
                                    <div
                                        key={`${match.collection}:${match.id}`}
                                        style={{
                                            display: "flex", alignItems: "center",
                                            justifyContent: "space-between", gap: "12px",
                                            padding: "6px 0",
                                        }}
                                    >
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: 0, color: "rgba(220,235,255,0.9)", fontSize: "13px" }}>
                                                {itemLabel(match)}
                                            </p>
                                            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                                                Deleted {formatDate(match.deletedAt)} · {daysLeft(match.deletedAt)} day(s) left
                                            </p>
                                        </div>

                                        <button
                                            disabled={busy}
                                            title="Restore"
                                            onClick={() => void restoreItems([match])}
                                            style={{ flexShrink: 0 }}
                                        >
                                            ↩
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </details>
                    );
                })}

                {!loading && unrecoverableCount > 0 && (
                    <p style={{ margin: "14px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                        {unrecoverableCount} deleted item(s) have no saved copy in the daily snapshots and can't be restored from here.
                    </p>
                )}
            </div>

            {/* ── Daily snapshots ──────────────────────────────────────── */}
            <div className="glass-panel" style={{ padding: "20px", marginTop: "20px", maxWidth: "600px" }}>
                <h2>Daily snapshots</h2>
                <hr />

                <p style={{ margin: "0 0 12px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                    One copy is saved each day, taken before that day's first sync.
                    "Restore missing" adds back everything in a snapshot that your
                    current data doesn't have, including items you deleted on purpose.
                </p>

                {!loading && history.length === 0 && (
                    <p style={{ color: "rgba(220,235,255,0.7)", fontSize: "13px" }}>
                        No snapshots saved yet.
                    </p>
                )}

                {history.map(entry => (
                    <div
                        key={entry.id}
                        style={{
                            display: "flex", alignItems: "center",
                            justifyContent: "space-between", gap: "12px",
                            padding: "8px 0",
                        }}
                    >
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, color: "rgba(220,235,255,0.9)", fontSize: "13px" }}>
                                {entry.id}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                                Saved {formatDate(entry.savedAt)} · {countsLine(entry.counts)}
                            </p>
                        </div>

                        <button
                            disabled={busy}
                            onClick={() => void restoreSnapshot(entry.id)}
                            style={{ flexShrink: 0 }}
                        >
                            Restore missing
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}