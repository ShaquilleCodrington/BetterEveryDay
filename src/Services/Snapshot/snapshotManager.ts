import {
    loadCurrentSnapshot,
    updateCurrentSnapshot,
    saveCurrentSnapshot,
    type Snapshot,
    createSnapshot,
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



// 2026-08-25 — Rebuild the current Snapshot from the latest local state, save it locally, and hand it to the Sync Manager.
export async function processCurrentSnapshot(userId?: string): Promise<Snapshot | null>
{
    const currentSnapshot = loadCurrentSnapshot();

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
    cloudItems: T[]
): T[] {
    const resolvedItems: T[] = [];

    const allIds = new Set([
        ...localItems.map(item => item.id),
        ...cloudItems.map(item => item.id),
    ]);

    for (const id of allIds) {
        const localItem = localItems.find(
            item => item.id === id
        );

        const cloudItem = cloudItems.find(
            item => item.id === id
        );

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

        if (
            localItem.updatedAt >= cloudItem.updatedAt
        ) {
            resolvedItems.push(localItem);
        } else {
            resolvedItems.push(cloudItem);
        }
    }

    return resolvedItems;
}
function reconcileJourneyCollection(
    localJourneys: Snapshot["journeys"],
    cloudJourneys: Snapshot["journeys"]
): Snapshot["journeys"] {
    const resolvedJourneys: Snapshot["journeys"] = [];

    const allIds = new Set([
        ...localJourneys.map(
            journey => journey.journeyId
        ),
        ...cloudJourneys.map(
            journey => journey.journeyId
        ),
    ]);

    for (const journeyId of allIds) {
        const localJourney = localJourneys.find(
            journey =>
                journey.journeyId === journeyId
        );

        const cloudJourney = cloudJourneys.find(
            journey =>
                journey.journeyId === journeyId
        );

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
export function reconcileSnapshots(
    localSnapshot: Snapshot,
    cloudSnapshot: Snapshot
): Snapshot
{
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

        tasks:
            reconcileCollection(
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

        notebooks:
            reconcileCollection(
                localSnapshot.notebooks,
                cloudSnapshot.notebooks
            ),

        notebookFolders:
            reconcileCollection(
                localSnapshot.notebookFolders,
                cloudSnapshot.notebookFolders
            ),

        journeys:
            reconcileJourneyCollection(
                localSnapshot.journeys,
                cloudSnapshot.journeys
            ),

        journeyFolders:
            reconcileCollection(
                localSnapshot.journeyFolders,
                cloudSnapshot.journeyFolders
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
export async function restoreSnapshotToLocalStorage(
    snapshot: Snapshot
): Promise<Snapshot>
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
export async function reconcileAndRestoreSnapshot(
    localSnapshot: Snapshot,
    cloudSnapshot: Snapshot
): Promise<Snapshot>
{
    const resolvedSnapshot =
        reconcileSnapshots(
            localSnapshot,
            cloudSnapshot
        );

    saveCurrentSnapshot(
        resolvedSnapshot
    );

    const restoredSnapshot =
        await restoreSnapshotToLocalStorage(
            resolvedSnapshot
        );

    return restoredSnapshot;
}