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
    return (
        typeof window !== "undefined" &&
        !!window.electron?.profile
    );
}

// ------------------------------------------------------
// Create a valid profile for an authenticated user.
//
// This guarantees that every authenticated user's
// Snapshot has a profile object and that the profile
// belongs to the authenticated UID.
// ------------------------------------------------------
export function createDefaultProfile(
    userId: string
): ProfileData {
    return {
        ...DEFAULT_PROFILE,
        uid: userId,
    };
}

// ------------------------------------------------------
// Normalize any profile data into a complete ProfileData
// object.
//
// This protects the Snapshot system from older or
// incomplete profile data.
// ------------------------------------------------------
export function normalizeProfile(
    profile: Partial<ProfileData> | null | undefined,
    userId: string
): ProfileData {
    return {
        ...DEFAULT_PROFILE,
        ...(profile ?? {}),
        uid: userId,
        titles: Array.isArray(profile?.titles)
            ? profile.titles
            : [],
    };
}

// ------------------------------------------------------
// Read the full profile.
// ------------------------------------------------------
export async function getProfile(): Promise<ProfileData> {
    if (hasElectronProfileBridge()) {
        try {
            const saved =
                await window.electron.profile.load();

            return saved
                ? {
                    ...DEFAULT_PROFILE,
                    ...saved,
                    titles: Array.isArray(saved.titles)
                        ? saved.titles
                        : [],
                }
                : DEFAULT_PROFILE;
        } catch {
            return DEFAULT_PROFILE;
        }
    }

    try {
        const raw =
            localStorage.getItem(FALLBACK_KEY);

        if (!raw) {
            return DEFAULT_PROFILE;
        }

        const parsed =
            JSON.parse(raw) as Partial<ProfileData>;

        return {
            ...DEFAULT_PROFILE,
            ...parsed,
            titles: Array.isArray(parsed.titles)
                ? parsed.titles
                : [],
        };
    } catch {
        return DEFAULT_PROFILE;
    }
}

// ------------------------------------------------------
// Persist the full profile.
// ------------------------------------------------------
export async function saveProfile(
    profile: ProfileData
): Promise<void> {
    const normalizedProfile: ProfileData = {
        ...DEFAULT_PROFILE,
        ...profile,
        titles: Array.isArray(profile.titles)
            ? profile.titles
            : [],
    };

    if (hasElectronProfileBridge()) {
        await window.electron.profile.save(
            normalizedProfile
        );
    } else {
        try {
            localStorage.setItem(
                FALLBACK_KEY,
                JSON.stringify(normalizedProfile)
            );
        } catch {
            // Nothing more we can do in fallback mode.
        }
    }

    window.dispatchEvent(
        new CustomEvent("profile-update")
    );
}