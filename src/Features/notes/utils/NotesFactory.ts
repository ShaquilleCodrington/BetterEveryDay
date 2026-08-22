// ======================================================
// Notes.ts
// ------------------------------------------------------
// Helper functions for creating Notes objects.
//
// Every new Notebook, Page, and Block should be created
// through these functions to ensure they always start
// in a valid state.
//

import type { Notebook, Page, EmptyBlock } from "../types";

        //Notebook
        export function createNotebook(title = "Untitled Notebook",
             userId: string | null = null): Notebook
        {
             const now = new Date().toISOString();

            return {
                id: crypto.randomUUID(),
                userId,
                createdAt: now,
                updatedAt: now,

                title,
                pageIds: [],
                settings: {},

            };
        }

            //page
            export function createPage( notebookId: string,
                title = "Untitled Page"
            )
            {

                    // Create the page's initial empty block.
                const now = new Date().toISOString();

                const pageId = crypto.randomUUID();

                const page: Page = {
                    id: pageId,
                    notebookId,
                    createdAt: now,
                    updatedAt: now,

                    title,
                    blockIds: [],
                };

                const emptyBlock = createEmptyBlock(pageId);

                page.blockIds.push(emptyBlock.id);

                return{
                    page, block: emptyBlock,
                };
            }

            //empty Block
        export function createEmptyBlock( pageId: string):
        EmptyBlock
        {
            const now = new Date().toISOString();

            return {
                id:crypto.randomUUID(),
                    pageId,
                    type: "empty",
                    content: "",

                     createdAt: now,
                     updatedAt: now,

            };
        }