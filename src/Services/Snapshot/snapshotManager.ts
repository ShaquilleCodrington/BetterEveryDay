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



// 2026-08-23 — Update and submit the current Snapshot whenever a Manager trigger occurs.
function processCurrentSnapshot(): Snapshot | null 
{
    const currentSnapshot = loadCurrentSnapshot();

    if (!currentSnapshot) {
        return null;
    }

    const updatedSnapshot =
        updateCurrentSnapshot(currentSnapshot);

    saveCurrentSnapshot(updatedSnapshot);

   // signalSyncManager(updatedSnapshot);

    return updatedSnapshot;
}


// 2026-08-23 — Explicitly capture the latest local state and signal the Sync Manager.
export function explicitSave(): Snapshot | null {
    return processCurrentSnapshot();
}


// 2026-08-23 — Capture the latest local state when the application is closing and signal the Sync Manager.
export function applicationClosing(): Snapshot | null {
    return processCurrentSnapshot();
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

// 2026-08-23 — Reconcile the current local Snapshot with the authenticated user's cloud Snapshot.
// Cloud objects missing locally are added to the new current Snapshot.
// A new current Snapshot is always materialized and receives a fresh updatedAt.
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

// 2026-08-23 — Restore every object contained in a Snapshot into its corresponding local storage collection.
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

    const currentPages =
        loadPages();

    const currentBlocks =
        loadBlocks();

    const currentJourneys =
        loadJourneys();

    const currentJourneyFolders =
        loadJourneyFolders();


    const restoredTasks =
        reconcileCollection(
            currentTasks,
            snapshot.tasks
        );

    const restoredNotebooks =
        reconcileCollection(
            currentNotebooks,
            snapshot.notebooks
        );

    const restoredNotebookFolders =
        reconcileCollection(
            currentNotebookFolders,
            snapshot.notebookFolders
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

    const restoredJourneys =
        reconcileJourneyCollection(
            currentJourneys,
            snapshot.journeys
        );

    const restoredJourneyFolders =
        reconcileCollection(
            currentJourneyFolders,
            snapshot.journeyFolders
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


// // 2026-08-23 — Signal the Sync Manager that a current Snapshot is ready to be considered for synchronization.
// function signalSyncManager(
//     snapshot: Snapshot
// ): void {
//     // Sync Manager will be connected here.
// }