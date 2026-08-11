import { useNotesPageFunctions } from "../Features/notes/editor/NotesPageFunctions";
import { useState } from "react";
import NotebookBrowser from "../Features/notes/browser/NotebookBrowser";
import BlockList from "../Features/notes/editor/BlockList";
import CreateTaskPopup from "../Components/CreateTaskPopup";
import { useSmoothScroll } from "../Data/useSmoothScroll";
import Tooltip from "../Components/Tooltip";

interface NotesPageProps {
    initialNotebookId?: string;
    initialPageId?: string;
}

export default function NotesPage({
    initialNotebookId: _initialNotebookId,
    initialPageId: _initialPageId,
}: NotesPageProps) 
{
    const [selectedPageId, setSelectedPageId] =
        useState<string | null>(null);

    const [showCreateTaskPopup, setShowCreateTaskPopup] =
        useState(false);

    const smoothScroll = useSmoothScroll();

  
    const {
    folders,
    notebooks,
    pages,
    blocks,
    tasks,

    selectedNotebookId,
    focusedBlockId,
    showTaskPicker,
    selectedFolderId,

    setShowTaskPicker,

    handleCreateNotebook,
    handleSelectedNotebook,
    handleRenameNotebook,

    handleCreatePage,
    handlePageTitleChange,
    handleRenamePage,

    handleUpdateBlock,
    handleCreateBlockAfter,
    handleDeleteBlock,
    handleDeletePage,
    handleDeleteNotebook,
    handleConvertBlock,

    handleEditTask,
    handleDeleteTask,

    handleCanvasClick,
    handleInsertTaskBlock,
    handleCreateTask,

    handleCreateFolder,
    handleDeleteFolder,
    handleSelectedFolder,
    handleRenameFolder,
    handleAssignNotebookToFolder,
    handleRemoveNotebookFromFolder,
} = useNotesPageFunctions({
    selectedPageId,
});



const selectedPage =
    pages.find((page) => page.id === selectedPageId);

    

    return (
        <div
            style={{
                display: "flex",
                height: "100%",
                minHeight: 0,
                backgroundColor: "rgba(20, 12, 55, 0.38)",
            }}
        >
            {/* ================= SIDEBAR ================= */}
            <NotebookBrowser

                folders={folders}
                notebooks={notebooks}
                pages={pages}

                selectedNotebookId={selectedNotebookId}
                onCreateNotebook={handleCreateNotebook}
                onSelectedNotebook={handleSelectedNotebook}
                onDeleteNotebook={handleDeleteNotebook}
                onRenameNotebook={handleRenameNotebook}

                onCreatePage={handleCreatePage}
                onSelectedPage={setSelectedPageId}
                onDeletePage={handleDeletePage}
                onRenamePage={handleRenamePage}
                selectedPageId={selectedPageId}


                onCreateFolder={handleCreateFolder}
                selectedFolderId={selectedFolderId}
                onSelectedFolder={handleSelectedFolder}
                onRenameFolder={handleRenameFolder}
                onAssignNotebookToFolder={handleAssignNotebookToFolder}
                onRemoveNotebookFromFolder={handleRemoveNotebookFromFolder}
                onDeleteFolder={handleDeleteFolder}
                />

            {/* ================= MAIN EDITOR ================= */}
            <main
                style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    display: "flex",
                    justifyContent: "center",
                    padding: "clamp(12px, 4vw, 40px)",
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                {selectedPage ? (
                    <div
                        style={{
                            width: "95%",
                            maxWidth: "100%",
                            boxSizing: "border-box",
                            backgroundColor: "rgba(20, 12, 55, 0.38)",
                            borderRadius: "10px",
                            padding: "clamp(16px, 4vw, 48px)",
                            minHeight: "900px",
                            display: "flex",
                            flexDirection: "column",
                            alignSelf: "flex-start",
                        }}
                    >
                        {/* PAGE TITLE */}
                        <input
                            type="text"
                            value={selectedPage?.title ?? ""}
                            onChange={(e) =>
                                handlePageTitleChange(e.target.value)
                            }
                            placeholder="Untitled Page"
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "transparent",
                                marginBottom: "12px",
                            }}
                        />

                        {/* META */}
                        <p style={{ color: "#777", marginBottom: "24px" }}>
                            Last edited: Just now
                        </p>

                            
                     <div
                            style={{
                                display:"flex",
                                flexWrap: "wrap",
                                gap:"10px",
                                marginTop:"20px",
                            }}
                        >
                        {/* TASK CREATION */}
                        <Tooltip text="Create a brand new task from scratch">
                            <button
                                onClick={() => setShowCreateTaskPopup(true)}
                                style={{ alignSelf: "flex-start" }}
                            >
                                + Create New Task
                            </button>
                        </Tooltip>

                        {showCreateTaskPopup && (
                            <CreateTaskPopup
                                onClose={() =>
                                    setShowCreateTaskPopup(false)
                                }
                                onCreate={(task) => {
                                    handleCreateTask(task);
                                    setShowCreateTaskPopup(false);
                                }}
                            />
                        )}

                        {/* TASK PICKER */}
                        <Tooltip text="Drop an existing task into this page">
                            <button
                                onClick={() => setShowTaskPicker(true)}
                                style={{ alignSelf: "flex-start", marginBottom: "24px" }}
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

                        <hr style={{ margin: "40px 0" }} />

                        {/* BLOCK EDITOR */}
                        <div
                            onClick={handleCanvasClick}
                            style={{
                                flex: 1,
                                width: "100%",
                                minHeight: "600px",
                                paddingBottom: "260px",
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
                ) : (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                            color: "#777",
                            fontSize: "1.2rem",
                        }}
                    >
                        Select or create a page to begin writing.
                    </div>
                )}
            </main>
        </div>
    );
}