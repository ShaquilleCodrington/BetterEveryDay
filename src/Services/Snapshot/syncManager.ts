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

import {
    doc,
    getDoc,
    setDoc,
} from "firebase/firestore";

import { database } from "../firebase/config";


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
export async function sendSnapshot(
    snapshot: Snapshot
): Promise<void> {

    const snapshotReference =
        getSnapshotReference(
            snapshot.userId
        );

    await setDoc(
        snapshotReference,
        snapshot
    );
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
export async function sync(
    userId: string
): Promise<Snapshot | null> {

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


        const restoredSnapshot =
            await restoreSnapshotToLocalStorage(
                normalizedCloudSnapshot
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
    // 9. Materialize resolved state into application
    // storage.
    // --------------------------------------------------
    const restoredSnapshot =
        await restoreSnapshotToLocalStorage(
            resolvedSnapshot
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