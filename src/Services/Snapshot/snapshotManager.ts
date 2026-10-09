import {
    loadCurrentSnapshot,
    updateCurrentSnapshot,
    saveCurrentSnapshot,
    type Snapshot,
    createSnapshot,
    normalizeSnapshot,
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

const SYNC_BASELINE_KEY = "lastSyncedIds";

export interface SyncBaseline {
    userId: string;
    syncedAt: string;

    tasks: string[];
    pages: string[];
    blocks: string[];
    notebooks: string[];
    notebookFolders: string[];
    journeys: string[];
    journeyFolders: string[];
    // 10/09/2026 — Baselines saved before invoices existed won't have this;
    // loadSyncBaseline() fills in [].
    invoices: string[];
}

// 10/09/2026 — The mass-deletion safeguard (the 20% rule) was removed. When it
// tripped, it rejected every deletion in a collection and the union brought the
// deleted items back, which is what broke cross-device deletes.
export interface ReconcileOptions {
    // Defaults to the baseline saved by the last
    // successful sync. Pass null to force the safe union.
    baseline?: SyncBaseline | null;
}


// Record the IDs that were just synced successfully.
export function saveSyncBaseline(
    snapshot: Snapshot
): void {
    const baseline: SyncBaseline = {
        userId: snapshot.userId,
        syncedAt: new Date().toISOString(),

        tasks:
            snapshot.tasks.map(item => item.id),

        pages:
            snapshot.pages.map(item => item.id),

        blocks:
            snapshot.blocks.map(item => item.id),

        notebooks:
            snapshot.notebooks.map(item => item.id),

        notebookFolders:
            snapshot.notebookFolders.map(item => item.id),

        journeys:
            snapshot.journeys.map(item => item.journeyId),

        journeyFolders:
            snapshot.journeyFolders.map(item => item.id),

        invoices:
            (snapshot.invoices ?? []).map(item => item.id),
    };

    localStorage.setItem(
        SYNC_BASELINE_KEY,
        JSON.stringify(baseline)
    );
}


// Load the last successful sync baseline for this user.
// Returns null when there is none (first sync, other user,
// or unreadable data), which keeps the safe union behavior.
export function loadSyncBaseline(
    userId: string
): SyncBaseline | null {
    const stored =
        localStorage.getItem(SYNC_BASELINE_KEY);

    if (!stored) {
        return null;
    }

    try {
        const baseline =
            JSON.parse(stored) as Partial<SyncBaseline>;

        if (baseline.userId !== userId) {
            return null;
        }

        // 10/09/2026 — Backwards compatibility for older baselines.
        return {
            userId: baseline.userId,
            syncedAt: baseline.syncedAt ?? "",
            tasks: baseline.tasks ?? [],
            pages: baseline.pages ?? [],
            blocks: baseline.blocks ?? [],
            notebooks: baseline.notebooks ?? [],
            notebookFolders: baseline.notebookFolders ?? [],
            journeys: baseline.journeys ?? [],
            journeyFolders: baseline.journeyFolders ?? [],
            invoices: baseline.invoices ?? [],
        };
    } catch {
        return null;
    }
}


// 10/06/2026: Use the baseline passed in options. If none was passed
// (undefined), load the saved one. An explicit null means "no baseline".
function resolveBaseline(
    userId: string,
    options: ReconcileOptions
): SyncBaseline | null {
    if (options.baseline !== undefined) {
        return options.baseline;
    }

    return loadSyncBaseline(userId);
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


// 10/09/2026 — One generic reconcile for every collection (journeys pass
// journeyId as the key). Rules:
//   - On both sides: newest updatedAt wins.
//   - On one side only AND in the baseline: it was synced before, so the
//     other side deleted it. Drop it.
//   - On one side only and NOT in the baseline: it is new. Keep it.
// Deleted on one side but edited on the other: the deletion wins.
function reconcileCollection<T extends { updatedAt?: string }>(
    localItems: T[],
    cloudItems: T[],
    baselineIds: string[] = [],
    getId: (item: T) => string
): T[] {
    const baselineIdSet = new Set(baselineIds);

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

        // Missing from exactly one side.
        if (baselineIdSet.has(id)) {
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
    options: ReconcileOptions = {}
): Snapshot
{
    const baseline =
        resolveBaseline(
            localSnapshot.userId,
            options
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
                baseline?.tasks,
                byId
            ),

        pages:
            reconcileCollection(
                localSnapshot.pages,
                cloudSnapshot.pages,
                baseline?.pages,
                byId
            ),

        blocks:
            reconcileCollection(
                localSnapshot.blocks,
                cloudSnapshot.blocks,
                baseline?.blocks,
                byId
            ),

        notebooks:
            reconcileCollection(
                localSnapshot.notebooks,
                cloudSnapshot.notebooks,
                baseline?.notebooks,
                byId
            ),

        notebookFolders:
            reconcileCollection(
                localSnapshot.notebookFolders,
                cloudSnapshot.notebookFolders,
                baseline?.notebookFolders,
                byId
            ),

        journeys:
            reconcileCollection(
                localSnapshot.journeys,
                cloudSnapshot.journeys,
                baseline?.journeys,
                byJourneyId
            ),

        journeyFolders:
            reconcileCollection(
                localSnapshot.journeyFolders,
                cloudSnapshot.journeyFolders,
                baseline?.journeyFolders,
                byId
            ),

        // 10/09/2026 — `?? []` so older Snapshots without invoices are safe.
        invoices:
            reconcileCollection(
                localSnapshot.invoices ?? [],
                cloudSnapshot.invoices ?? [],
                baseline?.invoices,
                byId
            ),

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
// It reconciles the resolved Snapshot against what is currently in local
// storage using the same baseline, so deleted items are not added back.
export async function restoreSnapshotToLocalStorage(
    snapshot: Snapshot,
    options: ReconcileOptions = {}
): Promise<Snapshot>
{
    const baseline =
        resolveBaseline(
            snapshot.userId,
            options
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
            baseline?.tasks,
            byId
        );

    const restoredNotebookFolders =
        reconcileCollection(
            currentNotebookFolders,
            snapshot.notebookFolders,
            baseline?.notebookFolders,
            byId
        );

    const restoredNotebooks =
        reconcileCollection(
            currentNotebooks,
            snapshot.notebooks,
            baseline?.notebooks,
            byId
        );

    const restoredJourneyFolders =
        reconcileCollection(
            currentJourneyFolders,
            snapshot.journeyFolders,
            baseline?.journeyFolders,
            byId
        );

    const restoredJourneys =
        reconcileCollection(
            currentJourneys,
            snapshot.journeys,
            baseline?.journeys,
            byJourneyId
        );

    const restoredPages =
        reconcileCollection(
            currentPages,
            snapshot.pages,
            baseline?.pages,
            byId
        );

    const restoredBlocks =
        reconcileCollection(
            currentBlocks,
            snapshot.blocks,
            baseline?.blocks,
            byId
        );

    const restoredInvoices =
        reconcileCollection(
            currentInvoices,
            snapshot.invoices ?? [],
            baseline?.invoices,
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