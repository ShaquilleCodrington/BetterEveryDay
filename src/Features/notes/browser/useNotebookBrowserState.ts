// ======================================================
// useNotebookBrowserState.ts
// ------------------------------------------------------
// Notebook-owned browser behavior that Journey reuses:
// inline rename state for folders / notebooks / pages,
// the Rename-button dispatch, the "Add Existing" popup,
// and the page lookup for a notebook.
// ======================================================

import { useState } from "react";
import type { NotebookFolder, Notebook, Page } from "../types";

export function getNotebookPages(pages: Page[], notebookId: string): Page[]
{
    return pages.filter((page) => page.notebookId === notebookId);
}

interface UseNotebookBrowserStateOptions
{
    notebooks: Notebook[];
    folders: NotebookFolder[];
    pages: Page[];

    selectedFolderId: string | null;
    selectedNotebookId: string | null;
    selectedPageId: string | null;

    onRenameNotebook: (notebookId: string, title: string) => void;
    onRenamePage: (pageId: string, title: string) => void;
    onRenameFolder: (folderId: string, title: string) => void;
    onAssignNotebookToFolder: (notebookId: string, folderId: string) => void;

    // Journey shows notebooks as "journeys", so it overrides the fallback name.
    untitledNotebookTitle?: string;
}

export function useNotebookBrowserState(
{
    notebooks,
    folders,
    pages,

    selectedFolderId,
    selectedNotebookId,
    selectedPageId,

    onRenameNotebook,
    onRenamePage,
    onRenameFolder,
    onAssignNotebookToFolder,

    untitledNotebookTitle = "Untitled Notebook",
}: UseNotebookBrowserStateOptions)
{
    const [editingFolderId, setEditingFolderId] =
        useState<string | null>(null);

    const [editingFolderTitle, setEditingFolderTitle] =
        useState("");

    const [editingNotebookId, setEditingNotebookId] =
        useState<string | null>(null);

    const [editingTitle, setEditingTitle] =
        useState("");

    const [editingPageId, setEditingPageId] =
        useState<string | null>(null);

    const [editingPageTitle, setEditingPageTitle] =
        useState("");

    const [showAddExistingPopup, setShowAddExistingPopup] =
        useState(false);

    const selectedFolder =
        folders.find(
            (folder) =>
                folder.id === selectedFolderId
        );

    function startEditingFolder(folder: NotebookFolder)
    {
        setEditingFolderId(folder.id);
        setEditingFolderTitle(folder.title);
    }

    function commitFolderRename()
    {
        if (!editingFolderId) return;

        onRenameFolder(
            editingFolderId,
            editingFolderTitle.trim() || "Untitled Folder"
        );

        setEditingFolderId(null);
    }

    function startEditingNotebook(notebook: Notebook)
    {
        setEditingNotebookId(notebook.id);
        setEditingTitle(notebook.title);
    }

    function commitNotebookRename(notebookId: string)
    {
        onRenameNotebook(
            notebookId,
            editingTitle.trim() || untitledNotebookTitle
        );

        setEditingNotebookId(null);
    }

    function startEditingPage(page: Page)
    {
        setEditingPageId(page.id);
        setEditingPageTitle(page.title);
    }

    function commitPageRename()
    {
        if (!editingPageId) return;

        onRenamePage(
            editingPageId,
            editingPageTitle.trim() || "Untitled Page"
        );

        setEditingPageId(null);
    }

    function handleRenameButtonClick()
    {
        if (selectedPageId)
        {
            const page = pages.find((p) => p.id === selectedPageId);

            if (page)
            {
                startEditingPage(page);
                return;
            }
        }

        if (selectedNotebookId)
        {
            const notebook = notebooks.find(
                (n) => n.id === selectedNotebookId
            );

            if (notebook)
            {
                startEditingNotebook(notebook);
                return;
            }
        }

        if (selectedFolder)
        {
            startEditingFolder(selectedFolder);
        }
    }

    function handleAddExistingNotebook(notebookId: string)
    {
        if (!selectedFolderId) return;

        onAssignNotebookToFolder(notebookId, selectedFolderId);
        setShowAddExistingPopup(false);
    }

    return {
        editingFolderId,
        editingFolderTitle,
        setEditingFolderTitle,
        startEditingFolder,
        commitFolderRename,

        editingNotebookId,
        editingTitle,
        setEditingTitle,
        startEditingNotebook,
        commitNotebookRename,

        editingPageId,
        editingPageTitle,
        setEditingPageTitle,
        startEditingPage,
        commitPageRename,

        showAddExistingPopup,
        setShowAddExistingPopup,
        handleAddExistingNotebook,

        handleRenameButtonClick,
    };
}