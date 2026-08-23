import type { Journey } from "../types";
import { createNotebook } from "../../notes/utils/NotesFactory";


export function createJourney(userId: string | null)
{
     const now = new Date().toISOString();

    const notebook =
        createNotebook("New Journey", userId);


    const journey: Journey =
    {
        journeyId: crypto.randomUUID(),

        notebookId: notebook.id,
        userId,
        createdAt: now,
        updatedAt: now,
    };


    return {
        journey,
        notebook,
    };
}