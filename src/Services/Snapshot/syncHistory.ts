// ★★★★★ CHANGED 11/06/2026 ★★★★★ — NEW FILE.
// Daily sync history: one saved copy of the cloud Snapshot per day, taken
// before the cloud is overwritten. Also holds the helpers that find
// deleted items in that history and add them back to a Snapshot.
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
} from "firebase/firestore";

import { database } from "../firebase/config";

import {
    normalizeDeleted,
    normalizeSnapshot,
    type DeletedCollection,
    type Snapshot,
} from "./snapshot";

// Every collection in the Snapshot and how to read an item's ID.
// Journeys use journeyId, everything else uses id.
const COLLECTIONS: {
    key: DeletedCollection;
    getId: (item: any) => string;
}[] = [
    { key: "tasks", getId: item => item.id },
    { key: "pages", getId: item => item.id },
    { key: "blocks", getId: item => item.id },
    { key: "notebooks", getId: item => item.id },
    { key: "notebookFolders", getId: item => item.id },
    { key: "journeys", getId: item => item.journeyId },
    { key: "journeyFolders", getId: item => item.id },
    { key: "invoices", getId: item => item.id },
    { key: "comments", getId: item => item.id },
    { key: "commentLikes", getId: item => item.id },
];

export interface HistorySummary {
    // The day the entry was saved for, YYYY-MM-DD.
    id: string;
    savedAt: string;
    snapshotUpdatedAt: string;
    counts: Record<string, number>;
}

export interface RestoreItem {
    collection: DeletedCollection;
    id: string;
    item: unknown;
}

export interface DeletedMatch {
    collection: DeletedCollection;
    id: string;
    deletedAt: string;
    // null = no history entry still holds this item.
    item: unknown | null;
    historyId: string | null;
}

export interface ItemPick {
    collection: DeletedCollection;
    id: string;
}

function getHistoryCollection(userId: string) {
    return collection(database, "users", userId, "syncHistory");
}

function countItems(snapshot: Snapshot): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const { key } of COLLECTIONS) {
        counts[key] = ((snapshot[key] ?? []) as unknown[]).length;
    }

    return counts;
}

// One entry per calendar day (local time), keyed YYYY-MM-DD.
function todayKey(): string {
    const now = new Date();

    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${now.getFullYear()}-${month}-${day}`;
}

// Save a full copy of the cloud Snapshot as today's history entry, unless
// today already has one. The first sync of the day therefore keeps the
// state the cloud was in before anything that day overwrote it.
// Throws on failure so the caller can stop before overwriting anything.
export async function saveHistoryEntry(
    snapshot: Snapshot
): Promise<void> {

    const reference =
        doc(
            database,
            "users",
            snapshot.userId,
            "syncHistory",
            todayKey()
        );

    const existing =
        await getDoc(reference);

    if (existing.exists()) {
        return;
    }

    const cleanSnapshot =
        JSON.parse(
            JSON.stringify(snapshot)
        );

    await setDoc(
        reference,
        {
            savedAt: new Date().toISOString(),
            snapshotUpdatedAt: snapshot.updatedAt,
            counts: countItems(snapshot),
            snapshot: cleanSnapshot,
        }
    );
}

// Newest first. Summaries only, for browsing.
export async function listHistory(
    userId: string,
    maxEntries: number = 30
): Promise<HistorySummary[]> {

    const result =
        await getDocs(
            query(
                getHistoryCollection(userId),
                orderBy("savedAt", "desc"),
                limit(maxEntries)
            )
        );

    return result.docs.map(entry => {
        const data = entry.data();

        return {
            id: entry.id,
            savedAt: data.savedAt,
            snapshotUpdatedAt: data.snapshotUpdatedAt,
            counts: data.counts ?? {},
        };
    });
}

// Load one saved Snapshot from the history.
export async function getHistorySnapshot(
    userId: string,
    historyId: string
): Promise<Snapshot | null> {

    const entry =
        await getDoc(
            doc(
                database,
                "users",
                userId,
                "syncHistory",
                historyId
            )
        );

    if (!entry.exists()) {
        return null;
    }

    return normalizeSnapshot(
        entry.data().snapshot as Partial<Snapshot>,
        userId
    );
}

// Items that are in `source` but not in `current`.
// With `picks`, only those items. Without, everything missing.
export function missingItems(
    current: Snapshot,
    source: Snapshot,
    picks?: ItemPick[]
): RestoreItem[] {

    const wanted =
        picks
            ? new Set(picks.map(pick => `${pick.collection}:${pick.id}`))
            : null;

    const found: RestoreItem[] = [];

    for (const { key, getId } of COLLECTIONS) {
        const haveIds = new Set(
            ((current[key] ?? []) as unknown[]).map(getId)
        );

        for (const item of (source[key] ?? []) as unknown[]) {
            const id = getId(item);

            if (haveIds.has(id)) {
                continue;
            }

            if (wanted && !wanted.has(`${key}:${id}`)) {
                continue;
            }

            found.push({ collection: key, id, item });
        }
    }

    return found;
}

// Add the items to the Snapshot and remove their deletion records, so the
// next reconcile and restore keep them.
export function applyItems(
    current: Snapshot,
    items: RestoreItem[]
): Snapshot {

    const deleted =
        normalizeDeleted(current.deleted);

    const result: Snapshot = { ...current };

    for (const { key, getId } of COLLECTIONS) {
        const existing =
            (current[key] ?? []) as unknown[];

        const haveIds = new Set(existing.map(getId));

        const added: unknown[] = [];

        for (const entry of items) {
            if (entry.collection !== key || haveIds.has(entry.id)) {
                continue;
            }

            added.push(entry.item);
            delete deleted[key][entry.id];
        }

        (result as any)[key] = [...existing, ...added];
    }

    result.deleted = deleted;
    result.updatedAt = new Date().toISOString();

    return result;
}

// For every ID in the current deletion record, find the newest history
// entry that still holds the item. Newest deletions first.
export async function findDeletedItems(
    userId: string,
    current: Snapshot,
    maxEntries: number = 30
): Promise<DeletedMatch[]> {

    const result =
        await getDocs(
            query(
                getHistoryCollection(userId),
                orderBy("savedAt", "desc"),
                limit(maxEntries)
            )
        );

    const entries = result.docs.map(entry => ({
        id: entry.id,
        snapshot: normalizeSnapshot(
            entry.data().snapshot as Partial<Snapshot>,
            userId
        ),
    }));

    const deleted = normalizeDeleted(current.deleted);
    const matches: DeletedMatch[] = [];

    for (const { key, getId } of COLLECTIONS) {
        for (const [id, deletedAt] of Object.entries(deleted[key])) {
            let item: unknown | null = null;
            let historyId: string | null = null;

            for (const entry of entries) {
                const hit =
                    ((entry.snapshot[key] ?? []) as unknown[])
                        .find(candidate => getId(candidate) === id);

                if (hit !== undefined) {
                    item = hit;
                    historyId = entry.id;
                    break;
                }
            }

            matches.push({
                collection: key,
                id,
                deletedAt,
                item,
                historyId,
            });
        }
    }

    matches.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

    return matches;
}