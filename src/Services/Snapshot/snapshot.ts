import type  { Task }  from "../../Data/tasks";
import { loadTasks } from "../../Data/taskStorage";
import type { Notebook, NotebookFolder, 
        Page, Block,
 } from "../../Features/notes/types";
import {
    loadNotebooks,loadNotebookFolders,
    loadPages,loadBlocks,
 } from "../../Features/notes/storage/notebookStorage";

import type {
    Journey, JourneyFolder,
} from "../../Features/journey/types";

import {
    loadJourneys, loadJourneyFolders,
} from "../../Features/journey/Storage/journeyStorage";
import type { ProfileData } from "../../Data/profileStorage";
import { getProfile } from "../../Data/profileStorage";


// 2026-08-23 — Define the local storage key for the latest winning Snapshot.
const CURRENT_SNAPSHOT_KEY = "currentSnapshot";

export interface Snapshot {
    userId: string;

    profile: ProfileData;
    profileUpdatedAt: string;

    tasks: Task[];

    pages: Page[];
    blocks: Block[];


    notebooks: Notebook[];
    notebookFolders: NotebookFolder[];

    journeys: Journey[];
    journeyFolders: JourneyFolder[];

    createdAt: string;
    updatedAt: string;
}

export async function createSnapshot(
    userId: string
): Promise<Snapshot>
{

    const profile = await getProfile();

    const allTasks =
        loadTasks();

    const allNotebooks =
        loadNotebooks();

    const allNotebookFolders =
        loadNotebookFolders();

    const allPages =
        loadPages();

    const allBlocks =
        loadBlocks();

    const allJourneys =
        loadJourneys();

    const allJourneyFolders =
        loadJourneyFolders();


    const tasks =
        allTasks.filter(
            (task) =>
                task.userId === userId
        );


    const notebooks =
        allNotebooks.filter(
            (notebook) =>
                notebook.userId === userId
        );


    const notebookFolders =
        allNotebookFolders.filter(
            (folder) =>
                folder.userId === userId
        );


    
    const ownedNotebookIds =
        new Set(
            notebooks.map(
                (notebook) =>
                    notebook.id
            )
        );


    const pages =
        allPages.filter(
            (page) =>
                ownedNotebookIds.has(
                    page.notebookId
                )
        );


    
    const ownedPageIds =
        new Set(
            pages.map(
                (page) =>
                    page.id
            )
        );


    const blocks =
        allBlocks.filter(
            (block) =>
                ownedPageIds.has(
                    block.pageId
                )
        );


    const journeys =
        allJourneys.filter(
            (journey) =>
                journey.userId === userId
        );


    const journeyFolders =
        allJourneyFolders.filter(
            (folder) =>
                folder.userId === userId
        );


    const now =
        new Date().toISOString();


    return {
        userId,
        profile,
        profileUpdatedAt: now,
        tasks,

        notebookFolders,
        notebooks,
        pages,
        blocks,

        journeyFolders,
        journeys,

        createdAt: now,
        updatedAt: now,
    };
}


// 2026-08-23 — Load the latest winning Snapshot used as the local comparison baseline.
export function loadCurrentSnapshot(): Snapshot | null {
    
    const storedSnapshot =
        localStorage.getItem(CURRENT_SNAPSHOT_KEY);

    if (!storedSnapshot) {
        return null;
    }
 try
    {
        return JSON.parse(
            storedSnapshot
        ) as Snapshot;
    }
    catch
    {
        return null;
    }
}

// 2026-08-23 — Persist the Snapshot that most recently won comparison.
export function saveCurrentSnapshot(
    snapshot: Snapshot
): void {
    localStorage.setItem(
        CURRENT_SNAPSHOT_KEY,
        JSON.stringify(snapshot)
    );
}

export async function updateProfileSnapshot(
    snapshot: Snapshot
): Promise<Snapshot> {
    const currentProfile = await getProfile();

    const changed =
        currentProfile.uid !== snapshot.profile.uid ||
        currentProfile.name !== snapshot.profile.name ||
        currentProfile.primaryTitle !== snapshot.profile.primaryTitle ||
        currentProfile.bio !== snapshot.profile.bio ||
        currentProfile.photo !== snapshot.profile.photo ||
        currentProfile.titles.length !== snapshot.profile.titles.length ||
        currentProfile.titles.some(
            (title, index) =>
                title !== snapshot.profile.titles[index]
        );

    if (!changed) {
        return snapshot;
    }

    const now =
        new Date().toISOString();

    return {
        ...snapshot,

        profile:
            currentProfile,

        profileUpdatedAt:
            now,

        updatedAt:
            now,
    };
}
export function updateTaskSnapshot(
    snapshot: Snapshot
): Snapshot {
    const currentTasks = loadTasks().filter(
        task => task.userId === snapshot.userId
    );

    const changed =
        currentTasks.length !== snapshot.tasks.length ||
        currentTasks.some(currentTask => 
            {
            const snapshotTask = snapshot.tasks.find(
                task => task.id === currentTask.id
            );

            return (
                !snapshotTask ||
                currentTask.updatedAt !== snapshotTask.updatedAt
            );
        });

    if (!changed) {
        return snapshot;
    }

    return {
        ...snapshot,
        tasks: currentTasks,
        updatedAt: new Date().toISOString(),
    };
}
// 2026-08-24 — Compare locally stored Pages belonging to user-owned Notebooks.
export function updatePageSnapshot(
    snapshot: Snapshot
): Snapshot
{
    const allNotebooks =
        loadNotebooks();

    const ownedNotebookIds =
        new Set(
            allNotebooks
                .filter(
                    (notebook) =>
                        notebook.userId ===
                        snapshot.userId
                )
                .map(
                    (notebook) =>
                        notebook.id
                )
        );


    const currentPages =
        loadPages().filter(
            (page) =>
                ownedNotebookIds.has(
                    page.notebookId
                )
        );


    const changed =
        currentPages.length !==
            snapshot.pages.length ||
        currentPages.some(
            (currentPage) =>
            {
                const snapshotPage =
                    snapshot.pages.find(
                        (page) =>
                            page.id ===
                            currentPage.id
                    );


                return (
                    !snapshotPage ||
                    currentPage.updatedAt !==
                        snapshotPage.updatedAt
                );
            }
        );


    if (!changed)
    {
        return snapshot;
    }


    return {
        ...snapshot,

        pages:
            currentPages,

        updatedAt:
            new Date().toISOString(),
    };
}


// 2026-08-24 — Compare locally stored Blocks belonging to user-owned Pages.
export function updateBlockSnapshot(
    snapshot: Snapshot
): Snapshot
{
    const ownedPageIds =
        new Set(
            snapshot.pages.map(
                (page) =>
                    page.id
            )
        );


    const currentBlocks =
        loadBlocks().filter(
            (block) =>
                ownedPageIds.has(
                    block.pageId
                )
        );


    const changed =
        currentBlocks.length !==
            snapshot.blocks.length ||
        currentBlocks.some(
            (currentBlock) =>
            {
                const snapshotBlock =
                    snapshot.blocks.find(
                        (block) =>
                            block.id ===
                            currentBlock.id
                    );


                return (
                    !snapshotBlock ||
                    currentBlock.updatedAt !==
                        snapshotBlock.updatedAt
                );
            }
        );


    if (!changed)
    {
        return snapshot;
    }


    return {
        ...snapshot,

        blocks:
            currentBlocks,

        updatedAt:
            new Date().toISOString(),
    };
}



export function updateNotebookSnapshot(
    snapshot: Snapshot
): Snapshot {
    const currentNotebooks = loadNotebooks().filter(
        notebook => notebook.userId === snapshot.userId
    );

    const changed =
        currentNotebooks.length !== snapshot.notebooks.length ||
        currentNotebooks.some(currentNotebook => {
            const snapshotNotebook =
                snapshot.notebooks.find(
                    notebook =>
                        notebook.id === currentNotebook.id
                );

            return (
                !snapshotNotebook ||
                currentNotebook.updatedAt !==
                    snapshotNotebook.updatedAt
            );
        });

    if (!changed) {
        return snapshot;
    }

    return {
        ...snapshot,
        notebooks: currentNotebooks,
        updatedAt: new Date().toISOString(),
    };
}

export function updateJourneySnapshot(
    snapshot: Snapshot
): Snapshot {
    const currentJourneys = loadJourneys().filter(
        journey => journey.userId === snapshot.userId
    );

    const changed =
        currentJourneys.length !== snapshot.journeys.length ||
        currentJourneys.some(currentJourney => {
            const snapshotJourney =
                snapshot.journeys.find(
                    journey =>
                        journey.journeyId === currentJourney.journeyId
                );

            return (
                !snapshotJourney ||
                currentJourney.updatedAt !==
                    snapshotJourney.updatedAt
            );
        });

    if (!changed) {
        return snapshot;
    }

    return {
        ...snapshot,
        journeys: currentJourneys,
        updatedAt: new Date().toISOString(),
    };
}

export function updateNotebookFolderSnapshot(
    snapshot: Snapshot
): Snapshot {
    const currentNotebookFolders = loadNotebookFolders().filter(
        folder => folder.userId === snapshot.userId
    );

    const changed =
        currentNotebookFolders.length !== snapshot.notebookFolders.length ||
        currentNotebookFolders.some(currentFolder => {
            const snapshotFolder =
                snapshot.notebookFolders.find(
                    folder => folder.id === currentFolder.id
                );

            return (
                !snapshotFolder ||
                currentFolder.updatedAt !== snapshotFolder.updatedAt
            );
        });

    if (!changed) {
        return snapshot;
    }

    return {
        ...snapshot,
        notebookFolders: currentNotebookFolders,
        updatedAt: new Date().toISOString(),
    };
}


// 2026-08-23 — Compare current user-owned Journey Folders against the Snapshot and replace the collection when changes are detected.
export function updateJourneyFolderSnapshot(
    snapshot: Snapshot
): Snapshot {
    const currentJourneyFolders = loadJourneyFolders().filter(
        folder => folder.userId === snapshot.userId
    );

    const changed =
        currentJourneyFolders.length !== snapshot.journeyFolders.length ||
        currentJourneyFolders.some(currentFolder => {
            const snapshotFolder =
                snapshot.journeyFolders.find(
                    folder => folder.id === currentFolder.id
                );

            return (
                !snapshotFolder ||
                currentFolder.updatedAt !== snapshotFolder.updatedAt
            );
        });

    if (!changed) {
        return snapshot;
    }

    return {
        ...snapshot,
        journeyFolders: currentJourneyFolders,
        updatedAt: new Date().toISOString(),
    };
}

// 2026-08-23 — Compare all local objects against the current Snapshot and produce the newest Snapshot state.
export async function updateCurrentSnapshot(
    snapshot: Snapshot
): Promise<Snapshot> {
    let updatedSnapshot = snapshot;

     updatedSnapshot =
        await updateProfileSnapshot(updatedSnapshot);
    // Independent user-owned collection.
    updatedSnapshot =
        updateTaskSnapshot(updatedSnapshot);

    // Parent collection.
    updatedSnapshot =
        updateNotebookSnapshot(updatedSnapshot);

    // Independent user-owned collection.
    updatedSnapshot =
        updateNotebookFolderSnapshot(updatedSnapshot);

    // Pages depend on the current Notebook collection.
    updatedSnapshot =
        updatePageSnapshot(updatedSnapshot);

    // Blocks depend on the current Page collection.
    updatedSnapshot =
        updateBlockSnapshot(updatedSnapshot);

    // Journey hierarchy.
    updatedSnapshot =
        updateJourneySnapshot(updatedSnapshot);

    updatedSnapshot =
        updateJourneyFolderSnapshot(updatedSnapshot);

    return updatedSnapshot;
}