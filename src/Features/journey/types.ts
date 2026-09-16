// ======================================================
// types.ts
// ------------------------------------------------------
// Defines the Journey data model.
//
// A Journey represents a long-term pursuit and owns
// exactly one Notebook.
// ======================================================


export interface Journey
{
    journeyId: string;
    userId: string | null;
    notebookId: string;
    // When the Journey was created
    createdAt: string;
    updatedAt: string;
    folderId?: string;
    
}

export interface JourneyFolder
{
    id: string;
    title: string;
    userId: string | null;
    createdAt: string;
    updatedAt: string;

}
