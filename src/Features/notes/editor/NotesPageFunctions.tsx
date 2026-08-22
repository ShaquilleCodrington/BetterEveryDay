import { useState, useEffect } from "react";
import type { NotebookFolder, Notebook, Page, Block, BlockType } from "../types";
import type { Task } from "../../../Data/tasks";
import {
    getSessionByPageId,
} from "../../journey/Session/journeySession";
import {
    loadNotebooks,  saveNotebooks,    loadPages,
    savePages,  loadBlocks,  saveBlocks,
    loadNotebookFolders, saveNotebookFolders,
} from "../storage/notebookStorage";

import { loadTasks, saveTasks } from "../../../Data/taskStorage";

import {
    createNotebook,  createPage,
} from "../utils/NotesFactory";

import { deleteSession } from "../../journey/Storage/sessionStorage";
import { useAuthConnector } from "../../../Services/firebase/connector";

export function useNotesPageFunctions({
    selectedPageId,
}: {
    selectedPageId: string | null;
}){


    // ==================================================
    // State
    // ==================================================
    
    const  currentUser  = useAuthConnector();
    const [notebooks, setNotebooks] = useState<Notebook[]>([]);
    const [pages, setPages] = useState<Page[]>([]);
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    const [selectedNotebookId, setSelectedNotebookId] =
        useState<string | null>(null);
 
    const [focusedBlockId, setFocusedBlockId] =
        useState<string | null>(null);

    const [showTaskPicker, setShowTaskPicker] =
        useState(false);

      const [folders, setFolders] =
    useState<NotebookFolder[]>(loadNotebookFolders());

    const [selectedFolderId, setSelectedFolderId] =
        useState<string | null>(null);

    // const selectedFolder =
    //     folders.find(
    //         (folder) =>
    //             folder.id === selectedFolderId
    //     );

    // const folderNotebooks =
    //         notebooks.filter(
    //             (notebook) =>
    //                 notebook.folderId === selectedFolderId
    //         );


    // ==================================================
    // Effects
    // ==================================================

    useEffect(() =>
    {
        setNotebooks(loadNotebooks());
        setPages(loadPages());
        setBlocks(loadBlocks());
        setTasks(loadTasks());
    }, []);

    // ==================================================
    // Derived State
    // ==================================================

    const selectedPage =
        pages.find(
            (page) =>
                page.id === selectedPageId
        );


        function reloadData()
{
    setNotebooks(loadNotebooks());
    setPages(loadPages());
    setBlocks(loadBlocks());
    setTasks(loadTasks());
}


   
    // ==================================================
    // Folder Actions
    // ==================================================
   
    function handleCreateFolder()
        {
            
             const now = new Date().toISOString();
             const userId = currentUser?.uid ?? null;

            const newFolder: NotebookFolder =
            {
                id: crypto.randomUUID(),
                title: "Untitled Folder",
                userId,

                createdAt: now,
                updatedAt: now,
            };

            const updatedFolders =
            [
                ...folders,
                newFolder,
            ];

            setFolders(updatedFolders);
            saveNotebookFolders(updatedFolders);

        }

        function handleSelectedFolder(
            folderId: string | null
        )
        {
            // Clicking the same folder closes it.
            if (selectedFolderId === folderId)
            {
                setSelectedFolderId(null);
                return;
            }

            setSelectedFolderId(folderId);

            // Collapse any open notebook when switching folders.
            setSelectedNotebookId(null);

            
        }

    function handleRenameFolder(
        folderId: string,
        title: string
    )
    {

        const updatedAt =
            new Date().toISOString();

        const updatedFolders =
            folders.map((folder) =>
            {
                if (folder.id !== folderId)
                {
                    return folder;
                }

                return {
                    ...folder,
                    title,
                    updatedAt,
                };
            });

        setFolders(updatedFolders);
        saveNotebookFolders(updatedFolders);
    }

    function handleDeleteFolder(
        folderId: string
    )
    {
        const updatedFolders =
            folders.filter(
                (folder) => folder.id !== folderId
            );

        setFolders(updatedFolders);
        saveNotebookFolders(updatedFolders);

         const updatedAt =
            new Date().toISOString();

        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (notebook.folderId !== folderId)
                {
                    return notebook;
                }

                const { folderId: _removed, ...notebookWithoutFolder }
                 = notebook;
                return { ...notebookWithoutFolder, updatedAt,};
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);

        if (selectedFolderId === folderId)
        {
            setSelectedFolderId(null);
        }
    }


    // CHANGED: assigns a loose notebook to a folder (backs
    // "+ Add Existing Notebook"). Nothing is duplicated — the
    // notebook already exists, this just points it at the folder.
    function handleAssignNotebookToFolder(
        notebookId: string,
        folderId: string
    )
    {
        const updatedNotebooks =
            notebooks.map((notebook) =>
            {

        const updatedAt =
            new Date().toISOString();

                if (notebook.id !== notebookId)
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    folderId,
                    updatedAt,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);
    }

     function handleRemoveNotebookFromFolder(notebookId: string)
    {

        const updatedAt =
            new Date().toISOString();

        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (notebook.id !== notebookId)
                {
                    return notebook;
                }

                const { folderId, ...notebookWithoutFolder } = notebook;
                return { ...notebookWithoutFolder, updatedAt };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);
    }

    // ==================================================
    // Notebook Actions
    // ==================================================

    

    function handleCreateNotebook()
    {
        const notebook = createNotebook();

        const notebookToAdd: Notebook = selectedFolderId
            ? { ...notebook, folderId: selectedFolderId }
            : notebook;

        const updatedNotebooks = [
            ...notebooks,
            notebookToAdd,
        ];

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);

        setSelectedNotebookId(notebookToAdd.id);;
    }

    function handleSelectedNotebook(
        notebookId: string
    )
    {
        setSelectedNotebookId(notebookId);
    }

    function handleRenameNotebook(
        notebookId: string,
        title: string
    )
    {

        const updatedAt =
            new Date().toISOString();

        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (
                    notebook.id !== notebookId
                )
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    title,
                    updatedAt,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);
    }
    
    function handleDeleteNotebook(notebookId: string)
{
    const pagesToDelete = pages.filter(
        (page) => page.notebookId === notebookId
    );

    const pageIds = pagesToDelete.map((page) => page.id);

    const updatedNotebooks = notebooks.filter(
        (notebook) => notebook.id !== notebookId
    );

    const updatedPages = pages.filter(
        (page) => page.notebookId !== notebookId
    );

    const updatedBlocks = blocks.filter(
        (block) => !pageIds.includes(block.pageId)
    );

    setNotebooks(updatedNotebooks);
    saveNotebooks(updatedNotebooks);

    setPages(updatedPages);
    savePages(updatedPages);

    setBlocks(updatedBlocks);
    saveBlocks(updatedBlocks);

    if (selectedNotebookId === notebookId)
    {
        setSelectedNotebookId(null);
    }
}

    // ==================================================
    // Page Actions
    // ==================================================

    function handleCreatePage(
        notebookId: string
    )
    {
        const { page, block } =
            createPage(notebookId);

        const updatedPages = [
            ...pages,
            page,
        ];

        setPages(updatedPages);
        savePages(updatedPages);

        const updatedBlocks = [
            ...blocks,
            block,
        ];

        setBlocks(updatedBlocks);
        saveBlocks(updatedBlocks);


        const updatedAt =
            new Date().toISOString();


        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (
                    notebook.id !== notebookId
                )
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    pageIds: [
                        ...notebook.pageIds,
                        page.id,
                    ], updatedAt,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);

        return page;
    }

    function handleSelectedPage(
        _pageId: string
    )
    {}

    function handlePageTitleChange(
    title: string
)
{
    if (!selectedPageId)
    {
        return;
    }

    // Find the actual Page before mutating the collection.
    const page =
        pages.find(
            (item) =>
                item.id === selectedPageId
        );

    if (!page)
    {
        return;
    }

    const updatedAt =
        new Date().toISOString();

    const updatedPages =
        pages.map((page) =>
        {
            if (
                page.id !== selectedPageId
            )
            {
                return page;
            }

            return {
                ...page,
                title,
                updatedAt,
            };
        });

    setPages(updatedPages);
    savePages(updatedPages);

    // Page mutation propagates to Notebook.
    const updatedNotebooks =
        notebooks.map((notebook) =>
        {
            if (
                notebook.id !== page.notebookId
            )
            {
                return notebook;
            }

            return {
                ...notebook,
                updatedAt,
            };
        });

    setNotebooks(updatedNotebooks);
    saveNotebooks(updatedNotebooks);
}

    function handleDeletePage(
        pageId: string
    )
    {
    const updatedPages = pages.filter(
        (page) => page.id !== pageId
    );

    setPages(updatedPages);
    savePages(updatedPages);

    const updatedBlocks = blocks.filter(
        (block) => block.pageId !== pageId
    );

    setBlocks(updatedBlocks);
    saveBlocks(updatedBlocks);

     const updatedAt =
            new Date().toISOString();
            
    const updatedNotebooks = notebooks.map((notebook) => ({
        ...notebook,
        pageIds: notebook.pageIds.filter((id) => id !== pageId),
        updatedAt,
    }));

    setNotebooks(updatedNotebooks);
    saveNotebooks(updatedNotebooks);

   
    const session =
    getSessionByPageId(pageId);


        if(session)
        {
            deleteSession(
                session.sessionId
            );
        }
    }

     function handleRenamePage(
        pageId: string,
        title: string
    )
    {
        const page =
            pages.find(
                (item) =>
                    item.id === pageId
            );

        if (!page)
        {
            return;
        }

        const updatedAt =
            new Date().toISOString();

        const updatedPages =
            pages.map((page) =>
            {
                if (
                    page.id !== pageId
                )
                {
                    return page;
                }

                return {
                    ...page,
                    title,
                    updatedAt,
                };
            });

        setPages(updatedPages);
        savePages(updatedPages);

        // Page mutation propagates to Notebook.
        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (
                    notebook.id !== page.notebookId
                )
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    updatedAt,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);
    }

    // ==================================================
    // Block Actions
    // ==================================================

    function handleUpdateBlock(
        blockId: string,
        content: any
    )
    {
        const block =
            blocks.find(
                (item) =>
                    item.id === blockId
            );

        if (!block)
        {
            return;
        }

        const updatedAt =
            new Date().toISOString();

        // Source object changes first.
        const updatedBlocks =
            blocks.map((block) =>
            {
                if (
                    block.id !== blockId
                )
                {
                    return block;
                }

                return {
                    ...block,
                    content,
                    updatedAt,
                };
            });

        setBlocks(updatedBlocks);
        saveBlocks(updatedBlocks);


        // ==================================================
        // Block → Page
        // ==================================================

        const page =
            pages.find(
                (item) =>
                    item.id === block.pageId
            );

        if (!page)
        {
            return;
        }

        const updatedPages =
            pages.map((page) =>
            {
                if (
                    page.id !== block.pageId
                )
                {
                    return page;
                }

                return {
                    ...page,
                    updatedAt,
                };
            });

        setPages(updatedPages);
        savePages(updatedPages);


        // ==================================================
        // Page → Notebook
        // ==================================================

        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (
                    notebook.id !== page.notebookId
                )
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    updatedAt,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);
    }


    function handleCreateBlockAfter(
        blockId: string
    )
    {
        if (!selectedPage)
        {
            return;
        }

        const now =
            new Date().toISOString();

        const newBlock: Block =
        {
            id: crypto.randomUUID(),

            pageId:
                selectedPage.id,

            type: "empty",

            content: "",

            createdAt: now,
            updatedAt: now,
        } as Block;


        const updatedBlocks =
        [
            ...blocks,
            newBlock,
        ];

        setBlocks(updatedBlocks);
        saveBlocks(updatedBlocks);


        const updatedPages =
            pages.map((page) =>
            {
                if (
                    page.id !== selectedPage.id
                )
                {
                    return page;
                }

                const index =
                    page.blockIds.indexOf(
                        blockId
                    );

                const newBlockIds =
                    [...page.blockIds];

                newBlockIds.splice(
                    index + 1,
                    0,
                    newBlock.id
                );

                return {
                    ...page,

                    blockIds:
                        newBlockIds,

                    updatedAt: now,
                };
            });

        setPages(updatedPages);
        savePages(updatedPages);


        // Page changed → Notebook changed.
        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (
                    notebook.id !==
                    selectedPage.notebookId
                )
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    updatedAt: now,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);

        setFocusedBlockId(
            newBlock.id
        );
    }


    function handleDeleteBlock(
        blockId: string
    )
    {
        if (!selectedPage)
        {
            return;
        }

        const page =
            pages.find(
                (p) =>
                    p.id === selectedPage.id
            );

        if (!page)
        {
            return;
        }

        if (
            page.blockIds.length <= 1
        )
        {
            return;
        }

        const deletedIndex =
            page.blockIds.indexOf(
                blockId
            );

        const previousBlockId =
            page.blockIds[
                deletedIndex - 1
            ] ?? null;


        const updatedBlocks =
            blocks.filter(
                (block) =>
                    block.id !== blockId
            );

        setBlocks(updatedBlocks);
        saveBlocks(updatedBlocks);


        const updatedAt =
            new Date().toISOString();

        const updatedPages =
            pages.map((page) =>
            {
                if (
                    page.id !== selectedPage.id
                )
                {
                    return page;
                }

                return {
                    ...page,

                    blockIds:
                        page.blockIds.filter(
                            (id) =>
                                id !== blockId
                        ),

                    updatedAt,
                };
            });

        setPages(updatedPages);
        savePages(updatedPages);


        // Page changed → Notebook changed.
        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (
                    notebook.id !== page.notebookId
                )
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    updatedAt,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);

        setFocusedBlockId(
            previousBlockId
        );
    }


    function handleConvertBlock(
        blockId: string,
        type: BlockType,
        content: any
    )
    {
        const block =
            blocks.find(
                (item) =>
                    item.id === blockId
            );

        if (!block)
        {
            return;
        }

        if (
            block.type === type &&
            block.content === content
        )
        {
            return;
        }

        const updatedAt =
            new Date().toISOString();

        const updatedBlocks =
            blocks.map((block) =>
            {
                if (
                    block.id !== blockId
                )
                {
                    return block;
                }

                return {
                    ...block,
                    type,
                    content,
                    updatedAt,
                };
            });

        setBlocks(updatedBlocks);
        saveBlocks(updatedBlocks);


        // Block conversion changes the Page.
        const page =
            pages.find(
                (item) =>
                    item.id === block.pageId
            );

        if (!page)
        {
            return;
        }

        const updatedPages =
            pages.map((page) =>
            {
                if (
                    page.id !== block.pageId
                )
                {
                    return page;
                }

                return {
                    ...page,
                    updatedAt,
                };
            });

        setPages(updatedPages);
        savePages(updatedPages);


        // Page mutation propagates to Notebook.
        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (
                    notebook.id !== page.notebookId
                )
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    updatedAt,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);


        // Force UI sync boundary.
        setFocusedBlockId(
            blockId
        );
    }


    function handleCreateBlockAtEnd()
    {
        if (!selectedPage)
        {
            return;
        }

        const now =
            new Date().toISOString();

        const newBlock: Block =
        {
            id: crypto.randomUUID(),

            pageId:
                selectedPage.id,

            type: "empty",

            content: "",

            createdAt: now,
            updatedAt: now,
        } as Block;


        const updatedBlocks =
        [
            ...blocks,
            newBlock,
        ];

        setBlocks(updatedBlocks);
        saveBlocks(updatedBlocks);


        const updatedPages =
            pages.map((page) =>
            {
                if (
                    page.id !== selectedPage.id
                )
                {
                    return page;
                }

                return {
                    ...page,

                    blockIds:
                    [
                        ...page.blockIds,
                        newBlock.id,
                    ],

                    updatedAt: now,
                };
            });

        setPages(updatedPages);
        savePages(updatedPages);


        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (
                    notebook.id !==
                    selectedPage.notebookId
                )
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    updatedAt: now,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);

        setFocusedBlockId(
            newBlock.id
        );
    }


    // ==================================================
    // Canvas Actions
    // ==================================================

    function handleCanvasClick(
        event: React.MouseEvent
    )
    {
        const target =
            event.target as HTMLElement;

        if (
            target.closest("[data-block]")
        )
        {
            return;
        }

        handleCreateBlockAtEnd();
    }


    function handleInsertTaskBlock(
        taskId: string
    )
    {
        if (!selectedPage)
        {
            return;
        }

        const now =
            new Date().toISOString();

        const taskBlock: Block =
        {
            id: crypto.randomUUID(),

            pageId:
                selectedPage.id,

            type: "task",

            content:
            {
                taskId,
            },

            createdAt: now,
            updatedAt: now,
        } as Block;


        const updatedBlocks =
        [
            ...blocks,
            taskBlock,
        ];

        setBlocks(updatedBlocks);
        saveBlocks(updatedBlocks);


        const updatedPages =
            pages.map((page) =>
            {
                if (
                    page.id !== selectedPage.id
                )
                {
                    return page;
                }

                return {
                    ...page,

                    blockIds:
                    [
                        ...page.blockIds,
                        taskBlock.id,
                    ],

                    updatedAt: now,
                };
            });

        setPages(updatedPages);
        savePages(updatedPages);


        const updatedNotebooks =
            notebooks.map((notebook) =>
            {
                if (
                    notebook.id !==
                    selectedPage.notebookId
                )
                {
                    return notebook;
                }

                return {
                    ...notebook,
                    updatedAt: now,
                };
            });

        setNotebooks(updatedNotebooks);
        saveNotebooks(updatedNotebooks);


        // Focus the newly inserted task block.
        setFocusedBlockId(
            taskBlock.id
        );

        // Close the picker.
        setShowTaskPicker(false);
    }


    // ==================================================
    // Task Actions
    // ==================================================

    function handleEditTask(
        updatedTask: Task
    )
    {
        const updatedTasks =
            tasks.map((task) =>
            {
                if (
                    task.id !== updatedTask.id
                )
                {
                    return task;
                }

                return updatedTask;
            });

        setTasks(updatedTasks);
        saveTasks(updatedTasks);
    }


    function handleDeleteTask(
        taskId: string
    )
    {
        const updatedTasks =
            tasks.filter(
                (task) =>
                    task.id !== taskId
            );

        setTasks(updatedTasks);
        saveTasks(updatedTasks);
    }


    function handleCreateTask(
        task: Task
    )
    {
        setTasks((prev) =>
        {
            const updated =
            [
                ...prev,
                task,
            ];

            saveTasks(updated);

            return updated;
        });
    }


    // ==================================================
    // Return
    // ==================================================

    return {
        notebooks,
        pages,
        blocks,
        tasks,
        folders,

        selectedNotebookId,
        selectedPageId,
        focusedBlockId,
        showTaskPicker,

        setShowTaskPicker,

        selectedPage,

        handleCreateNotebook,
        handleSelectedNotebook,
        handleRenameNotebook,

        handleCreatePage,
        handleSelectedPage,
        handlePageTitleChange,

        handleUpdateBlock,
        handleCreateBlockAfter,
        handleDeleteBlock,

        handleDeletePage,
        handleRenamePage,
        handleDeleteNotebook,

        handleCreateBlockAtEnd,
        handleCanvasClick,
        handleInsertTaskBlock,

        handleEditTask,
        handleDeleteTask,
        handleConvertBlock,
        handleCreateTask,

        reloadData,

        selectedFolderId,
        handleSelectedFolder,
        handleCreateFolder,
        handleDeleteFolder,
        handleRenameFolder,
        handleAssignNotebookToFolder,
        handleRemoveNotebookFromFolder,
    };
}