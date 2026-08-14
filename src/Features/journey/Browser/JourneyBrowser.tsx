import type { Journey } from "../types";
import type { NotebookFolder, Notebook, Page } from "../../notes/types";
import { useState } from "react";
import { Road, PanelLeft } from "lucide-react"; 
import { useConfirmDelete } from "../../../Components/ConfirmDialog";
import SortControl from "../../../Components/SortControl";
import type { SortDirection } from "../../../Components/SortControl";
import Tooltip from "../../../Components/Tooltip";

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

}: JourneyBrowserProps)

{

    const [editingFolderId, setEditingFolderId] =
        useState<string | null>(null);

    const [editingFolderTitle, setEditingFolderTitle] =
        useState("");

    const [editingJourneyId, setEditingJourneyId] =
        useState<string | null>(null);

    const [editingTitle, setEditingTitle] =
        useState("");

    const [editingPageId, setEditingPageId] =
        useState<string | null>(null);

    const [editingPageTitle, setEditingPageTitle] =
        useState("");


    const { requestDelete, confirmDialog } =
        useConfirmDelete();

    const [showAddExistingPopup, setShowAddExistingPopup] =
    useState(false);


    const [sortField, setSortField] =
        useState("created");

    const [sortDirection, setSortDirection] =
        useState<SortDirection>("desc");

     const [collapsed, setCollapsed] =
        useState(false);


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

const looseJourneys =
    journeys.filter(
        (journey) =>
        {
            const notebook =
                notebooks.find(
                    n =>
                    n.id === journey.notebookId
                );

            return notebook && !notebook.folderId;
        }
    );


    const selectedFolder =
        folders.find(
            (folder) =>
                folder.id === selectedFolderId
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



    function startEditingFolder(
        folder: NotebookFolder
    )
    {
        setEditingFolderId(folder.id);
        setEditingFolderTitle(folder.title);
    }



    function commitFolderRename()
    {
        if(!editingFolderId)
            return;


        onRenameFolder(
            editingFolderId,
            editingFolderTitle.trim() ||
            "Untitled Folder"
        );


        setEditingFolderId(null);
    }



    function startEditingJourney(
        journey: Journey
    )
    {
        const notebook =
            notebooks.find(
                (n) =>
                    n.id === journey.notebookId
            );


        if(!notebook)
            return;


        setEditingJourneyId(
            journey.journeyId
        );


        setEditingTitle(
            notebook.title
        );
    }



    function commitJourneyRename()
    {
        if(!editingJourneyId)
            return;


        const journey =
            journeys.find(
                (j) =>
                    j.journeyId === editingJourneyId
            );


        if(!journey)
            return;


        onRenameNotebook(
            journey.notebookId,
            editingTitle.trim() ||
            "Untitled Journey"
        );


        setEditingJourneyId(null);
    }



    function startEditingPage(
        page: Page
    )
    {
        setEditingPageId(page.id);
        setEditingPageTitle(page.title);
    }



    function commitPageRename()
    {
        if(!editingPageId)
            return;


        onRenamePage(
            editingPageId,
            editingPageTitle.trim() ||
            "Untitled Page"
        );


        setEditingPageId(null);
    }

    function handleAddExistingJourney(notebookId:string)
{
    if(!selectedFolderId)
        return;

    onAssignNotebookToFolder(
        notebookId,
        selectedFolderId
    );

    setShowAddExistingPopup(false);
}


    function handleRenameButtonClick()
    {
        if(selectedPageId)
        {
            const page =
                pages.find(
                    p =>
                        p.id === selectedPageId
                );


            if(page)
            {
                startEditingPage(page);
                return;
            }
        }


        if(selectedJourneyId)
        {
            const journey =
                journeys.find(
                    j =>
                        j.journeyId === selectedJourneyId
                );


            if(journey)
            {
                startEditingJourney(journey);
                return;
            }
        }


        if(selectedFolder)
        {
            startEditingFolder(
                selectedFolder
            );
        }
    }    function renderJourneyRow(
        journey: Journey
    )
    {
        const isSelected =
            selectedJourneyId === journey.journeyId;


        const notebook =
            notebooks.find(
                (n) =>
                    n.id === journey.notebookId
            );


        if(!notebook)
            return null;


        const notebookPages =
            pages.filter(
                (page) =>
                    page.notebookId === notebook.id
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
                             startEditingJourney( journey ) }
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
                                ? "rgba(20,12,55,0.38)"
                                : "transparent",
                        }}
                    >

                        {
                            editingJourneyId === journey.journeyId
                            ?

                            <input
                                autoFocus

                                onClick={(e) =>
                                    e.stopPropagation()
                                }
                                 value={editingTitle}

                                onChange={(e) =>
                                    setEditingTitle(
                                        e.target.value
                                    )
                                }  onBlur={
                                    commitJourneyRename
                                }

                                onKeyDown={(e) =>
                                {
                                    if(e.key === "Enter")
                                    {
                                        commitJourneyRename();
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
                                                            ? "rgba(20,12,55,0.38)"
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
                        onClick={() => setCollapsed((c) => !c)}
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
                                const notebook =
                                    notebooks.find(
                                        n =>
                                        n.id === journey.notebookId
                                    );

                                return notebook?.folderId === folder.id;
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
                        const notebook =
                            notebooks.find(
                                n =>
                                n.id === journey.notebookId
                            );

                        if(!notebook)
                            return null;


                        return (
                            <button
                                key={journey.journeyId}
                                onClick={() =>
                                    handleAddExistingJourney(
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
