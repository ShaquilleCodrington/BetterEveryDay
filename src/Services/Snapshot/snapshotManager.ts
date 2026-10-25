import {
    loadCurrentSnapshot,
    updateCurrentSnapshot,
    saveCurrentSnapshot,
    type Snapshot, pruneDeleted,
    createSnapshot, mergeDeleted,
    normalizeSnapshot, normalizeDeleted,
    
} from "./snapshot";

import {
    loadTasks,
    saveTasks,
} from "../../Data/taskStorage";
import {
    saveProfile,
} from "../../Data/profileStorage";
import {
    loadNotebooks,
    saveNotebooks,
    loadNotebookFolders,
    saveNotebookFolders,
    loadPages,
    savePages,
    loadBlocks,
    saveBlocks,
} from "../../Features/notes/storage/notebookStorage";

import {
    loadJourneys,
    saveJourneys,
    loadJourneyFolders,
    saveJourneyFolders,
} from "../../Features/journey/Storage/journeyStorage";

// 10/09/2026 — Adjust this path to match your folders.
import {
    getInvoices,
    saveInvoices,
} from "../../Features/invoice/invoiceStorage";

export interface ReconcileOptions {
    baseline?: unknown;
}


// 2026-08-25 — Rebuild the current Snapshot from the latest local state, save it locally, and hand it to the Sync Manager.
export async function processCurrentSnapshot(userId?: string): Promise<Snapshot | null>
{
    let currentSnapshot = loadCurrentSnapshot();

    if (!currentSnapshot)
    {
        if (!userId) {
            return null;
        }

        const newSnapshot =
            await createSnapshot(userId);

        saveCurrentSnapshot(
            newSnapshot
        );

        return newSnapshot;
    }

    if (userId) {
        currentSnapshot =
            normalizeSnapshot(
                currentSnapshot,
                userId
            );
    }

    const updatedSnapshot =
        await updateCurrentSnapshot(currentSnapshot);

    updatedSnapshot.updatedAt = new Date().toISOString();

    updatedSnapshot.deleted =
        pruneDeleted(updatedSnapshot.deleted);

    saveCurrentSnapshot(updatedSnapshot);

    return updatedSnapshot;
}


// 2026-08-23 — Explicitly capture the latest local state and signal the Sync Manager.
export async function explicitSave(userId: string): Promise<Snapshot | null>
{
    return processCurrentSnapshot(userId);
}


// 2026-08-23 — Capture the latest local state when the application is closing and signal the Sync Manager.
export async function applicationClosing(userId: string): Promise<Snapshot | null>
{
    return processCurrentSnapshot(userId);
}


// ★★★★★ CHANGED 10/25/2026 ★★★★★ — REWRITTEN.
// One generic reconcile for every collection (journeys pass journeyId as
// the key). Rules:
//   - In the deleted record: dropped, always. Deletion is intentional and
//     permanent, so it beats any edit and any copy on the other side.
//   - On both sides: newest updatedAt wins.
//   - On one side only: kept.
function reconcileCollection<T extends { updatedAt?: string }>(
    localItems: T[],
    cloudItems: T[],
    deletedIds: Record<string, string>,
    getId: (item: T) => string
): T[] {
    const localById = new Map(
        localItems.map(item => [getId(item), item] as const)
    );

    const cloudById = new Map(
        cloudItems.map(item => [getId(item), item] as const)
    );

    const allIds = new Set([
        ...localById.keys(),
        ...cloudById.keys(),
    ]);

    const resolvedItems: T[] = [];

    for (const id of allIds) {
        if (deletedIds[id] !== undefined) {
            continue;
        }

        const localItem = localById.get(id);
        const cloudItem = cloudById.get(id);

        if (localItem && cloudItem) {
            const localTime = localItem.updatedAt ?? "";
            const cloudTime = cloudItem.updatedAt ?? "";

            resolvedItems.push(
                localTime >= cloudTime
                    ? localItem
                    : cloudItem
            );
            continue;
        }

        resolvedItems.push(
            (localItem ?? cloudItem) as T
        );
    }

    return resolvedItems;
}

const byId = (item: { id: string }) => item.id;
const byJourneyId = (item: { journeyId: string }) => item.journeyId;


// 2026-08-25 — Compare the current local Snapshot against
// the Snapshot retrieved from the cloud and produce the
// resolved Snapshot.
//
// This function performs reconciliation only.
// It does not communicate with Firebase.
export function reconcileSnapshots(
    localSnapshot: Snapshot,
    cloudSnapshot: Snapshot,
    _options: ReconcileOptions = {}
): Snapshot
{
    // ★★★★★ CHANGED 10/25/2026 ★★★★★ — NEW (replaces resolveBaseline).
    // Every deletion either side knows about, combined.
    const deleted =
        mergeDeleted(
            localSnapshot.deleted,
            cloudSnapshot.deleted
        );

    const useLocalProfile =
        localSnapshot.profileUpdatedAt >=
        cloudSnapshot.profileUpdatedAt;

    const resolvedSnapshot: Snapshot = {
        ...localSnapshot,

        userId:
            localSnapshot.userId,

        profile:
            useLocalProfile
                ? localSnapshot.profile
                : cloudSnapshot.profile,

        profileUpdatedAt:
            useLocalProfile
                ? localSnapshot.profileUpdatedAt
                : cloudSnapshot.profileUpdatedAt,

        tasks:
            reconcileCollection(
                localSnapshot.tasks,
                cloudSnapshot.tasks,
                deleted.tasks,
                byId
            ),

        pages:
            reconcileCollection(
                localSnapshot.pages,
                cloudSnapshot.pages,
                deleted.pages,
                byId
            ),

        blocks:
            reconcileCollection(
                localSnapshot.blocks,
                cloudSnapshot.blocks,
                deleted.blocks,
                byId
            ),

        notebooks:
            reconcileCollection(
                localSnapshot.notebooks,
                cloudSnapshot.notebooks,
                deleted.notebooks,
                byId
            ),

        notebookFolders:
            reconcileCollection(
                localSnapshot.notebookFolders,
                cloudSnapshot.notebookFolders,
                deleted.notebookFolders,
                byId
            ),

        journeys:
            reconcileCollection(
                localSnapshot.journeys,
                cloudSnapshot.journeys,
                deleted.journeys,
                byJourneyId
            ),

        journeyFolders:
            reconcileCollection(
                localSnapshot.journeyFolders,
                cloudSnapshot.journeyFolders,
                deleted.journeyFolders,
                byId
            ),

        // 10/09/2026 — `?? []` so older Snapshots without invoices are safe.
        invoices:
            reconcileCollection(
                localSnapshot.invoices ?? [],
                cloudSnapshot.invoices ?? [],
                deleted.invoices,
                byId
            ),

        // ★★★★★ CHANGED 10/25/2026 ★★★★★ — NEW: save the merged list,
        // minus anything older than the retention period.
        deleted:
            pruneDeleted(deleted),

        updatedAt:
            new Date().toISOString(),
    };

    return resolvedSnapshot;
}

// 2026-08-25 — Restore the resolved Snapshot into the
// application's local storage collections.
//
// This function performs local storage work only.
//
// ★★★★★ CHANGED 10/25/2026 ★★★★★ — Anything in the Snapshot's deleted
// record is removed from local storage too, so a deletion made on another
// device takes effect here.
export async function restoreSnapshotToLocalStorage(
    snapshot: Snapshot,
    _options: ReconcileOptions = {}
): Promise<Snapshot>
{
    const deleted =
        normalizeDeleted(
            snapshot.deleted
        );

    const currentTasks =
        loadTasks();

    const currentNotebooks =
        loadNotebooks();

    const currentNotebookFolders =
        loadNotebookFolders();

    const currentJourneys =
        loadJourneys();

    const currentJourneyFolders =
        loadJourneyFolders();

    const currentPages =
        loadPages();

    const currentBlocks =
        loadBlocks();

    const currentInvoices =
        getInvoices();

    const restoredTasks =
        reconcileCollection(
            currentTasks,
            snapshot.tasks,
            deleted.tasks,
            byId
        );

    const restoredNotebookFolders =
        reconcileCollection(
            currentNotebookFolders,
            snapshot.notebookFolders,
            deleted.notebookFolders,
            byId
        );

    const restoredNotebooks =
        reconcileCollection(
            currentNotebooks,
            snapshot.notebooks,
            deleted.notebooks,
            byId
        );

    const restoredJourneyFolders =
        reconcileCollection(
            currentJourneyFolders,
            snapshot.journeyFolders,
            deleted.journeyFolders,
            byId
        );

    const restoredJourneys =
        reconcileCollection(
            currentJourneys,
            snapshot.journeys,
            deleted.journeys,
            byJourneyId
        );

    const restoredPages =
        reconcileCollection(
            currentPages,
            snapshot.pages,
            deleted.pages,
            byId
        );

    const restoredBlocks =
        reconcileCollection(
            currentBlocks,
            snapshot.blocks,
            deleted.blocks,
            byId
        );

    const restoredInvoices =
        reconcileCollection(
            currentInvoices,
            snapshot.invoices ?? [],
            deleted.invoices,
            byId
        );

    await saveProfile(snapshot.profile);

    saveTasks(
        restoredTasks
    );

    saveNotebookFolders(
        restoredNotebookFolders
    );

    saveNotebooks(
        restoredNotebooks
    );

    savePages(
        restoredPages
    );

    saveBlocks(
        restoredBlocks
    );

    saveJourneys(
        restoredJourneys
    );

    saveJourneyFolders(
        restoredJourneyFolders
    );

    saveInvoices(
        restoredInvoices
    );

    const restoredSnapshot: Snapshot = {
        ...snapshot,

        tasks:
            restoredTasks,

        profile:
            snapshot.profile,

        profileUpdatedAt:
            snapshot.profileUpdatedAt,

        notebooks:
            restoredNotebooks,

        notebookFolders:
            restoredNotebookFolders,

        pages:
            restoredPages,

        blocks:
            restoredBlocks,

        journeys:
            restoredJourneys,

        journeyFolders:
            restoredJourneyFolders,

        invoices:
            restoredInvoices,

        // ★★★★★ CHANGED 10/25/2026 ★★★★★ — NEW
        deleted,

        updatedAt:
            new Date().toISOString(),
    };

    saveCurrentSnapshot(
        restoredSnapshot
    );

    return restoredSnapshot;
}

// 2026-08-25 — Resolve a cloud Snapshot against the current
// local Snapshot and materialize the resolved state locally.
//
// The Sync Manager is responsible for retrieving the cloud
// Snapshot and pushing the returned resolved Snapshot.
export async function reconcileAndRestoreSnapshot(
    localSnapshot: Snapshot,
    cloudSnapshot: Snapshot,
    options: ReconcileOptions = {}
): Promise<Snapshot>
{
    const resolvedSnapshot =
        reconcileSnapshots(
            localSnapshot,
            cloudSnapshot,
            options
        );

    saveCurrentSnapshot(
        resolvedSnapshot
    );

    const restoredSnapshot =
        await restoreSnapshotToLocalStorage(
            resolvedSnapshot,
            options
        );

    return restoredSnapshot;
}