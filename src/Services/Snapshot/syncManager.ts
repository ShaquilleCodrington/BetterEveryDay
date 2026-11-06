import {
    processCurrentSnapshot,
    reconcileSnapshots,
    restoreSnapshotToLocalStorage,
} from "./snapshotManager";

import {
    saveCurrentSnapshot,
    normalizeSnapshot,
    type Snapshot,
} from "./snapshot";

// 11/05/2026 — Feedback board sync (shared Firestore collections).
import { syncFeedback } from "./feedbackSync";

import {
    applyItems,
    getHistorySnapshot,
    missingItems,
    saveHistoryEntry,
    type DeletedMatch,
    type ItemPick,
    type RestoreItem,
} from "./syncHistory";

import {
    doc,
    getDoc,
    setDoc,
} from "firebase/firestore";

import { database } from "../firebase/config";

export interface SyncOptions {
    // 10/09/2026 — Deprecated and ignored. The mass-deletion safeguard was
    // removed. Kept optional so existing callers still compile.
    allowMassDelete?: boolean;
}

// Store each user's Continuity Snapshot
// at one predictable Firestore location.
function getSnapshotReference(
    userId: string
) {
    return doc(
        database,
        "users",
        userId,
        "continuity",
        "current"
    );
}


// Retrieve the authenticated user's
// current cloud Snapshot.
export async function receiveSnapshot(
    userId: string
): Promise<Snapshot | null> {

    const snapshotReference =
        getSnapshotReference(userId);

    const snapshotDocument =
        await getDoc(
            snapshotReference
        );

    if (!snapshotDocument.exists()) {
        return null;
    }

    const data =
        snapshotDocument.data() as Partial<Snapshot>;

    // normalizeSnapshot fills in invoices: [] for older cloud Snapshots.
    const normalizedSnapshot =
        normalizeSnapshot(
            data,
            userId
        );

    return normalizedSnapshot;
}


// Push the resolved Snapshot to Firebase.
//
// 10/06/2026: Strips undefined fields (Firestore rejects them) and logs the
// real error if the write fails, then rethrows so callers behave as before.
export async function sendSnapshot(
    snapshot: Snapshot
): Promise<void> {

    const snapshotReference =
        getSnapshotReference(
            snapshot.userId
        );

    try {
        const cleanSnapshot =
            JSON.parse(
                JSON.stringify(snapshot)
            );

        await setDoc(
            snapshotReference,
            cleanSnapshot
        );
    } catch (error) {
        console.error(
            "[sync] Failed to send snapshot to Firestore:",
            error
        );

        throw error;
    }
}

// Main synchronization orchestration for the user's personal Snapshot.
//
// Local working state is captured first.
// Cloud state is retrieved second.
//
// There are four possible states:
//
//   1. No local + no cloud  → nothing to sync
//   2. No local + cloud     → restore cloud to local
//   3. Local + no cloud     → establish cloud from local
//   4. Local + cloud        → reconcile both
//
// The resolved Snapshot is then written locally,
// materialized into application storage, and pushed
// back to Firebase.
// ★★★★★ CHANGED 10/25/2026 ★★★★★ — The sync baseline was removed.
// Deletions are recorded inside the Snapshot (the `deleted` field), merged
// from both sides, and always win during reconcile and restore.
//
// 11/05/2026 — Renamed from sync(). sync() below now runs this and then
// the feedback board sync.
async function syncPersonalSnapshot(
    userId: string,
    _options: SyncOptions = {}
): Promise<Snapshot | null> {

      // 1. Always pull cloud state first.
    const cloudSnapshot =
        await receiveSnapshot(userId);

    // 2. Capture local state.
    const localSnapshot =
        await processCurrentSnapshot(userId);

  
    // 3. Nothing exists anywhere.
    if (localSnapshot === null && cloudSnapshot === null) {
        return null;
    }

    // --------------------------------------------------
    // 4. Cloud exists but local does not.
    // --------------------------------------------------
    if (
        localSnapshot === null &&
        cloudSnapshot !== null
    ) {

        const normalizedCloudSnapshot =
            normalizeSnapshot(
                cloudSnapshot,
                userId
            );

        saveCurrentSnapshot(
            normalizedCloudSnapshot
        );

        // baseline: null = nothing local to delete, plain restore.
        const restoredSnapshot =
            await restoreSnapshotToLocalStorage(
                normalizedCloudSnapshot 
            );
        
        return restoredSnapshot;
    }

    // --------------------------------------------------
    // 5. Local exists but cloud does not.
    // --------------------------------------------------
    if (
        localSnapshot !== null &&
        cloudSnapshot === null
    ) {

        const normalizedLocalSnapshot =
            normalizeSnapshot(
                localSnapshot,
                userId
            );

        saveCurrentSnapshot(
            normalizedLocalSnapshot
        );

        // baseline: null = nothing in the cloud to compare against.
        const restoredSnapshot =
            await restoreSnapshotToLocalStorage(
                normalizedLocalSnapshot
            );

        await sendSnapshot(
            restoredSnapshot
        );

        return restoredSnapshot;
    }

    // --------------------------------------------------
    // TypeScript narrowing.
    // --------------------------------------------------
    if (
        localSnapshot === null ||
        cloudSnapshot === null
    ) {
        return null;
    }

    // --------------------------------------------------
    // 6. Both Snapshots exist. Normalize both sides.
    // --------------------------------------------------
    const normalizedLocalSnapshot =
        normalizeSnapshot(
            localSnapshot,
            userId
        );

    const normalizedCloudSnapshot =
        normalizeSnapshot(
            cloudSnapshot,
            userId
        );

    // --------------------------------------------------
    // 7. Reconcile local and cloud using the baseline.
    // --------------------------------------------------
    const resolvedSnapshot =
        reconcileSnapshots(
            normalizedLocalSnapshot,
            normalizedCloudSnapshot
        );

    // --------------------------------------------------
    // 8. Save resolved Snapshot locally.
    // --------------------------------------------------
    saveCurrentSnapshot(
        resolvedSnapshot
    );

    // --------------------------------------------------
    // 9. Materialize resolved state into application storage.
    // --------------------------------------------------
    const restoredSnapshot =
        await restoreSnapshotToLocalStorage(
            resolvedSnapshot
        );

    await saveHistoryEntry(
        normalizedCloudSnapshot
    );

    // --------------------------------------------------
    // 10. Push exactly the resolved state to Firebase.
    // --------------------------------------------------
    await sendSnapshot(
        restoredSnapshot
    );

    // --------------------------------------------------
    // 11. Return final state.
    // --------------------------------------------------
    return restoredSnapshot;
}


// 11/05/2026 — Full sync: the personal Snapshot first, then the shared
// feedback board. A feedback board failure is logged and never blocks
// the personal sync; the next sync catches up.
export async function sync(
    userId: string,
    options: SyncOptions = {}
): Promise<Snapshot | null> {

    const snapshot =
        await syncPersonalSnapshot(
            userId,
            options
        );

    try {
        await syncFeedback(
            userId,
            snapshot?.deleted
        );
    } catch (error) {
        console.error(
            "[sync] Feedback board sync failed, will catch up on the next one:",
            error
        );
    }

    return snapshot;
}

// ★★★★★ CHANGED 11/06/2026 ★★★★★ — NEW: shared restore step. Adds the
// items to the current Snapshot, removes their deletion records, writes
// them to local storage, and pushes to the cloud.
async function applyRestore(
    userId: string,
    getItems: (current: Snapshot) => RestoreItem[]
): Promise<{ snapshot: Snapshot; restoredCount: number }> {

    const cloudSnapshot =
        await receiveSnapshot(userId);

    const localSnapshot =
        await processCurrentSnapshot(userId);

    const baseSnapshot =
        localSnapshot ?? cloudSnapshot;

    if (baseSnapshot === null) {
        throw new Error(
            "[sync] Nothing to restore into: no local or cloud Snapshot."
        );
    }

    const current =
        normalizeSnapshot(
            baseSnapshot,
            userId
        );

    const items =
        getItems(current);

    if (items.length === 0) {
        return { snapshot: current, restoredCount: 0 };
    }

    if (cloudSnapshot !== null) {
        await saveHistoryEntry(
            normalizeSnapshot(
                cloudSnapshot,
                userId
            )
        );
    }

    const withItems =
        applyItems(
            current,
            items
        );

    saveCurrentSnapshot(
        withItems
    );

    const restoredSnapshot =
        await restoreSnapshotToLocalStorage(
            withItems
        );

    await sendSnapshot(
        restoredSnapshot
    );

    return {
        snapshot: restoredSnapshot,
        restoredCount: items.length,
    };
}


// ★★★★★ CHANGED 11/06/2026 ★★★★★ — NEW: restore from a saved history
// entry everything the current Snapshot is missing, or only the picked
// items.
export async function restoreFromHistory(
    userId: string,
    historyId: string,
    picks?: ItemPick[]
): Promise<{ snapshot: Snapshot; restoredCount: number }> {

    const source =
        await getHistorySnapshot(
            userId,
            historyId
        );

    if (source === null) {
        throw new Error(
            `[sync] History entry ${historyId} was not found.`
        );
    }

    return applyRestore(
        userId,
        current => missingItems(current, source, picks)
    );
}


// ★★★★★ CHANGED 11/06/2026 ★★★★★ — NEW: bring back deleted items found by
// findDeletedItems(). Matches with no saved copy (item === null) are
// skipped.
export async function restoreDeletedItems(
    userId: string,
    matches: DeletedMatch[]
): Promise<{ snapshot: Snapshot; restoredCount: number }> {

    const items: RestoreItem[] =
        matches
            .filter(match => match.item !== null)
            .map(match => ({
                collection: match.collection,
                id: match.id,
                item: match.item,
            }));

    return applyRestore(
        userId,
        () => items
    );
}


// 10/09/2026 — Automatic sync.
//
// Runs a sync and never throws. If it can't run right now (offline, signed
// out, Firestore error) that's fine: it logs and the next sync point
// catches up. Call this wherever the user leaves a page.
export async function autoSync(
    userId: string
): Promise<void> {
    try {
        await sync(userId);
    } catch (error) {
        console.error(
            "[sync] Auto sync skipped, will catch up on the next one:",
            error
        );
    }
}

// 10/09/2026 — Sync points for a signed-in user:
//   - Login: sync immediately (pull and compare).
//   - Losing focus: sync when the window loses focus.
// Returns a function that removes the listener (use it as the effect
// cleanup, or call it on logout).
export function startAutoSync(
    userId: string
): () => void {

    // Login: pull and compare right away.
    void autoSync(userId);

    // Losing focus.
    const onBlur = () => {
        void autoSync(userId);
    };

    window.addEventListener("blur", onBlur);

    return () => {
        window.removeEventListener("blur", onBlur);
    };
}