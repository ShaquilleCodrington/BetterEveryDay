import {
    onAuthStateChanged,
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