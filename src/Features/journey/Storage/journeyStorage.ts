import type { Journey, JourneyFolder } from "../types";

const FOLDERS_KEY = "journeyFolders";
const STORAGE_KEY = "journeys";


function repairJourney(
    journey: Partial<Journey>
): Journey
{
    // 2026-08-22 — Preserve an existing creation timestamp or initialize legacy Journeys.
    const createdAt =
        journey.createdAt ??
        new Date().toISOString();

    // 2026-08-22 — Preserve an existing update timestamp or initialize legacy Journeys from creation time.
    const updatedAt =
        journey.updatedAt ??
        createdAt;

    return {
        journeyId:
            journey.journeyId ?? crypto.randomUUID(),

        notebookId:
            journey.notebookId ?? "",

        // 2026-08-22 — Repair missing Journey ownership without assigning authenticated ownership.
        userId:
            journey.userId ?? null,

        createdAt,

        updatedAt,

        ...(journey.folderId !== undefined
            ? { folderId: journey.folderId }
            : {}),
    };
}

// ======================================================
// Load Journeys
// ======================================================
export function loadJourneys(): Journey[]
{
    const storedJourneys = localStorage.getItem(STORAGE_KEY);

    if (!storedJourneys)
    {
        return [];
    }

    try
    {
        const parsedJourneys = JSON.parse(storedJourneys);

        if (!Array.isArray(parsedJourneys))
        {
            return [];
        } 
        let repaired = false;

        const journeys =
            parsedJourneys.map(
                (journey) =>
                {
                    const repairedJourney =
                        repairJourney(journey);

                    if (
                        journey.userId === undefined ||
                        journey.createdAt === undefined ||
                        journey.updatedAt === undefined ||
                        journey.journeyId === undefined
                    )
                    {
                        repaired = true;
                    }

                    return repairedJourney;
                }
            );

        if (repaired)
        {
            saveJourneys(journeys);
        }

        return journeys;
    }
    catch
    {
        return [];
    }
}

// ======================================================
// Save Journeys (core persistence function)
// ======================================================
export function saveJourneys(journeys: Journey[]): void
{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journeys));
}

// ======================================================
// Add Journey
// ======================================================
export function addJourney(journey: Journey): Journey[]
{
    const existingJourneys = loadJourneys();

    const updatedJourneys = [
        ...existingJourneys,
        journey,
    ];

    saveJourneys(updatedJourneys);

    return updatedJourneys;
}

// ======================================================
// Update Journey
// ======================================================
export function updateJourney(updatedJourney: Journey): Journey[]
{
    const existingJourneys = loadJourneys();

    const journeyWithUpdatedAt: Journey =
    {
        ...updatedJourney,
        updatedAt:
            new Date().toISOString(),
    };

    const updatedJourneys = existingJourneys.map((journey) =>
    {
        if (journey.journeyId !== updatedJourney.journeyId)
        {
            return journey;
        }

        return journeyWithUpdatedAt;
    });

    saveJourneys(updatedJourneys);

    return updatedJourneys;
}

// ======================================================
// Delete Journey
// ======================================================
export function deleteJourney(journeyId: string): Journey[]
{
    const existingJourneys = loadJourneys();

    const updatedJourneys = existingJourneys.filter(
        (journey) => journey.journeyId !== journeyId
    );

    saveJourneys(updatedJourneys);

    return updatedJourneys;
}

// ======================================================
// Folder Storage
// ======================================================

export function loadJourneyFolders(): JourneyFolder[]
{
    const stored = localStorage.getItem(FOLDERS_KEY);

    if (!stored)
    {
        return [];
    }

    try
    {
        return JSON.parse(stored);
    }
    catch
    {
        return [];
    }
}

export function saveJourneyFolders(
    folders: JourneyFolder[]
)
{
    localStorage.setItem(
        FOLDERS_KEY,
        JSON.stringify(folders)
    );
}