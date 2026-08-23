import { useEffect, useState } from "react";

import type { Journey } from "../Features/journey/types";
import CreateTaskPopup from "../Components/CreateTaskPopup";
import { useSmoothScroll } from "../Data/useSmoothScroll";
import Tooltip from "../Components/Tooltip";
import {
    loadJourneys,
    saveJourneys,
} from "../Features/journey/Storage/journeyStorage";

import {
    createJourney,
} from "../Features/journey/Utils/JourneyFactory";

import JourneyBrowser from "../Features/journey/Browser/JourneyBrowser";

import { saveNotebooks} from "../Features/notes/storage/notebookStorage";
import { useNotesPageFunctions } from "../Features/notes/editor/NotesPageFunctions";
import BlockList from "../Features/notes/editor/BlockList";
import StartSessionPopup from "../Features/journey/Session/StartSessionPopup";
import JourneyOverview from "../Features/journey/Utils/JourneyOverview";
import { useSearchParams } from "react-router-dom";
import
{
    type JourneySession, 
    getSessionsByJourneyId, getActiveSessionForPage,

    startSession, endSession,

    getSessionDuration,

}
from "../Features/journey/Session/journeySession";

import
{
    loadSessions, addSession, updateSession,
}
from "../Features/journey/Storage/sessionStorage";
import { useAuthConnector } from "../Services/firebase/connector";

export default function JourneyPage()
{

    // ======================================================
    // STATE
    // ======================================================
     
    const currentUser = useAuthConnector();
    const smoothScroll = useSmoothScroll();

    const [journeys, setJourneys] =
        useState<Journey[]>([]);



    const [selectedJourneyId, setSelectedJourneyId] =
        useState<string | null>(null);

    const [selectedPageId, setSelectedPageId] =
        useState<string | null>(null);

        
    const [showCreateTaskPopup, setShowCreateTaskPopup] =
        useState(false);

    const [showSessionPopup, setShowSessionPopup] =
    useState(false);


    const [sessions, setSessions] =
        useState<JourneySession[]>([]);


    const [activeSession, setActiveSession] =
        useState<JourneySession | null>(null);

    const [showEditSessionPopup, setShowEditSessionPopup] =
    useState(false);

    const [searchParams] = useSearchParams();

    const {
    folders,
    notebooks,
    pages,
    blocks,
    tasks,

    focusedBlockId,
    showTaskPicker,
    setShowTaskPicker,

    handlePageTitleChange,
    handleUpdateBlock,
    handleConvertBlock,
    handleCreateBlockAfter,
    handleDeleteBlock,

    handleEditTask,
    handleDeleteTask,
    handleCanvasClick,
    handleInsertTaskBlock,
    handleCreateTask,
    handleCreatePage,
    handleDeletePage,
    handleRenamePage,

    
    handleCreateFolder,
    handleDeleteFolder,
    handleSelectedFolder,
    handleRenameFolder,
    handleAssignNotebookToFolder,
    handleRemoveNotebookFromFolder,
    selectedFolderId,
    reloadData,

} = useNotesPageFunctions({
    selectedPageId,
});

    // ======================================================
    // LOAD DATA
    // ======================================================

    useEffect(() =>
    {
        setJourneys(
            loadJourneys()
        );
    setSessions(
        loadSessions()
    );
    
     const journeyIdFromUrl =
        searchParams.get("journeyId");

    if (journeyIdFromUrl)
    {
        setSelectedJourneyId(journeyIdFromUrl);
    }
    
    }, []);


    // ======================================================
    // CREATE JOURNEY
    // ======================================================

    function handleCreateJourney()
    {
        const userId = currentUser?.uid ?? null;

        const {
            journey,
            notebook,
        } =
            createJourney(userId);



        const updatedJourneys =
        [
            ...journeys,
            journey,
        ];



        const updatedNotebooks =
        [
            ...notebooks,
            notebook,
        ];



        saveJourneys(
            updatedJourneys
        );
       
        setJourneys(
            updatedJourneys
        );

        saveNotebooks(updatedNotebooks);
        reloadData();



        setSelectedJourneyId(
            journey.journeyId
        );
    }





    // ======================================================
    // SELECT JOURNEY
    // ======================================================

    function handleSelectJourney(
        journeyId:string
    )
    {
        setSelectedJourneyId(
            journeyId
        );


        setSelectedPageId(
            null
        );
    }





    // ======================================================
    // SELECT PAGE
    // ======================================================

    function handleSelectPage(
        pageId:string
    )
    {
        setSelectedPageId(
            pageId
        );

          const session =
        getActiveSessionForPage(
            pageId
        );

    setActiveSession(
        session
    );
    }



    // ======================================================
    // SESSION
    // ======================================================



function handleStartSession(data:
{
    type:string;
    plannedDuration:number;
    mood:string;
    goal:string;
})
{

    if(!selectedJourneyId)
    {
        return;
    }


    const selectedJourney =
        journeys.find(
            (journey) =>
                journey.journeyId === selectedJourneyId
        );


    if(!selectedJourney)
    {
        return;
    }

 if(!selectedPageId)
    {
        // Defensive fallback — shouldn't happen since the popup can
        // only be triggered from a selected page, but keeps this
        // function safe if that ever changes.
        return;
    }

    const session: JourneySession =
{
    sessionId:
        crypto.randomUUID(),

    journeyId:
        selectedJourneyId,

    pageId:
        selectedPageId,

    status:
        "Planning",


    createdAt:
        new Date().toISOString(),

    startedAt:
        undefined,

    endedAt:
        undefined,

    type:
        data.type,

    plannedDuration:
        data.plannedDuration,

    mood:
        data.mood as any,

    goal:
        data.goal,
};


    const updatedSessions =
        addSession(session);


    setSessions(
        updatedSessions
    );


setShowSessionPopup(false);
}


// START ACTIVE SESSION
function handleActivateSession()
{
    if(!activeSession)
    {
        return;
    }


    const updatedSession =
        startSession(
            activeSession.sessionId
        );


    if(!updatedSession)
    {
        return;
    }


    setSessions(
        loadSessions()
    );


    setActiveSession(
        updatedSession
    );
}



// END SESSION
function handleEndSession()
{
    if(!activeSession)
    {
        return;
    }


    const updatedSession =
        endSession(
            activeSession.sessionId
        );


    if(!updatedSession)
    {
        return;
    }


    setSessions(
        loadSessions()
    );


    setActiveSession(
        updatedSession
    );
}

function handleEditSession(data:
{
    type:string;
    plannedDuration:number;
    mood:string;
    goal:string;
})
{
    if(!activeSession)
    {
        return;
    }

    const updatedSession: JourneySession =
    {
        ...activeSession, 

        type:
            data.type,

        plannedDuration:
            data.plannedDuration,

        mood:
            data.mood as any,

        goal:
            data.goal,
    };

    updateSession(updatedSession);

    setSessions(
        loadSessions()
    );

    setActiveSession(
        updatedSession
    );

    setShowEditSessionPopup(false);
}

// ======================================================
// ACTIVE SESSION
// ======================================================

useEffect(() =>
{
    if (!selectedPageId)
    {
        setActiveSession(null);
        return;
    }

    const session =
        getActiveSessionForPage(
            selectedPageId
        );

    setActiveSession(
        session
    );

}, [
    selectedPageId,
    sessions,
]);



    // ======================================================
    // DELETE NOTEBOOK
    // ======================================================

    function handleDeleteNotebook(
        notebookId:string
    )
    {

          const deletedJourney =
        journeys.find(
            (journey) =>
                journey.notebookId === notebookId
        );

        const updatedNotebooks =
            notebooks.filter(
                (notebook)=>
                    notebook.id !== notebookId
            );


        const updatedJourneys =
            journeys.filter(
                (journey)=>
                    journey.notebookId !== notebookId
            );



        saveJourneys(updatedJourneys);
        saveNotebooks(updatedNotebooks);

        reloadData();

        setJourneys(updatedJourneys
        );



    if(
        deletedJourney &&
        deletedJourney.journeyId === selectedJourneyId
    )
    {
        setSelectedJourneyId(null);
        setSelectedPageId(null);
    }
}




    // ======================================================
    // RENAME NOTEBOOK
    // ======================================================

    function handleRenameNotebook(
        notebookId:string,
        title:string
    )
    {
         const updatedAt =
            new Date().toISOString();


        const updatedNotebooks =
            notebooks.map(
                (notebook)=>
                {

                    if(
                        notebook.id === notebookId
                    )
                    {
                        return {
                            ...notebook,
                            title,
                            updatedAt,
                        };
                    }


                    return notebook;

                }
            );

        saveNotebooks(updatedNotebooks);
        reloadData();

    // 2026-08-22: Propagate Notebook mutation to its owning Journey.
    const updatedJourneys =
        journeys.map(
            (journey) =>
            {
                if(
                    journey.notebookId !== notebookId
                )
                {
                    return journey;
                }

                return {
                    ...journey,
                    updatedAt,
                };
            }
        );

    // 2026-08-22: Persist Journey mutation after its Notebook changed.
    saveJourneys(updatedJourneys);

    // 2026-08-22: Keep Journey state synchronized with the propagated Notebook mutation.
    setJourneys(updatedJourneys);
}


    // ======================================================
    // SELECTED PAGE, JOURNEY, NOTEBOOK
    // ======================================================

    const selectedPage =
        pages.find(
            (page)=>
                page.id === selectedPageId
        );

        const selectedJourney =
    journeys.find(
        (journey) =>
            journey.journeyId === selectedJourneyId
    );


const selectedNotebook =
    notebooks.find(
        (notebook) =>
            notebook.id === selectedJourney?.notebookId
    );


const journeySessions =
    selectedJourney
        ?
        getSessionsByJourneyId(
            selectedJourney.journeyId
        )
        :
        [];
        
        
const [journeyBrowserCollapsed, setJourneyBrowserCollapsed] =
    useState(false);


const journeyBrowserBasis =
    journeyBrowserCollapsed
        ? "10%"
        : "22%";


    // ======================================================
    // RENDER
    // ======================================================

    return (

        <div
            style={{
                display:"flex",
                height:"100vh",
                backgroundColor:
                    "rgba(20,12,55,0.38)",
            }}
        >

        <div
            style={{
                flex: `0 0 ${journeyBrowserBasis}`,
                minWidth: 0,
                overflow: "hidden",
            }}
        >

         <JourneyBrowser

    folders={folders}
    journeys={journeys}
    notebooks={notebooks}
    pages={pages}

    selectedJourneyId={selectedJourneyId}
    selectedFolderId={selectedFolderId}
    selectedPageId={selectedPageId}


    onCreateJourney={
        handleCreateJourney
    }

    onSelectedJourney={
        handleSelectJourney
    }


    onSelectedFolder={
        handleSelectedFolder
    }
    onRemoveNotebookFromFolder={handleRemoveNotebookFromFolder}

    onCreateFolder={
        handleCreateFolder
    }

    onDeleteFolder={
        handleDeleteFolder
    }

    onRenameFolder={
        handleRenameFolder
    }


    onSelectedPage={
        handleSelectPage
    }

    onCreatePage={
        handleCreatePage
    }

    onDeletePage={
        handleDeletePage
    }

    onRenamePage={
        handleRenamePage
    }


    onDeleteNotebook={
        handleDeleteNotebook
    }

    onRenameNotebook={
        handleRenameNotebook
    }
    onAssignNotebookToFolder={ handleAssignNotebookToFolder}

    onCollapseChange={setJourneyBrowserCollapsed}

/>
</div>


            <main
                style={{
                    flex:1,
                    minWidth: 0,
                    display:"flex",
                    justifyContent:"center",
                    padding:"clamp(12px, 4vw, 40px)",
                    overflowY:"auto",
                    overflowX:"hidden",
                }}
            >
            {  selectedPage  ?
    (
        <div
            style={{
                width:"95%",
                maxWidth: "100%",
                boxSizing: "border-box",
                backgroundColor:"rgba(20,12,55,0.38)",
                borderRadius:"10px",
                padding: "clamp(16px, 4vw, 48px)",
                minHeight:"900px",
            }}
        >

                        {/* PAGE TITLE */}
                           
            <input
                type="text"
                value={selectedPage.title}
                onChange={(e)=>
                    handlePageTitleChange(  e.target.value
                    )
                }
                
                  placeholder="Untitled Session"
                style={{
                    width:"100%",
                    boxSizing: "border-box",
                    fontSize:"clamp(1.5rem, 5vw, 2.5rem)",
                    fontWeight:"bold",
                    background:"transparent",
                    border:"none",
                    outline:"none",
                }}
            />

                        {/* SESSION META */}

                        <div
                            style={{
                                display:"flex",
                                flexWrap: "wrap",
                                gap:"10px",
                                marginTop:"20px",
                            }}
                        >

                            {/* PLAN SESSION */}
                            <Tooltip text="Set up a reason, duration, mood, and goal for this session">
                                <button
                                    onClick={() =>
                                        setShowSessionPopup(true)
                                    }
                                >
                                    Plan Session
                                </button>
                            </Tooltip>

                            <Tooltip text="Adjust the plan before or during the session">
                                <button
                                    onClick={() =>
                                        setShowEditSessionPopup(true)
                                    }
                                    disabled={
                                        !activeSession ||
                                        activeSession.status === "Completed"
                                    }
                                >
                                    Edit Session
                                </button>
                            </Tooltip>

                            {/* START SESSION */}
                            <Tooltip text="Begin the session and start tracking the actual time">
                                <button
                                    onClick={handleActivateSession}
                                    disabled={
                                        !activeSession ||
                                        activeSession.status !== "Planning"
                                    }
                                >
                                    Start Session
                                </button>
                            </Tooltip>


                            {/* END SESSION */}
                            <Tooltip text="Wrap up the session and log the actual time it took">
                                <button
                                    onClick={handleEndSession}
                                    disabled={
                                        !activeSession ||
                                        activeSession.status !== "Active"
                                    }
                                >
                                    End Session
                                </button>
                            </Tooltip>

                        </div>


                        {
                            activeSession &&
                            (
                            <div
                            style={{
                                marginTop:"20px",
                                padding:"16px",
                                borderRadius:"8px",
                                background:"rgba(255,255,255,.05)",
                            }}
                            >

                            <h3>
                                Session
                            </h3>

                            <p>
                                <strong>Status:</strong>{" "}
                                {activeSession.status}
                            </p>

                            <p>
                                <strong>Type:</strong>{" "}
                                {activeSession.type}
                            </p>

                            <p>
                                <strong>Mood:</strong>{" "}
                                {activeSession.mood}
                            </p>


                            <hr style={{ margin:"20px 0" }}/>


                            <h4>
                                Planning
                            </h4>

                            <p>
                                <strong>Goal:</strong>{" "}
                                {activeSession.goal}
                            </p>

                            <p>
                                <strong>Planned Duration:</strong>{" "}
                                {activeSession.plannedDuration}
                                {" "}
                                minutes
                            </p>


                            <hr style={{ margin:"20px 0" }}/>


                            <h4>
                                Timeline
                            </h4>

                            <p>
                                <strong>Created:</strong>{" "}
                                {
                                    activeSession.createdAt
                                        ? new Date(
                                            activeSession.createdAt
                                        ).toLocaleString()
                                        : "Unknown"
                                }
                            </p>

                            <p>
                                <strong>Started:</strong>{" "}
                                {
                                    activeSession.startedAt
                                        ? new Date(
                                            activeSession.startedAt
                                        ).toLocaleString()
                                        : "Not started"
                                }
                            </p>

                            <p>
                                <strong>Ended:</strong>{" "}
                                {
                                    activeSession.endedAt
                                        ? new Date(
                                            activeSession.endedAt
                                        ).toLocaleString()
                                        : "Not completed"
                                }
                            </p>


                            <hr style={{ margin:"20px 0" }}/>


                            <h4>
                                Results
                            </h4>

                            <p>
                                <strong>Actual Duration:</strong>{" "}
                                {
                                    getSessionDuration(
                                        activeSession
                                    )
                                }
                                {" "}
                                minutes
                            </p>

                            </div>
                            )
                            }
                                               {
                            showSessionPopup &&
                            (
                                <StartSessionPopup

                                    onClose={() =>
                                        setShowSessionPopup(false)
                                    }

                                    onStart={
                                        handleStartSession
                                    }

                                />
                            )
                        }
                        {
                            showEditSessionPopup && activeSession &&
                            (
                                <StartSessionPopup
                                    mode="edit"

                                    initialData={{
                                        type: activeSession.type,
                                        plannedDuration: activeSession.plannedDuration,
                                        mood: activeSession.mood,
                                        goal: activeSession.goal,
                                    }}

                                    onClose={() =>
                                        setShowEditSessionPopup(false)
                                    }

                                    onStart={
                                        handleEditSession
                                    }
                                />
                            )
                        }


                        {/* TASK CREATION */}

                       
                        {
                            showCreateTaskPopup &&
                            (
                                <CreateTaskPopup

                                    onClose={() =>
                                        setShowCreateTaskPopup(false)
                                    }

                                    onCreate={(task) =>
                                    {
                                        handleCreateTask(task);

                                        setShowCreateTaskPopup(false);
                                    }}

                                />
                            )
                        }
                       <div
                            style={{
                                display:"flex",
                                flexWrap: "wrap",
                                gap:"10px",
                                marginTop:"20px",
                            }}
                        >
                         <Tooltip text="Create a brand new task from scratch">
                            <button
                                onClick={() =>
                                    setShowCreateTaskPopup(true)
                                }
                                    style={{
                                        padding: "10px",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontWeight: "bold",
            }}

                            >
                                + Create New Task
                            </button>
                        </Tooltip>




                        {/* TASK PICKER */}

                        <Tooltip text="Drop an existing task into this page">
                            <button
                                onClick={() =>
                                    setShowTaskPicker(true)
                                }

                               style={{
                                    padding: "10px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                + Add Task Block
                            </button>
                        </Tooltip>
                            </div>
                        {showTaskPicker && (
                            <div
                                className={`popover-panel${smoothScroll ? "" : " no-motion"}`}
                                style={{
                                    position: "absolute",
                                    top: 160,
                                    right: "clamp(16px, 4vw, 48px)",
                                    width: "min(300px, calc(100vw - 32px))",
                                    maxWidth: "calc(100vw - 32px)",
                                    boxSizing: "border-box",
                                    background: "#1a1a2e",
                                    borderRadius: 8,
                                    padding: 12,
                                    zIndex: 1000,
                                }}
                            >
                                <h4>Select Task</h4>

                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() =>
                                            handleInsertTaskBlock(task.id)
                                        }
                                        style={{
                                            padding: "10px",
                                            cursor: "pointer",
                                            overflowWrap: "anywhere",
                                            borderBottom:
                                                "1px solid rgba(255,255,255,.15)",
                                        }}
                                    >
                                        {task.title}
                                    </div>
                                ))}

                                <button
                                    onClick={() => setShowTaskPicker(false)}
                                >
                                    Close
                                </button>
                            </div>
                        )}


            <hr
                style={{
                    margin:"40px 0"
                }}
            />

                {/* BLOCK EDITOR */}
            <div
                onClick={handleCanvasClick}
                style={{
                flex: 1,
                width: "100%",
                minHeight: "clamp(320px, 60vh, 600px)",
                paddingBottom: "clamp(48px, 8vh, 120px)",
                cursor: "text",
                }}
            >
            <BlockList

                page={selectedPage}
                blocks={blocks}
                tasks={tasks}
                onUpdateBlock={handleUpdateBlock}
                onConvertBlock={handleConvertBlock}
                onCreateBlockAfter={handleCreateBlockAfter}
                onDeleteBlock={handleDeleteBlock}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                focusedBlockId={focusedBlockId}

            />
            </div>
        </div>
    )

    :
selectedJourneyId
?
(
    <JourneyOverview

        journey={
            selectedJourney ?? null
        }

        notebookTitle={
            selectedNotebook?.title ?? ""
        }

        sessions={
            journeySessions
        }

    />
)
:
(
    <div
        style={{
            display:"flex",
            justifyContent:"center",
            alignItems:"center",
            width:"100%",
            color:"#777",
            fontSize:"clamp(1rem, 2.5vw, 1.2rem)",
        }}
    >
        Select or create a journey.
    </div>
)
}

</main>


        </div>

    );

}