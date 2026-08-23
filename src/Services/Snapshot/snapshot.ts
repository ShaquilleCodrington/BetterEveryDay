import type  { Task }  from "../../Data/tasks";
import { loadTasks } from "../../Data/taskStorage";
import type { Notebook, NotebookFolder, } from "../../Features/notes/types";
import {
    loadNotebooks,loadNotebookFolders,
 } from "../../Features/notes/storage/notebookStorage";

import type {
    Journey, JourneyFolder,
} from "../../Features/journey/types";

import {
    loadJourneys, loadJourneyFolders,
} from "../../Features/journey/Storage/journeyStorage";


// 2026-08-23 — Define the local storage key for the latest winning Snapshot.
const CURRENT_SNAPSHOT_KEY = "currentSnapshot";

export interface Snapshot {
    userId: string;

    tasks: Task[];
    
    notebooks: Notebook[];
    notebookFolders: NotebookFolder[];

    journeys: Journey[];
    journeyFolders: JourneyFolder[];

    createdAt: string;
    updatedAt: string;
}

export function createSnapshot(userId: string): Snapshot {
    const tasks = loadTasks().filter(
        task => task.userId === userId
    );

    const notebooks = loadNotebooks().filter(
        notebook => notebook.userId === userId
    );

    const notebookFolders = loadNotebookFolders().filter(
        folder => folder.userId === userId
    );

    const journeys = loadJourneys().filter(
        journey => journey.userId === userId
    );

    const journeyFolders = loadJourneyFolders().filter(
        folder => folder.userId === userId
    );

    const now = new Date().toISOString();

    return {
        userId,
        tasks,

        notebooks,
        notebookFolders,

        journeys,
        journeyFolders,

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

    return JSON.parse(storedSnapshot);
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

export function updateTaskSnapshot(
    snapshot: Snapshot
): Snapshot {
    const currentTasks = loadTasks().filter(
        task => task.userId === snapshot.userId
    );

    const changed =
        currentTasks.length !== snapshot.tasks.length ||
        currentTasks.some(currentTask => {
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
export function updateCurrentSnapshot(
    snapshot: Snapshot
): Snapshot {
    let updatedSnapshot = snapshot;

    updatedSnapshot =
        updateTaskSnapshot(updatedSnapshot);

    updatedSnapshot =
        updateNotebookSnapshot(updatedSnapshot);

    updatedSnapshot =
        updateNotebookFolderSnapshot(updatedSnapshot);

    updatedSnapshot =
        updateJourneySnapshot(updatedSnapshot);

    updatedSnapshot =
        updateJourneyFolderSnapshot(updatedSnapshot);

    return updatedSnapshot;
}