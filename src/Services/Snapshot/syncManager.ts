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
// Snapshot Manager determines the winner.
// The resolved state is written locally.
// The resolved state is then pushed to Firebase.
export async function sync(
    userId: string
): Promise<Snapshot | null> {

    // 1. Capture the latest local working state.
    const localSnapshot =
        processCurrentSnapshot();

    if (!localSnapshot) {
        return null;
    }


    // 2. Retrieve the current shared cloud state.
    const cloudSnapshot =
        await receiveSnapshot(
            userId
        );


    // 3. No cloud state exists yet.
    //
    // Local state becomes the initial
    // authoritative shared state.
    if (!cloudSnapshot) {

        saveCurrentSnapshot(
            localSnapshot
        );

        await sendSnapshot(
            localSnapshot
        );

        return localSnapshot;
    }


    // 4. Compare local and cloud state.
    const resolvedSnapshot =
        reconcileSnapshots(
            localSnapshot,
            cloudSnapshot
        );


    // 5. Save the winning Snapshot locally.
    saveCurrentSnapshot(
        resolvedSnapshot
    );


    // 6. Materialize the winning Snapshot
    // into the application's local storage.
    const restoredSnapshot =
        restoreSnapshotToLocalStorage(
            resolvedSnapshot
        );


    // 7. The resolved state is now the state
    // that should exist everywhere.
    await sendSnapshot(
        restoredSnapshot
    );


    // 8. Return the final synchronized state.
    return restoredSnapshot;
}