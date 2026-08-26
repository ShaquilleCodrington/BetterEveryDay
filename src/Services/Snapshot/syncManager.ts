import {
    processCurrentSnapshot,
    reconcileSnapshots,
    restoreSnapshotToLocalStorage,
} from "./snapshotManager";

import {
    saveCurrentSnapshot,
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

    return snapshotDocument.data() as Snapshot;
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
        await processCurrentSnapshot();

    // 2. Always pull cloud state.
    const cloudSnapshot =
        await receiveSnapshot(userId);

    // 3. Nothing exists anywhere.
    if (localSnapshot === null && cloudSnapshot === null) {
        return null;
    }

    // 4. No local state, but cloud state exists.
    //    New browser/device.
    if (localSnapshot === null && cloudSnapshot !== null) {
        saveCurrentSnapshot(cloudSnapshot);

        await restoreSnapshotToLocalStorage(
            cloudSnapshot
        );

        return cloudSnapshot;
    }

    // 5. Local state exists, but cloud state does not.
    //    Establish the cloud snapshot from local state.
    if (localSnapshot !== null && cloudSnapshot === null) {
        saveCurrentSnapshot(localSnapshot);

        await restoreSnapshotToLocalStorage(
            localSnapshot
        );

        await sendSnapshot(localSnapshot);

        return localSnapshot;
    }

    // 6. At this point BOTH snapshots exist.
    //
    // TypeScript still may not preserve the relationship
    // between the two independent checks above, so explicitly
    // narrow them before reconciliation.

    if (localSnapshot === null || cloudSnapshot === null) {
        return null;
    }

    // 7. Reconcile local and cloud.
    const resolvedSnapshot =
        reconcileSnapshots(
            localSnapshot,
            cloudSnapshot
        );

    // 8. Save resolved snapshot locally.
    saveCurrentSnapshot(
        resolvedSnapshot
    );

    // 9. Materialize resolved state into application storage.
    const restoredSnapshot =
        await restoreSnapshotToLocalStorage(
            resolvedSnapshot
        );

    // 10. Push the same resolved state to Firebase.
    await sendSnapshot(
        restoredSnapshot
    );

    // 11. Return final state.
    return restoredSnapshot;
}