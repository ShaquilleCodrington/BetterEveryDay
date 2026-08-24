import {
    doc,
    getDoc,
    setDoc,
} from "firebase/firestore";

import { database } from "../firebase/config";
import type { Snapshot } from "./snapshot";
import {reconcileCurrentSnapshotWithCloud, restoreSnapshotToLocalStorage,} from "./snapshotManager";


// 2026-08-23 — Store each user's current Continuity Snapshot at one predictable Firestore location.
function getSnapshotReference(userId: string) {
    return doc(
        database,
        "users",
        userId,
        "continuity",
        "current"
    );
}


// 2026-08-23 — Send the current local Snapshot to the user's Firestore Continuity document.
export async function sendSnapshot(
    snapshot: Snapshot
): Promise<void> {
    const snapshotReference =
        getSnapshotReference(snapshot.userId);

    await setDoc(
        snapshotReference,
        snapshot
    );
}


// 2026-08-23 — Retrieve the current cloud Snapshot for the authenticated user.
export async function receiveSnapshot(
    userId: string
): Promise<Snapshot | null> 
{
    const snapshotReference =
        getSnapshotReference(userId);

    const snapshotDocument =
        await getDoc(snapshotReference);

    if (!snapshotDocument.exists()) {
        return null;
    }

    return snapshotDocument.data() as Snapshot;
}

// 2026-08-23 — Pull the authenticated user's cloud Snapshot and reconcile it into the current local Snapshot during login.
export async function synchronizeOnLogin(
    userId: string
): Promise<Snapshot | null> {
    const cloudSnapshot =
        await receiveSnapshot(userId);

    if (!cloudSnapshot) {
        return null;
    }

    const reconciledSnapshot =
        reconcileCurrentSnapshotWithCloud(
            cloudSnapshot
        );

    const restoredSnapshot =
        restoreSnapshotToLocalStorage(
            reconciledSnapshot
        );

    return restoredSnapshot;
}