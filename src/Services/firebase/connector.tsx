// ======================================================
// connector.tsx
// ------------------------------------------------------
// Bridges Firebase auth state (auth.ts) to the local
// profile store (profileStorage.ts).
//
// Two ways a user ends up "logged in" for the purposes of
// the rest of the app:
//
//   1. Firebase auth      -> profile.uid = user.uid
//   2. Guest login        -> profile.uid = null (explicit)
//
// Firebase's onAuthStateChanged also fires with `null` on
// first load if no session was ever restored, and again on
// sign-out. Both of those cases collapse to the same
// profile.uid = null as guest — that's intentional per the
// current design: nothing downstream distinguishes "guest"
// from "not signed in yet."
//
// Not handled here: task-state persistence. This file only
// keeps profile.uid in sync with auth state.
// ======================================================

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuthState, logout as firebaseLogout } from "./auth";
import { getProfile, saveProfile } from "../../Data/profileStorage";

/**
 * Call once near the root of the app (e.g. in App.tsx).
 * Subscribes to Firebase auth state for the lifetime of the
 * component and keeps profile.uid in sync automatically.
 */

export function useAuthConnector(): User | null {
     const [currentUser, setCurrentUser] = useState<User | null>(null); 
     
     useEffect(() => { const unsubscribe = subscribeToAuthState(async (user) =>
        { setCurrentUser(user);
        const nextUid = user ? user.uid : null;
        await syncProfileUid(nextUid); }); 

return unsubscribe; 
}, []); 

return currentUser; 
}


/**
 * Explicit guest path. Wire this up to the "Continue as
 * guest" button on the login screen. Bypasses Firebase
 * entirely — just makes sure the local profile has
 * uid: null so the app proceeds the same way it would for
 * an unauthenticated session.
 */
export async function continueAsGuest(): Promise<void> {
    await syncProfileUid(null);
}

/**
 * Shared write path — only touches uid, preserves the rest
 * of the profile (name, titles, bio, photo), and skips the
 * write entirely if nothing changed.
 */
async function syncProfileUid(nextUid: string | null): Promise<void> {
    const profile = await getProfile();

    if (profile.uid === nextUid) {
        return;
    }

    await saveProfile({ ...profile, uid: nextUid });
}

// 2026-08-22: Application-facing logout operation.
// UI components call this connector instead of talking to Firebase directly.
export async function logout(): Promise<void> {
    await firebaseLogout();
}