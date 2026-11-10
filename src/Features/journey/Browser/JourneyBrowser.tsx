import type { Journey } from "../types";
import type { NotebookFolder, Notebook, Page } from "../../notes/types";
import { useState } from "react";
import { Road, PanelLeft } from "lucide-react"; 
import { useConfirmDelete } from "../../../Components/ConfirmDialog";
import SortControl from "../../../Components/SortControl";
import type { SortDirection } from "../../../Components/SortControl";
import Tooltip from "../../../Components/Tooltip";
// 2026-11-10: reuse Notebook browser behavior instead of duplicating it
import
{
    useNotebookBrowserState,
    getNotebookPages,
}
from "../../notes/browser/useNotebookBrowserState";

import
{
    sortJourneysByTitle,
    sortJourneysByCreatedDate,
    sortJourneysByRecentActivity,
    sortJourneysBySessionCount,
}
from "../Utils/journeySorting";


interface JourneyBrowserProps
{
    folders: NotebookFolder[];
    journeys: Journey[];
    notebooks: Notebook[];
    pages: Page[];

    selectedJourneyId: string | null;
    selectedFolderId: string | null;
    selectedPageId: string | null;

    onCreateJourney: () => void;
    onSelectedJourney: (journeyId: string) => void;

    onSelectedFolder: (folderId: string | null) => void;
    onCreateFolder: () => void;
    onDeleteFolder: (folderId: string) => void;
    onRenameFolder: (
        folderId: string,
        title: string
    ) => void;

    onSelectedPage: (pageId: string) => void;
    onCreatePage: (notebookId: string) => void;
    onDeletePage: (pageId: string) => void;
    onRenamePage: (
        pageId: string,
        title: string
    ) => void;

    onDeleteNotebook: (notebookId: string) => void;

    onRenameNotebook: (
        notebookId: string,
        title: string
    ) => void;
    onAssignNotebookToFolder:
(
    notebookId:string,
    folderId:string
) => void;

onRemoveNotebookFromFolder:
(
    notebookId:string
) => void;

collapsed: boolean;
onCollapseChange: (collapsed: boolean) => void;
}


export default function JourneyBrowser(
{
    folders,
    journeys,
    notebooks,
    pages,

    selectedJourneyId,
    selectedFolderId,
    selectedPageId,

    onCreateJourney,
    onSelectedJourney,

    onSelectedFolder,
    onCreateFolder,
    onDeleteFolder,
    onRenameFolder,

    onSelectedPage,
    onCreatePage,
    onDeletePage,
    onRenamePage,

    onDeleteNotebook,
    onRenameNotebook,
    onAssignNotebookToFolder,
    onRemoveNotebookFromFolder,

    
    collapsed,
    onCollapseChange,

}: JourneyBrowserProps)

{

    // 2026-11-10: rename + add-existing behavior now comes from the Notebook hook
    // (previously separate useState calls and handlers duplicated here)
    // A Journey is backed by a Notebook; the Notebook is what the
    // shared browser behavior (rename, add-existing) operates on.
    const selectedNotebookId =
        journeys.find(
            (journey) =>
                journey.journeyId === selectedJourneyId
        )?.notebookId ?? null;

    const
    {
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
    } = useNotebookBrowserState({
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

        untitledNotebookTitle: "Untitled Journey",
    });


    const { requestDelete, confirmDialog } =
        useConfirmDelete();


    const [sortField, setSortField] =
        useState("created");

    const [sortDirection, setSortDirection] =
        useState<SortDirection>("desc");



    const sortFieldOptions =
    [
        {
            value:"title",
            label:"Title"
        },

        {
            value:"created",
            label:"Created"
        },

        {
            value:"activity",
            label:"Recent Activity"
        },

        {
            value:"count",
            label:"Session Count"
        },
    ];

    // 2026-11-10: single lookup replacing 4 repeated notebooks.find(...) calls
    // A Journey is backed by exactly one Notebook.
    function notebookOf(journey: Journey)
    {
        return notebooks.find((n) => n.id === journey.notebookId);
    }

const looseJourneys =
    journeys.filter(
        (journey) =>
        {
            const notebook = notebookOf(journey);

            return notebook && !notebook.folderId;
        }
    );



    function getSortedJourneys()
    {
        switch(sortField)
        {
            case "title":
                return sortJourneysByTitle(
                    journeys,
                    notebooks,
                    sortDirection
                );

            case "activity":
                return sortJourneysByRecentActivity(
                    journeys,
                    sortDirection
                );

            case "count":
                return sortJourneysBySessionCount(
                    journeys,
                    sortDirection
                );

            default:
                return sortJourneysByCreatedDate(
                    journeys,
                    sortDirection
                );
        }
    }


    const sortedJourneys =
        getSortedJourneys();


    // 2026-11-10: startEditingFolder/commitFolderRename, startEditingJourney/
    // commitJourneyRename, startEditingPage/commitPageRename, handleAddExistingJourney
    // and handleRenameButtonClick removed — provided by useNotebookBrowserState.

    function renderJourneyRow(
        journey: Journey
    )
    {
        const isSelected =
            selectedJourneyId === journey.journeyId;


        // 2026-11-10: notebookOf(journey)
        const notebook = notebookOf(journey);


        if(!notebook)
            return null;


        // 2026-11-10: page lookup via shared getNotebookPages
        const notebookPages =
            getNotebookPages(
                pages,
                notebook.id
            );


        return (

            <div
                key={journey.journeyId}
                className ="journey-browser-journey"
            >

                <div
                    style={{
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"space-between",
                        gap:"8px",
                    }}
                >

                    <button
                        onClick={() =>  
                                onSelectedJourney(  journey.journeyId ) }
                        onDoubleClick={() =>
                             startEditingNotebook( notebook ) }
                        style={{
                            flex:1,
                            textAlign:"left",
                            cursor:"pointer",
                            padding:"8px 10px",
                            borderRadius:"6px",

                            fontWeight:
                                isSelected
                                ? "bold"
                                : "normal",

                            backgroundColor:
                                isSelected
                                ? "rgba(20,12,55,0.98)"
                                : "transparent",
                        }}
                    >

                        {/* 2026-11-10: inline rename uses shared notebook state
                            (startEditingNotebook / commitNotebookRename) */}
                        {
                            editingNotebookId === notebook.id
                            ?

                            <input
                                autoFocus

                                onClick={(e) =>
                                    e.stopPropagation()
                                }
                                 value={editingTitle}

                                onChange={(e) => setEditingTitle(
                                        e.target.value )
                                }  onBlur={() =>
                                    commitNotebookRename(
                                        notebook.id
                                    )
                                }

                                onKeyDown={(e) =>
                                {
                                    if(e.key === "Enter")
                                    {
                                        commitNotebookRename(
                                            notebook.id
                                        );
                                    }
                                }}

                                style={{
                                    width:"100%",
                                    border:"none",
                                    outline:"none",
                                    background:"transparent",
                                    color:"inherit",
                                    font:"inherit",
                                }}
                            />

                            :

                            notebook.title
                        }

                    </button>


                          {/* Remove From Folder */}
                    {notebook.folderId && (
                        
                <button
                    onClick={() =>
                        onRemoveNotebookFromFolder(
                            notebook.id
                        )
                    }
                    style={{
                        border:"none",
                        background:"transparent",
                        cursor:"pointer",
                        opacity:0.6,
                        fontSize:"0.8rem",
                    }}
                    title="Remove from folder"
                >
                    ↩ Remove
                </button>
            )}


            <Tooltip text="Delete this journey and all of its sessions">
            <button
                onClick={() =>
                    requestDelete(
                        `Delete "${notebook.title || "Untitled Journey"}" and all of its sessions?`,
                        () =>
                            onDeleteNotebook(
                                notebook.id
                            )
                    )
                }
                style={{
                    border:"none",
                    background:"transparent",
                    cursor:"pointer",
                    opacity:0.5,
                }}
            >
                X
            </button>
            </Tooltip>

                </div>



                {
                    isSelected &&
                    <>

                        <div
                            style={{
                                marginLeft:"18px",
                                marginTop:"12px",
                                display:"flex",
                                flexDirection:"column",
                                gap:"6px",
                            }}
                        >

                            {
                                notebookPages.length === 0 &&
                                <div
                                    style={{
                                        opacity:0.6,
                                        fontSize:"0.85rem",
                                    }}
                                >
                                    No Sessions yet.
                                </div>
                            }


                            {
                                notebookPages.map(
                                    (page) =>
                                    {

                                        const isSelectedPage =
                                            selectedPageId === page.id;


                                        return (

                                            <div
                                                key={page.id}
                                                style={{
                                                    display:"flex",
                                                    alignItems:"center",
                                                    gap:"6px",
                                                }}
                                            >

                                                <button
                                                    onClick={() =>
                                                        onSelectedPage(
                                                            page.id
                                                        )
                                                    }

                                                    onDoubleClick={() =>
                                                        startEditingPage(
                                                            page
                                                        )
                                                    }

                                                    style={{
                                                        flex:1,
                                                        textAlign:"left",
                                                        padding:"6px 8px",
                                                        borderRadius:"4px",
                                                        cursor:"pointer",

                                                        backgroundColor:
                                                            isSelectedPage
                                                            ? "rgba(20,12,55,0.68)"
                                                            : "transparent",
                                                    }}
                                                >

                                                    {
                                                        editingPageId === page.id
                                                        ?

                                                        <input
                                                            autoFocus

                                                            value={editingPageTitle}

                                                            onChange={(e) =>
                                                                setEditingPageTitle(
                                                                    e.target.value
                                                                )
                                                            }

                                                            onBlur={
                                                                commitPageRename
                                                            }

                                                            onKeyDown={(e) =>
                                                            {
                                                                if(e.key === "Enter")
                                                                {
                                                                    commitPageRename();
                                                                }
                                                            }}
                                                        />

                                                        :

                                                        page.title
                                                    }

                                                </button>


                                                <Tooltip text="Delete this session">
                                                <button
                                                    onClick={() =>
                                                        requestDelete(
                                                            `Delete "${page.title}"?`,
                                                            () =>
                                                                onDeletePage(
                                                                    page.id
                                                                )
                                                        )
                                                    }
                                                >
                                                    X
                                                </button>
                                                </Tooltip>

                                            </div>

                                        );
                                    }
                                )
                            }

                        </div>


                        <Tooltip text="Add a new session page to this journey">
                        <button
                            onClick={() =>
                                onCreatePage(
                                    notebook.id
                                )
                            }

                            style={{
                                marginTop:"10px",
                                marginLeft:"18px",
                                padding:"6px 10px",
                            }}
                        >
                            + New Session
                        </button>
                        </Tooltip>

                    </>
                }

            </div>

        );
    }



    return (

        <>
        {confirmDialog}

  <aside className={`browser-panel${collapsed ? " browser-panel--collapsed" : ""}`}>
            <div className="browser-panel-header">
                <Tooltip text={collapsed ? "Expand Journeys" : "Collapse Journeys"}>
                    <button
                        className="browser-panel-toggle"
                        onClick={() =>onCollapseChange(!collapsed)}
                        aria-label="Toggle journeys panel"
                    >
                        {collapsed ? <Road size={18} /> : <PanelLeft size={18} />}
                    </button>
                </Tooltip>
                {!collapsed && <span className="browser-panel-label">Journeys</span>}
            </div>

            {!collapsed && (
            <div className="browser-panel-body">


            {/* ================= Create Journey / Folder ================= */}

            <div
                style={{
                    display:"flex",
                    gap:"10px",
                    marginTop: "20px",
                    marginBottom:"20px",
                    flexWrap:"wrap",
                }}
            >

                <button
                    onClick={onCreateFolder}
                    style={{
                        flex:1,
                        padding:"10px",
                            fontWeight: "bold",
                    }}
                >
                    + New Folder
                </button>


                <Tooltip text="Start a new long-running project with its own notebook">
                <button
                    onClick={onCreateJourney}
                    style={{
                        flex:1,
                        padding:"10px",
                            fontWeight: "bold",
                    }}
                >
                    + New Journey
                </button>
                </Tooltip>


                <button
                    onClick={handleRenameButtonClick}
                    style={{
                        width:"100%",
                        padding:"10px",
                        fontWeight: "bold",
                    }}
                >
                    Rename
                </button>


                <SortControl
                    fields={sortFieldOptions}
                    currentField={sortField}
                    currentDirection={sortDirection}

                    onChange={(field,direction) =>
                    {
                        setSortField(field);
                        setSortDirection(direction);
                    }}
                />

            </div>



            {folders.map(
                (folder) =>
                {

                    const isFolderSelected =
                        selectedFolderId === folder.id;


                    const folderJourneys =
                        sortedJourneys.filter(
                            (journey) =>
                            {
                                // 2026-11-10: notebookOf(journey)
                                return notebookOf(journey)?.folderId === folder.id;
                            }
                        );


                    return (

                        <div
                            key={folder.id}
                            style={{
                                marginBottom:"18px",
                            }}
                        >

                            <div
                                style={{
                                    display:"flex",
                                    justifyContent:"space-between",
                                }}
                            >

                                <button
                                    onClick={() =>
                                        onSelectedFolder(
                                            folder.id
                                        )
                                    }

                                    onDoubleClick={() =>
                                        startEditingFolder(
                                            folder
                                        )
                                    }
                                >

                                    {
                                        editingFolderId === folder.id
                                        ?

                                        <input
                                            autoFocus
                                            value={editingFolderTitle}

                                            onChange={(e) =>
                                                setEditingFolderTitle(
                                                    e.target.value
                                                )
                                            }

                                            onBlur={
                                                commitFolderRename
                                            }

                                        />

                                        :

                                        `📁 ${folder.title}`
                                    }

                                </button>


                                <button
                                    onClick={() =>
                                        requestDelete(
                                            `Delete folder "${folder.title}"?`,
                                            () =>
                                                onDeleteFolder(
                                                    folder.id
                                                )
                                        )
                                    }
                                >
                                    X
                                </button>

                            </div>


                            {
    isFolderSelected &&
    (
        <div
            style={{
                marginTop:"12px",
                marginLeft:"18px",
            }}
        >
            <button
    onClick={() =>
        setShowAddExistingPopup(true)
    }
    style={{
        marginBottom:"10px",
        padding:"6px 10px",
    }}
>
    + Add Existing Journey
</button>


{
    showAddExistingPopup &&
    (
        <div
            style={{
                marginBottom:"12px",
                padding:"10px",
                background:"#1a1a2e",
                borderRadius:"8px",
            }}
        >

            {
                looseJourneys.map(
                    (journey) =>
                    {
                        // 2026-11-10: notebookOf(journey); click uses shared handleAddExistingNotebook
                        const notebook = notebookOf(journey);

                        if(!notebook)
                            return null;


                        return (
                            <button
                                key={journey.journeyId}
                                onClick={() =>
                                    handleAddExistingNotebook(
                                        notebook.id
                                    )
                                }
                                style={{
                                    display:"block",
                                    width:"100%",
                                    marginBottom:"6px",
                                }}
                            >
                                {notebook.title}
                            </button>
                        );
                    }
                )
            }

            <button
                onClick={() =>
                    setShowAddExistingPopup(false)
                }
            >
                Close
            </button>

        </div>
    )
}

            {
                folderJourneys.length === 0 &&
                (
                    <div
                        style={{
                            opacity:0.6,
                            fontSize:"0.85rem",
                        }}
                    >
                        No journeys in this folder yet.
                    </div>
                )
            }


            {
                folderJourneys.map(
                    renderJourneyRow
                )
            }

        </div>
    )
}

                        </div>

                    );

                }
            )}



            {looseJourneys.map(
                renderJourneyRow
            )}


            </div>
            )}
        </aside>

        </>

    );
}