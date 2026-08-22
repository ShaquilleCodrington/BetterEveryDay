// ======================================================
// types.ts
// ------------------------------------------------------
// Core data models for the Notes feature.
//

import type { ChecklistItem } from "../../Components/Checklist";


    //block types
    export type BlockType =
    | "empty" | "text"
    | "heading" | "list"
    | "divider" | "task"
    | "checklist";

    export interface NotebookFolder
    {
        id: string;
        title: string;

        userId: string | null;
        createdAt: string;
        updatedAt: string;
    }

    //notebook
    export interface Notebook
    {
        id: string;
        userId: string | null;
        createdAt: string;
        updatedAt: string;

        title: string;
        icon?: string;
        color?: string;

           // Ordered list of pages contained in this notebook.
        pageIds: string[];
        folderId?: string;

            // Reserved for future notebook settings.
        settings: {};
    }

    //Page

    export interface Page
    {
        id: string;
        notebookId: string;
        createdAt: string;
        updatedAt: string;

        title: string;

            // Ordered list of blocks contained in this page.
        blockIds: string[];

            // Used for nested pages in a future sprint.
        parentPageId?: string;
 
    }
    

    //Shared block fields

    interface BaseBlock
    {
        id: string;
        pageId: string;
        type: BlockType;

       
        createdAt: string;
        updatedAt: string;
    }

    //block Content
    export interface ListItem
    {
        id: string;
        text: string;
    }

    /* =====================================================
   Block Definitions
    ===================================================== */

export interface EmptyBlock extends BaseBlock {
    type: "empty";

    content: string;
}

export interface TextBlock extends BaseBlock {
    type: "text";

    content: string;
}

export interface HeadingBlock extends BaseBlock {
    type: "heading";

    content: string;
}

export interface ListBlock extends BaseBlock {
    type: "list";

    content: string;
}

export interface DividerBlock extends BaseBlock {
    type: "divider";

    content: null;
}

export interface TaskBlock extends BaseBlock {
    type: "task";

    content: {
        taskId: string;
    };
}

export interface CheckBlock extends BaseBlock {
    type: "checklist";

    content: ChecklistItem[];
}

//Block union

export type Block = 
    | EmptyBlock
    | TextBlock
    | HeadingBlock
    | ListBlock
    | DividerBlock
    | TaskBlock
    | CheckBlock;
