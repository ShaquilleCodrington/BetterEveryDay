// ======================================================
// notebookStorage.ts
// ------------------------------------------------------
// Handles saving and loading Notes data.
//
// This is the only file that should directly interact
// with localStorage.

import type {NotebookFolder, Notebook, Page, Block} from "../types";

    //storage keys
const NOTEBOOK_FOLDERS_KEY = "notes.notebookFolders";
const NOTEBOOKS_KEY = "notes.notebooks";
const PAGES_KEY = "notes.pages";
const BLOCKS_KEY = "notes.blocks";


function repairNotebook(
    notebook: Notebook
): Notebook
{
    const now = new Date().toISOString();

    return {
        ...notebook,

        userId: notebook.userId ?? null,

        createdAt:
            notebook.createdAt ?? now,

        updatedAt:
            notebook.updatedAt ?? now,
    };
}


function repairPage(
    page: Page
): Page
{
    const now = new Date().toISOString();

    return {
        ...page,

        createdAt:
            page.createdAt ?? now,

        updatedAt:
            page.updatedAt ?? now,
    };
}

function repairBlock(
    block: Block
): Block
{
    const now = new Date().toISOString();

    return {
        ...block,

        createdAt:
            block.createdAt ?? now,

        updatedAt:
            block.updatedAt ?? now,
    };
}


function repairNotebookFolder(
    folder: NotebookFolder
): NotebookFolder
{
    const now = new Date().toISOString();

    return {
        ...folder,

        userId: folder.userId ?? null,

        createdAt:
            folder.createdAt ?? now,

        updatedAt:
            folder.updatedAt ?? now,
    };
}

    //notebook storage
export function loadNotebooks(): Notebook[]
{
    const data = localStorage.getItem(NOTEBOOKS_KEY);

    if (!data)
    {
        return [];
    }

    const notebooks: Notebook[] =
        JSON.parse(data);

    let needsRepair = false;

    const repairedNotebooks =
        notebooks.map((notebook) =>
        {
            if (
                notebook.userId === undefined ||
                notebook.createdAt === undefined ||
                notebook.updatedAt === undefined
            )
            {
                needsRepair = true;

                return repairNotebook(notebook);
            }

            return notebook;
        });

    if (needsRepair)
    {
        saveNotebooks(repairedNotebooks);
    }

    return repairedNotebooks;
}

export function saveNotebooks(notebooks: Notebook[]): void{
    localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}


    //Page storage
export function loadPages(): Page[]
{
    const data = localStorage.getItem(PAGES_KEY);

    if (!data)
    {
        return [];
    }

    const pages: Page[] =
        JSON.parse(data);

    let needsRepair = false;

    const repairedPages =
        pages.map((page) =>
        {
            if (
                page.createdAt === undefined ||
                page.updatedAt === undefined
            )
            {
                needsRepair = true;

                return repairPage(page);
            }

            return page;
        });

    if (needsRepair)
    {
        savePages(repairedPages);
    }

    return repairedPages;
}

export function savePages(pages: Page[]): void{
    localStorage.setItem(PAGES_KEY, JSON.stringify(pages));
}


//Blocks storage
export function loadBlocks(): Block[]
{
    const data = localStorage.getItem(BLOCKS_KEY);

    if (!data)
    {
        return [];
    }

    const blocks: Block[] =
        JSON.parse(data);

    let needsRepair = false;

    const repairedBlocks =
        blocks.map((block) =>
        {
            if (
                block.createdAt === undefined ||
                block.updatedAt === undefined
            )
            {
                needsRepair = true;

                return repairBlock(block);
            }

            return block;
        });

    if (needsRepair)
    {
        saveBlocks(repairedBlocks);
    }

    return repairedBlocks;
}

export function saveBlocks(blocks: Block[]): void{
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
}

// ======================================================
// Folder Storage
// ======================================================

export function loadNotebookFolders(): NotebookFolder[]
{
    const data = localStorage.getItem(NOTEBOOK_FOLDERS_KEY);

    if (!data)
    {
        return [];
    }

    const folders: NotebookFolder[] =
        JSON.parse(data);

    let needsRepair = false;

    const repairedFolders =
        folders.map((folder) =>
        {
            if (
                folder.userId === undefined ||
                folder.createdAt === undefined ||
                folder.updatedAt === undefined
            )
            {
                needsRepair = true;

                return repairNotebookFolder(
                    folder
                );
            }

            return folder;
        });

    if (needsRepair)
    {
        saveNotebookFolders(
            repairedFolders
        );
    }

    return repairedFolders;
}

export function saveNotebookFolders(
    folders: NotebookFolder[]
): void
{
    localStorage.setItem(
        NOTEBOOK_FOLDERS_KEY,
        JSON.stringify(folders)
    );
}

