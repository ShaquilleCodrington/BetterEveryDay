// ======================================================
// FeedbackPage.tsx
// ------------------------------------------------------
// 11/05/2026 — Community feedback board. Shows every posted comment
// from every user, newest first, plus the current user's own drafts.
// ======================================================

import { useEffect, useState } from "react";
import CommentBlock from "../Features/feedback/editor/CommentBlock";
import {
    createComment,
    loadComments,
} from "../Features/feedback/storage/commentStorage";
import Tooltip from "../Components/Tooltip";

// Adjust these two paths to the folder that holds syncManager.ts and
// feedbackSync.ts.
import { autoSync } from "../Services/Snapshot/syncManager"
import { FEEDBACK_SYNCED_EVENT } from "../Services/Snapshot/feedbackSync"

interface FeedbackPageProps {
    userId: string;
}

export default function FeedbackPage({
    userId,
}: FeedbackPageProps)
{
    // Bumping this redraws the page from local storage.
    const [, setVersion] =
        useState(0);

    const [focusedId, setFocusedId] =
        useState<string | null>(null);

    function reload()
    {
        setVersion((version) => version + 1);
    }

    // Sync when the page opens, and redraw whenever any sync finishes.
    useEffect(() => {
        window.addEventListener(FEEDBACK_SYNCED_EVENT, reload);

        void autoSync(userId);

        return () => {
            window.removeEventListener(FEEDBACK_SYNCED_EVENT, reload);
        };
    }, [userId]);

    // Everyone's posted top-level comments, plus this user's own drafts.
    const topLevelComments =
        loadComments()
            .filter(
                (comment) =>
                    comment.parentId === null &&
                    (comment.posted || comment.userId === userId)
            )
            .sort((a, b) =>
                a.createdAt < b.createdAt ? 1 :
                a.createdAt > b.createdAt ? -1 : 0
            );

    // "Leave a new comment": adds an empty draft block and focuses it.
    function handleNewComment()
    {
        const comment = createComment(userId, null);

        setFocusedId(comment.id);
        reload();
    }

    return (
        <div
            style={{
                display: "flex",
                height: "100%",
                minHeight: 0,
                background: "var(--bg-panel)",
            }}
        >
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
                <div
                    className="glass-panel"
                    style={{
                        width: "95%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        padding: "clamp(16px, 4vw, 48px)",
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignSelf: "flex-start",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
                            fontWeight: "bold",
                            lineHeight: 1.2,
                            marginTop: 0,
                            marginBottom: "12px",
                        }}
                    >
                        Community Feedback
                    </h1>

                    <Tooltip text="Write a new comment for everyone to see">
                        <button
                            onClick={handleNewComment}
                            style={{ alignSelf: "flex-start" }}
                        >
                            + Leave a new comment
                        </button>
                    </Tooltip>

                    <hr style={{ margin: "24px 0" }} />

                    {topLevelComments.length === 0 ? (
                        <div style={{ color: "#777" }}>
                            No comments yet. Be the first to leave one.
                        </div>
                    ) : (
                        topLevelComments.map((comment) => (
                            <CommentBlock
                                key={comment.id}
                                comment={comment}
                                userId={userId}
                                focusedId={focusedId}
                                onFocusComment={setFocusedId}
                                onChanged={reload}
                            />
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}