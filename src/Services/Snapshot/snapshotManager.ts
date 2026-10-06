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

const SYNC_BASELINE_KEY = "lastSyncedIds";

// Mass-deletion safeguard, new rule (replaces the old 50% rule).
//
// If a sync would leave a collection with LESS than 20% of its
// baseline items, the deletions for that collection are rejected
// and everything is kept (the original safe union).
//
// Collections with fewer than MIN_ITEMS_FOR_GUARD baseline items
// are exempt, so users can always delete freely from small lists.
const MIN_REMAINING_RATIO = 0.2;
const MIN_ITEMS_FOR_GUARD = 5;

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
}

export interface ReconcileOptions {
    // Defaults to the baseline saved by the last
    // successful sync. Pass null to force the safe union.
    baseline?: SyncBaseline | null;

    // Skip the mass-deletion safeguard. Use only after
    // the user has explicitly confirmed a large delete.
    allowMassDelete?: boolean;
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
            JSON.parse(stored) as SyncBaseline;

        if (baseline.userId !== userId) {
            return null;
        }

        return baseline;
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

// 10/06/2026: The new safeguard check, shared by both reconcile functions.
// True when the sync would leave less than 20% of the baseline items.
function isMassDelete(
    baselineCount: number,
    deletedCount: number,
    allowMassDelete: boolean
): boolean {
    if (allowMassDelete) {
        return false;
    }

    // Under 5 items the rule is not used.
    if (baselineCount < MIN_ITEMS_FOR_GUARD) {
        return false;
    }

    const remainingRatio =
        (baselineCount - deletedCount) / baselineCount;

    return remainingRatio < MIN_REMAINING_RATIO;
}


// 2026-08-25 — Rebuild the current Snapshot from the latest local state, save it locally, and hand it to the Sync Manager.
export async function processCurrentSnapshot(userId?: string): Promise<Snapshot | null>
{
    let currentSnapshot = loadCurrentSnapshot();

    if (!currentSnapshot) 
        {if (!userId) {
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
    return  processCurrentSnapshot(userId);
}


// 2026-08-23 — Capture the latest local state when the application is closing and signal the Sync Manager.
export async function applicationClosing(userId: string):Promise<Snapshot | null>
 {
    return processCurrentSnapshot(userId);
}

function reconcileCollection<T extends { id: string; updatedAt: string }>(
    localItems: T[],
    cloudItems: T[],
    baselineIds: string[] = [],
    allowMassDelete = false
): T[] {
    const baselineIdSet = new Set(baselineIds);

    const allIds = new Set([
        ...localItems.map(item => item.id),
        ...cloudItems.map(item => item.id),
    ]);

    const deletedIds = new Set<string>();

    for (const id of baselineIdSet) {
        const localItem = localItems.find(
            item => item.id === id
        );

        const cloudItem = cloudItems.find(
            item => item.id === id
        );

        const deletedLocally = !localItem && cloudItem;
        const deletedInCloud = localItem && !cloudItem;

        if (deletedLocally || deletedInCloud) {
            deletedIds.add(id);
        }
    }

    // 10/06/2026: Was a 50% deletion ratio. Now: reject if under 20% would remain.
   const massDeleteDetected =
        isMassDelete(
            baselineIds.length,
            deletedIds.size,
            allowMassDelete
        );

    const resolvedItems: T[] = [];

    for (const id of allIds) {
        const localItem = localItems.find(
            item => item.id === id
        );

        const cloudItem = cloudItems.find(
            item => item.id === id
        );

        /*
         * If this is a previously synced item and it disappeared
         * from one side, treat it as a deletion.
         *
         * Unless the mass-delete safeguard triggered.
         */
        if (!massDeleteDetected && deletedIds.has(id)) {
            continue;
        }

        if (!localItem && cloudItem) {
            resolvedItems.push(cloudItem);
            continue;
        }

        if (localItem && !cloudItem) {
            resolvedItems.push(localItem);
            continue;
        }

        if (!localItem || !cloudItem) {
            continue;
        }

        if (localItem.updatedAt >= cloudItem.updatedAt) {
            resolvedItems.push(localItem);
        } else {
            resolvedItems.push(cloudItem);
        }
    }

    return resolvedItems;
}
function reconcileJourneyCollection(
    localJourneys: Snapshot["journeys"],
    cloudJourneys: Snapshot["journeys"],
    baselineIds: string[] = [],
    allowMassDelete = false
): Snapshot["journeys"] {
    const baselineIdSet = new Set(baselineIds);

    const allIds = new Set([
        ...localJourneys.map(
            journey => journey.journeyId
        ),
        ...cloudJourneys.map(
            journey => journey.journeyId
        ),
    ]);

    const deletedIds = new Set<string>();

    for (const journeyId of baselineIdSet) {
        const localJourney = localJourneys.find(
            journey =>
                journey.journeyId === journeyId
        );

        const cloudJourney = cloudJourneys.find(
            journey =>
                journey.journeyId === journeyId
        );

        const deletedLocally =
            !localJourney && cloudJourney;

        const deletedInCloud =
            localJourney && !cloudJourney;

        if (deletedLocally || deletedInCloud) {
            deletedIds.add(journeyId);
        }
    }
 // 10/06/2026: Was a 50% deletion ratio. Now: reject if under 20% would remain.
    const massDeleteDetected =
        isMassDelete(
            baselineIds.length,
            deletedIds.size,
            allowMassDelete
        );
    const resolvedJourneys: Snapshot["journeys"] = [];

    for (const journeyId of allIds) {
        const localJourney = localJourneys.find(
            journey =>
                journey.journeyId === journeyId
        );

        const cloudJourney = cloudJourneys.find(
            journey =>
                journey.journeyId === journeyId
        );

        if (!massDeleteDetected && deletedIds.has(journeyId)) {
            continue;
        }

        if (!localJourney && cloudJourney) {
            resolvedJourneys.push(cloudJourney);
            continue;
        }

        if (localJourney && !cloudJourney) {
            resolvedJourneys.push(localJourney);
            continue;
        }

        if (!localJourney || !cloudJourney) {
            continue;
        }

        if (
            localJourney.updatedAt >=
            cloudJourney.updatedAt
        ) {
            resolvedJourneys.push(localJourney);
        } else {
            resolvedJourneys.push(cloudJourney);
        }
    }

    return resolvedJourneys;
}


// 2026-08-25 — Compare the current local Snapshot against
// the Snapshot retrieved from the cloud and produce the
// resolved Snapshot.
//
// This function performs reconciliation only.
// It does not communicate with Firebase.
//
// 10/06/2026: Now takes options and passes the sync baseline into every
// collection, so deletions are detected instead of always merging.
export function reconcileSnapshots(
    localSnapshot: Snapshot,
    cloudSnapshot: Snapshot,
    options: ReconcileOptions = {}
): Snapshot
{
    // 10/06/2026: Baseline + safeguard override for this reconcile.
    const baseline =
        resolveBaseline(
            localSnapshot.userId,
            options
        );

    const allowMassDelete =
        options.allowMassDelete ?? false;

    const resolvedProfile =
    localSnapshot.profileUpdatedAt >=
    cloudSnapshot.profileUpdatedAt
        ? localSnapshot.profile
        : cloudSnapshot.profile;

const resolvedProfileUpdatedAt =
    localSnapshot.profileUpdatedAt >=
    cloudSnapshot.profileUpdatedAt
        ? localSnapshot.profileUpdatedAt
        : cloudSnapshot.profileUpdatedAt;

    const resolvedSnapshot: Snapshot = {
        ...localSnapshot,

    

        userId:
            localSnapshot.userId,

         profile:
        resolvedProfile,

    profileUpdatedAt:
        resolvedProfileUpdatedAt,

        // 10/06/2026: baseline IDs + allowMassDelete added to each collection below.
        tasks:
            reconcileCollection(
                localSnapshot.tasks,
                cloudSnapshot.tasks,
                baseline?.tasks,
                allowMassDelete
            ),

        pages:
            reconcileCollection(
                localSnapshot.pages,
                cloudSnapshot.pages,
                baseline?.pages,
                allowMassDelete
            ),

        blocks:
            reconcileCollection(
                localSnapshot.blocks,
                cloudSnapshot.blocks,
                baseline?.blocks,
                allowMassDelete
            ),

        notebooks:
            reconcileCollection(
                localSnapshot.notebooks,
                cloudSnapshot.notebooks,
                baseline?.notebooks,
                allowMassDelete
            ),

        notebookFolders:
            reconcileCollection(
                localSnapshot.notebookFolders,
                cloudSnapshot.notebookFolders,
                baseline?.notebookFolders,
                allowMassDelete
            ),

        journeys:
            reconcileJourneyCollection(
                localSnapshot.journeys,
                cloudSnapshot.journeys,
                baseline?.journeys,
                allowMassDelete
            ),

        journeyFolders:
            reconcileCollection(
                localSnapshot.journeyFolders,
                cloudSnapshot.journeyFolders,
                baseline?.journeyFolders,
                allowMassDelete
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
// 10/06/2026: Now takes options and uses the baseline when merging into
// local storage. Before, this step was a plain union, so anything the
// reconcile step deleted was added straight back from local storage.
export async function restoreSnapshotToLocalStorage(
    snapshot: Snapshot,
    options: ReconcileOptions = {}
): Promise<Snapshot>
{
    // 10/06/2026: Same baseline + safeguard override as the reconcile step.
    const baseline =
        resolveBaseline(
            snapshot.userId,
            options
        );

    const allowMassDelete =
        options.allowMassDelete ?? false;

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


    // 10/06/2026: baseline IDs + allowMassDelete added to each collection below.
    const restoredTasks =
        reconcileCollection(
            currentTasks,
            snapshot.tasks,
            baseline?.tasks,
            allowMassDelete
        );

    const restoredNotebookFolders =
        reconcileCollection(
            currentNotebookFolders,
            snapshot.notebookFolders,
            baseline?.notebookFolders,
            allowMassDelete
        );

    const restoredNotebooks =
        reconcileCollection(
            currentNotebooks,
            snapshot.notebooks,
            baseline?.notebooks,
            allowMassDelete
        );

    const restoredJourneyFolders =
        reconcileCollection(
            currentJourneyFolders,
            snapshot.journeyFolders,
            baseline?.journeyFolders,
            allowMassDelete
        );

    const restoredJourneys =
        reconcileJourneyCollection(
            currentJourneys,
            snapshot.journeys,
            baseline?.journeys,
            allowMassDelete
        );

    const restoredPages =
        reconcileCollection(
            currentPages,
            snapshot.pages,
            baseline?.pages,
            allowMassDelete
        );

    const restoredBlocks =
        reconcileCollection(
            currentBlocks,
            snapshot.blocks,
            baseline?.blocks,
            allowMassDelete
        );


    await saveProfile(snapshot.profile
    );

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

    
    const restoredSnapshot: Snapshot = {
        ...snapshot,

        tasks:
            restoredTasks,

          profile: snapshot.profile,

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
//
// 10/06/2026: Options are passed through to both steps.
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