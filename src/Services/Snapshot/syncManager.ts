import {
    processCurrentSnapshot,
    reconcileSnapshots,
    restoreSnapshotToLocalStorage,
    loadSyncBaseline,
    saveSyncBaseline,
    type ReconcileOptions,
} from "./snapshotManager";

import {
    saveCurrentSnapshot,
    normalizeSnapshot,
    type Snapshot,
} from "./snapshot";

import {
    doc,
    getDoc,
    setDoc,
} from "firebase/firestore";

import { database } from "../firebase/config";

export interface SyncOptions {
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

// Main synchronization orchestration.
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
//
// 10/06/2026: Takes SyncOptions, loads the last-sync baseline before
// anything changes, and saves a new baseline only after a successful sync.
export async function sync(
    userId: string,
    options: SyncOptions = {}
): Promise<Snapshot | null> {

    // 10/06/2026: Load the baseline FIRST, before this sync touches anything.
    const baseline =
        loadSyncBaseline(userId);

    const reconcileOptions: ReconcileOptions = {
        baseline,
        allowMassDelete:
            options.allowMassDelete ?? false,
    };

    // 1. Capture local state.
    const localSnapshot =
        await processCurrentSnapshot(userId);

    // 2. Always pull cloud state.
    const cloudSnapshot =
        await receiveSnapshot(userId);

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


        // 10/06/2026: baseline: null = nothing local to delete, plain restore.
        const restoredSnapshot =
            await restoreSnapshotToLocalStorage(
                normalizedCloudSnapshot,
                { baseline: null }
            );


        // 10/06/2026: Local now matches cloud, so record it as the baseline.
        saveSyncBaseline(
            restoredSnapshot
        );


        return restoredSnapshot;
    }
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


        // 10/06/2026: baseline: null = nothing in the cloud to compare against.
        const restoredSnapshot =
            await restoreSnapshotToLocalStorage(
                normalizedLocalSnapshot,
                { baseline: null }
            );


        await sendSnapshot(
            restoredSnapshot
        );


        // 10/06/2026: Only reached if the push succeeded.
        saveSyncBaseline(
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
    // 6. Both Snapshots exist.
    //
    // Normalize both sides before reconciliation.
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
    // 7. Reconcile local and cloud.
    //
    // 10/06/2026: Passes the baseline so deletions are detected.
    // --------------------------------------------------
    const resolvedSnapshot =
        reconcileSnapshots(
            normalizedLocalSnapshot,
            normalizedCloudSnapshot,
            reconcileOptions
        );


    // --------------------------------------------------
    // 8. Save resolved Snapshot locally.
    // --------------------------------------------------
    saveCurrentSnapshot(
        resolvedSnapshot
    );


    // --------------------------------------------------
    // 9. Materialize resolved state into application
    // storage.
    //
    // 10/06/2026: Same baseline here, so the restore step no longer
    // re-adds items that were just deleted.
    // --------------------------------------------------
    const restoredSnapshot =
        await restoreSnapshotToLocalStorage(
            resolvedSnapshot,
            reconcileOptions
        );


    // --------------------------------------------------
    // 10. Push exactly the resolved state to Firebase.
    // --------------------------------------------------
    await sendSnapshot(
        restoredSnapshot
    );


    // --------------------------------------------------
    // 10b. 10/06/2026: Record what was just synced. Only reached if the
    // push above succeeded, so a failed sync never moves the baseline.
    // --------------------------------------------------
    saveSyncBaseline(
        restoredSnapshot
    );


    // --------------------------------------------------
    // 11. Return final state.
    // --------------------------------------------------
    return restoredSnapshot;
}