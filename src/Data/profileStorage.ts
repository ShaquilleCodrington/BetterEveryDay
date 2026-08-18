// ======================================================
// profileStorage.ts
// ------------------------------------------------------
// Central location for reading and writing the user's
// profile (name, titles, bio, photo).
//
// Unlike most of the app's settings (which live in
// localStorage), the profile is persisted to disk via the
// Electron main process — see electron/main.js
// ("profile:load" / "profile:save") — in its own folder:
//   <userData>/profile/profile.json
//
// This means the profile survives things localStorage
// doesn't always survive (cache clears, browser storage
// limits) and lives in a predictable place on the user's
// computer, same as the rest of the app's real data.
//
// When running outside Electron (e.g. `npm run dev` in a
// plain browser tab), window.electron isn't present, so we
// fall back to localStorage just so the page still works.
// ======================================================

export interface ProfileData {

    uid: string  | null;
    name: string;
    primaryTitle: string;
    titles: string[];
    bio: string;
    photo: string;
}

export const DEFAULT_PROFILE: ProfileData = {
    uid:          null,
    name:         "",
    primaryTitle: "",
    titles:       [],
    bio:          "",
    photo:        "",
};

{/* Used only as a fallback when window.electron isn't available (browser dev preview) */}
const FALLBACK_KEY = "profile-data";

function hasElectronProfileBridge(): boolean {
    return typeof window !== "undefined" && !!window.electron?.profile;
}

{/* Reads the full profile from disk (via IPC), falling back to defaults */}
export async function getProfile(): Promise<ProfileData> {
    if (hasElectronProfileBridge()) {
        try {
            const saved = await window.electron.profile.load();
            return saved ? { ...DEFAULT_PROFILE, ...saved } : DEFAULT_PROFILE;
        } catch {
            return DEFAULT_PROFILE;
        }
    }

    // Browser dev fallback
    try {
        const raw = localStorage.getItem(FALLBACK_KEY);
        return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
    } catch {
        return DEFAULT_PROFILE;
    }
}

{/* Persists the full profile to disk (via IPC) and notifies listeners (e.g. Toolbar avatar) */}
export async function saveProfile(profile: ProfileData): Promise<void> {
    if (hasElectronProfileBridge()) {
        await window.electron.profile.save(profile);
    } else {
        try {
            localStorage.setItem(FALLBACK_KEY, JSON.stringify(profile));
        } catch {
            // ignore — nothing more we can do in this fallback path
        }
    }

    window.dispatchEvent(new CustomEvent("profile-update"));
}
