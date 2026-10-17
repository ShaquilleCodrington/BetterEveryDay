import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    type User,
    type Unsubscribe,
} from "firebase/auth";


import { auth } from "./config";

/**
 * Listen for Firebase authentication state changes.
 *
 * Firebase calls the callback:
 * - once when the app starts and Firebase restores a session
 * - when a user signs in
 * - when a user signs out
 *
 * The application can use the returned User to obtain:
 *
 *     user.uid
 *
 * If no user is authenticated, Firebase passes null.
 */
export function subscribeToAuthState(
    callback: (user: User | null) => void
): Unsubscribe {
    return onAuthStateChanged(auth, callback);
}

export async function createAccount(
    email: string,
    password: string
): Promise<User> {
    const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
    );

    return credential.user;
}


// 2026-10-17: NEW. Email/password sign-in for the custom login form.
// Firebase UI used to do this for us.
export async function signIn(
    email: string,
    password: string
): Promise<User> {
    const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
    );

    return credential.user;
}

// 2026-10-17: NEW. Sends the password reset email for "Forgot password?".
export function resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(auth, email);
}

// Provides the existing auth layer with an explicit logout action.
export function logout(): Promise<void> {
    return signOut(auth);
}
