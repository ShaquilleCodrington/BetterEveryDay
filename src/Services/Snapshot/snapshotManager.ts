import {
    loadCurrentSnapshot,
    updateCurrentSnapshot,
    saveCurrentSnapshot,
    type Snapshot,
} from "./snapshot";

import {
    loadTasks,
    saveTasks,
} from "../../Data/taskStorage";

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

import { sendSnapshot } from "../Snapshot/syncManager";


// 2026-08-25 — Rebuild the current Snapshot from the latest local state, save it locally, and hand it to the Sync Manager.
async function processCurrentSnapshot(): Promise<Snapshot | null>
{
    const currentSnapshot = loadCurrentSnapshot();

    if (!currentSnapshot) {
        return null;
    }

    const updatedSnapshot =
        updateCurrentSnapshot(currentSnapshot);
        
    updatedSnapshot.updatedAt = new Date().toISOString();

    saveCurrentSnapshot(updatedSnapshot);

    await signalSyncManager(updatedSnapshot);

    return updatedSnapshot;
}


// 2026-08-23 — Explicitly capture the latest local state and signal the Sync Manager.
export async function explicitSave(): Promise<Snapshot | null> {
    return await processCurrentSnapshot();
}


// 2026-08-23 — Capture the latest local state when the application is closing and signal the Sync Manager.
export async function applicationClosing(): Promise<Snapshot | null> {
    return await processCurrentSnapshot();
}

function reconcileCollection<T extends { id: string }>(
    localItems: T[],
    cloudItems: T[]
): T[] 
{
    const mergedItems = [...localItems];

    for (const cloudItem of cloudItems) 
        {
        const existsLocally = mergedItems.some(
            localItem => localItem.id === cloudItem.id
        );

        if (!existsLocally) {
            mergedItems.push(cloudItem);
        }
    }

    return mergedItems;
}

function reconcileJourneyCollection(
    localJourneys: Snapshot["journeys"],
    cloudJourneys: Snapshot["journeys"]
): Snapshot["journeys"] {
    const mergedJourneys = [...localJourneys];

    for (const cloudJourney of cloudJourneys) {
        const existsLocally = mergedJourneys.some(
            localJourney =>
                localJourney.journeyId === cloudJourney.journeyId
        );

        if (!existsLocally) {
            mergedJourneys.push(cloudJourney);
        }
    }

    return mergedJourneys;
}

// 2026-08-25 — Reconcile cloud data into the local Snapshot, including Pages and Blocks, and materialize a fresh Snapshot timestamp.
export function reconcileCurrentSnapshotWithCloud(
    cloudSnapshot: Snapshot
): Snapshot {
    const localSnapshot = loadCurrentSnapshot();

    if (!localSnapshot) {
        const currentSnapshot: Snapshot = {
            ...cloudSnapshot,
            updatedAt: new Date().toISOString(),
        };

        saveCurrentSnapshot(currentSnapshot);

        return currentSnapshot;
    }

    const currentSnapshot: Snapshot = {
        ...localSnapshot,

        userId: cloudSnapshot.userId,

        tasks: reconcileCollection(
            localSnapshot.tasks,
            cloudSnapshot.tasks
        ),

         pages:
            reconcileCollection(
                localSnapshot.pages,
                cloudSnapshot.pages
            ),


        blocks:
            reconcileCollection(
                localSnapshot.blocks,
                cloudSnapshot.blocks
            ),

        notebooks: reconcileCollection(
            localSnapshot.notebooks,
            cloudSnapshot.notebooks
        ),

        notebookFolders: reconcileCollection(
            localSnapshot.notebookFolders,
            cloudSnapshot.notebookFolders
        ),

        journeys: reconcileJourneyCollection(
            localSnapshot.journeys,
            cloudSnapshot.journeys
        ),

        journeyFolders: reconcileCollection(
            localSnapshot.journeyFolders,
            cloudSnapshot.journeyFolders
        ),

        updatedAt: new Date().toISOString(),
    };

    saveCurrentSnapshot(currentSnapshot);

    return currentSnapshot;
}

// 2026-08-25 — Restore Tasks, Notebooks, Folders, Pages, Blocks, and Journeys from a Snapshot into their local storage collections.
export function restoreSnapshotToLocalStorage(
    snapshot: Snapshot
): Snapshot
{
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

   

    const restoredTasks =
        reconcileCollection(
            currentTasks,
            snapshot.tasks
        );

    const restoredNotebookFolders =
        reconcileCollection(
            currentNotebookFolders,
            snapshot.notebookFolders
        );

    const restoredNotebooks =
        reconcileCollection(
            currentNotebooks,
            snapshot.notebooks
        );

    const restoredJourneyFolders =
        reconcileCollection(
            currentJourneyFolders,
            snapshot.journeyFolders
        );

    const restoredJourneys =
        reconcileJourneyCollection(
            currentJourneys,
            snapshot.journeys
        );
    
    const restoredPages =
        reconcileCollection(
            currentPages,
            snapshot.pages
        );

    const restoredBlocks =
        reconcileCollection(
            currentBlocks,
            snapshot.blocks
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

// 2026-08-23 — Reserve the scheduling entry point for future Snapshot Manager rules.
export function futureSyncRule(): void {
    // Future rules will invoke processCurrentSnapshot().
}


// 2026-08-25 — Forward a freshly materialized Snapshot to the Sync Manager so Firebase synchronization remains centralized.
async function signalSyncManager(
    snapshot: Snapshot
): Promise<void> {
    await sendSnapshot(snapshot);
}