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
import {
    type ProfileData,
    getProfile,
    normalizeProfile,
} from "../../Data/profileStorage";

// 10/09/2026 — Invoices are now part of the Snapshot. Adjust these two paths to match your folders.
import type { InvoiceData } from "../../Features/invoice/types";
import { getInvoices } from "../../Features/invoice/invoiceStorage";

// 2026-08-23 — Define the local storage key for the latest winning Snapshot.
const CURRENT_SNAPSHOT_KEY = "currentSnapshot";

// ★★★★★ CHANGED 10/25/2026 ★★★★★ — NEW: permanent deletion record.
// Each collection maps an item's ID to the ISO time it was deleted.
// Journeys use journeyId as the key.
export interface DeletedItems {
    tasks: Record<string, string>;
    pages: Record<string, string>;
    blocks: Record<string, string>;
    notebooks: Record<string, string>;
    notebookFolders: Record<string, string>;
    journeys: Record<string, string>;
    journeyFolders: Record<string, string>;
    invoices: Record<string, string>;
}

export type DeletedCollection = keyof DeletedItems;

// ★★★★★ CHANGED 10/25/2026 ★★★★★ — NEW: how long a deletion record is kept.
// After this many days no snapshot on any device should still hold the
// item, so the record is dropped. Raise it if a device sits unused longer.
export const DELETED_RETENTION_DAYS = 15;

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

    // 10/09/2026 — Added. Snapshots created before this field existed
    // won't have it; normalizeSnapshot() fills in [] for them.
    invoices: InvoiceData[];
    deleted: DeletedItems;

    createdAt: string;
    updatedAt: string;
}

export function emptyDeleted(): DeletedItems {
    return {
        tasks: {},
        pages: {},
        blocks: {},
        notebooks: {},
        notebookFolders: {},
        journeys: {},
        journeyFolders: {},
        invoices: {},
    };
}

// Fills in any missing collection and copies the records.
export function normalizeDeleted(
    deleted?: Partial<DeletedItems> | null
): DeletedItems {
    return {
        tasks: { ...(deleted?.tasks ?? {}) },
        pages: { ...(deleted?.pages ?? {}) },
        blocks: { ...(deleted?.blocks ?? {}) },
        notebooks: { ...(deleted?.notebooks ?? {}) },
        notebookFolders: { ...(deleted?.notebookFolders ?? {}) },
        journeys: { ...(deleted?.journeys ?? {}) },
        journeyFolders: { ...(deleted?.journeyFolders ?? {}) },
        invoices: { ...(deleted?.invoices ?? {}) },
    };
}
// Union of two deletion records. A deletion known to either side is kept.
export function mergeDeleted(
    first?: Partial<DeletedItems> | null,
    second?: Partial<DeletedItems> | null
): DeletedItems {
    const merged = normalizeDeleted(first);
    const other = normalizeDeleted(second);

    for (const key of Object.keys(merged) as DeletedCollection[]) {
        for (const [id, deletedAt] of Object.entries(other[key])) {
            const existing = merged[key][id];

            if (existing === undefined || deletedAt < existing) {
                merged[key][id] = deletedAt;
            }
        }
    }

    return merged;
}

// Drops deletion records older than DELETED_RETENTION_DAYS.
export function pruneDeleted(
    deleted?: Partial<DeletedItems> | null
): DeletedItems {
    const result = normalizeDeleted(deleted);

    const cutoff =
        Date.now() - DELETED_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const key of Object.keys(result) as DeletedCollection[]) {
        for (const [id, deletedAt] of Object.entries(result[key])) {
            // An unreadable date is kept rather than guessed at.
            if (Date.parse(deletedAt) < cutoff) {
                delete result[key][id];
            }
        }
    }

    return result;
}

// Compares the Snapshot from before an update with the one after it.
// Anything that was there before and is gone now was deleted: record it.
function recordDeletions(
    before: Snapshot,
    after: Snapshot
): DeletedItems {
    const now = new Date().toISOString();
    const result = normalizeDeleted(after.deleted);

    function mark<T>(
        collection: DeletedCollection,
        beforeItems: T[],
        afterItems: T[],
        getId: (item: T) => string
    ): void {
        const afterIds = new Set(afterItems.map(getId));

        for (const item of beforeItems) {
            const id = getId(item);

            if (
                !afterIds.has(id) &&
                result[collection][id] === undefined
            ) {
                result[collection][id] = now;
            }
        }
    }

    mark("tasks", before.tasks ?? [], after.tasks ?? [], item => item.id);
    mark("pages", before.pages ?? [], after.pages ?? [], item => item.id);
    mark("blocks", before.blocks ?? [], after.blocks ?? [], item => item.id);
    mark("notebooks", before.notebooks ?? [], after.notebooks ?? [], item => item.id);
    mark("notebookFolders", before.notebookFolders ?? [], after.notebookFolders ?? [], item => item.id);
    mark("journeys", before.journeys ?? [], after.journeys ?? [], item => item.journeyId);
    mark("journeyFolders", before.journeyFolders ?? [], after.journeyFolders ?? [], item => item.id);
    mark("invoices", before.invoices ?? [], after.invoices ?? [], item => item.id);

    return result;
}


export async function createSnapshot(
    userId: string
): Promise<Snapshot>
{
    const storedProfile =
        await getProfile();

    const profile =
        normalizeProfile(
            storedProfile,
            userId
        );

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

    // 10/09/2026 — Invoices aren't filtered by userId because the stored
    // InvoiceData shown to me has no userId. If it has one, filter here too.
    const invoices =
        getInvoices();

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
        profileUpdatedAt: "",
        tasks,

        notebookFolders,
        notebooks,
        pages,
        blocks,

        journeyFolders,
        journeys,

        invoices,
        deleted: emptyDeleted(),


        createdAt: now,
        updatedAt: now,
    };
}


export function normalizeSnapshot(
    snapshot: Partial<Snapshot>,
    userId: string
): Snapshot {

    const now =
        new Date().toISOString();

    const profile =
        normalizeProfile(
            snapshot.profile,
            userId
        );

   const profileUpdatedAt =
        snapshot.profileUpdatedAt ?? "";

    return {
        ...snapshot,

        userId,

        profile,

        profileUpdatedAt,

        tasks:
            snapshot.tasks ?? [],

        pages:
            snapshot.pages ?? [],

        blocks:
            snapshot.blocks ?? [],

        notebooks:
            snapshot.notebooks ?? [],

        notebookFolders:
            snapshot.notebookFolders ?? [],

        journeys:
            snapshot.journeys ?? [],

        journeyFolders:
            snapshot.journeyFolders ?? [],

        // 10/09/2026 — Backwards compatibility: older local and cloud
        // Snapshots have no invoices field.
        invoices:
            snapshot.invoices ?? [],

        deleted:
            normalizeDeleted(
                snapshot.deleted
            ),

        createdAt:
            snapshot.createdAt ?? now,

        updatedAt:
            snapshot.updatedAt ?? now,
    } as Snapshot;
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

// ------------------------------------------------------
// Detect profile changes and update the Snapshot.
// ------------------------------------------------------
export async function updateProfileSnapshot(
    snapshot: Snapshot
): Promise<Snapshot> {

    const currentProfile =
        await getProfile();

    const normalizedCurrentProfile =
        normalizeProfile(
            currentProfile,
            snapshot.userId
        );

    const changed =
        normalizedCurrentProfile.uid !==
            snapshot.profile.uid ||

        normalizedCurrentProfile.name !==
            snapshot.profile.name ||

        normalizedCurrentProfile.primaryTitle !==
            snapshot.profile.primaryTitle ||

        normalizedCurrentProfile.bio !==
            snapshot.profile.bio ||

        normalizedCurrentProfile.photo !==
            snapshot.profile.photo ||

        normalizedCurrentProfile.titles.length !==
            snapshot.profile.titles.length ||

        normalizedCurrentProfile.titles.some(
            (title, index) =>
                title !==
                snapshot.profile.titles[index]
        );

    if (!changed) {
        return snapshot;
    }

    const now =
        new Date().toISOString();

    return {
        ...snapshot,

        profile:
            normalizedCurrentProfile,

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

// 10/09/2026 — Compare locally stored Invoices against the Snapshot.
// `?? []` keeps this safe for older Snapshots that have no invoices field.
export function updateInvoiceSnapshot(
    snapshot: Snapshot
): Snapshot {
    const snapshotInvoices =
        snapshot.invoices ?? [];

    const currentInvoices =
        getInvoices();

    const changed =
        currentInvoices.length !== snapshotInvoices.length ||
        currentInvoices.some(currentInvoice => {
            const snapshotInvoice =
                snapshotInvoices.find(
                    invoice => invoice.id === currentInvoice.id
                );

            return (
                !snapshotInvoice ||
                currentInvoice.updatedAt !==
                    snapshotInvoice.updatedAt
            );
        });

    if (!changed) {
        return snapshot;
    }

    return {
        ...snapshot,
        invoices: currentInvoices,
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

    // Anything that was in the original Snapshot and is gone now was
    // deleted locally. Record it so it can never come back.
    updatedSnapshot = {
        ...updatedSnapshot,
        deleted: recordDeletions(snapshot, updatedSnapshot),
    };

    return updatedSnapshot;
}