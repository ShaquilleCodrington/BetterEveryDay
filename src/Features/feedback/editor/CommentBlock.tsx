// ======================================================
// CommentBlock.tsx
// ------------------------------------------------------
// 11/05/2026 — One comment on the feedback board, built like TextBlock:
// a textarea in a block. Replies are CommentBlocks nested inside it,
// indented to the right.
// ======================================================

import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import type { Comment } from "../types";
import {
    createComment,
    updateComment,
    postComment,
    deleteComment,
    toggleCommentLike,
    getLikeCount,
    hasUserLiked,
    getReplies,
} from "../storage/commentStorage";
import Tooltip from "../../../Components/Tooltip";

interface Props {
    comment: Comment;
    userId: string;

    // The block that should receive the cursor (a new draft or reply).
    focusedId: string | null;
    onFocusComment: (commentId: string) => void;

    // Tells the page to redraw from local storage.
    onChanged: () => void;
}

const iconButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 4px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "inherit",
};

export default function CommentBlock({
    comment,
    userId,
    focusedId,
    onFocusComment,
    onChanged,
}: Props) {

    const isAuthor = comment.userId === userId;
    const isDraft = !comment.posted;

    const [value, setValue] =
        useState<string>(comment.content);

    const [confirmingDelete, setConfirmingDelete] =
        useState(false);

    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    // sync external updates
    useEffect(() => {
        setValue(comment.content);
    }, [comment.content]);

    // Auto Resize
    function autoResize()
    {
        if (!inputRef.current)
        {
            return;
        }

        inputRef.current.style.height = "0px";

        inputRef.current.style.height =
            `${inputRef.current.scrollHeight}px`;
    }

    useEffect(() => {
        autoResize();
    }, [value]);

    // Focus
    useEffect(() => {
        if (focusedId === comment.id && inputRef.current) {
            inputRef.current.focus();
        }
    }, [focusedId, comment.id]);

    // Text Changes — only the author can change a comment.
    function handleChange(
        event: React.ChangeEvent<HTMLTextAreaElement>
    ) {
        const newValue = event.target.value;

        setValue(newValue);

        updateComment(
            comment.id,
            userId,
            newValue
        );
    }

    function handlePost()
    {
        if (value.trim() === "")
        {
            return;
        }

        postComment(comment.id, userId);
        onChanged();
    }

    // ==================================================
    // Keyboard Controls
    // ==================================================
    function handleKeyDown(
        event: React.KeyboardEvent<HTMLTextAreaElement>
    ) {
        if (!isAuthor || !isDraft)
        {
            return;
        }

        // Enter posts, Shift+Enter makes a new line.
        if (event.key === "Enter" && !event.shiftKey)
        {
            event.preventDefault();
            handlePost();
        }

        // Backspace on an empty draft removes it.
        if (event.key === "Backspace" && value === "")
        {
            event.preventDefault();
            deleteComment(comment.id, userId);
            onChanged();
        }
    }

    function handleLike()
    {
        toggleCommentLike(comment.id, userId);
        onChanged();
    }

    // Creates an empty draft reply under this comment.
    function handleReply()
    {
        const reply = createComment(userId, comment.id);

        onFocusComment(reply.id);
        onChanged();
    }

    function handleDelete()
    {
        deleteComment(comment.id, userId);
        onChanged();
    }

    const replies = getReplies(comment.id, userId);
    const likeCount = getLikeCount(comment.id);
    const liked = hasUserLiked(comment.id, userId);

    return (
        <div style={{ marginTop: "12px" }}>

            <div className="block">
                <div className="block-row">
                    <textarea
                        ref={inputRef}
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        readOnly={!isAuthor}
                        placeholder={
                            comment.parentId
                                ? "Write a reply..."
                                : "Write your comment..."
                        }
                        className="block-input"
                    />
                </div>
            </div>

            {/* META */}
            <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                {isDraft
                    ? "Draft — press Enter to post"
                    : `${isAuthor ? "You · " : ""}${new Date(
                        comment.createdAt
                    ).toLocaleDateString()}`}
            </div>

            {/* ACTIONS */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginTop: "4px",
                }}
            >
                {!isDraft && (
                    <>
                        <Tooltip text={liked ? "Remove your like" : "Like"}>
                            <button
                                onClick={handleLike}
                                aria-label="Like"
                                style={{
                                    ...iconButtonStyle,
                                    color: liked ? "#e0245e" : "inherit",
                                }}
                            >
                                <Heart
                                    size={16}
                                    fill={liked ? "currentColor" : "none"}
                                />
                                <span>{likeCount}</span>
                            </button>
                        </Tooltip>

                        <Tooltip text="Reply">
                            <button
                                onClick={handleReply}
                                aria-label="Reply"
                                style={iconButtonStyle}
                            >
                                <MessageCircle size={16} />
                            </button>
                        </Tooltip>
                    </>
                )}

                {isAuthor && isDraft && (
                    <button onClick={handlePost}>
                        Post
                    </button>
                )}

                {isAuthor && !confirmingDelete && (
                    <Tooltip text="Delete">
                        <button
                            onClick={() => setConfirmingDelete(true)}
                            aria-label="Delete"
                            style={iconButtonStyle}
                        >
                            <Trash2 size={16} />
                        </button>
                    </Tooltip>
                )}

                {isAuthor && confirmingDelete && (
                    <>
                        <span>
                            Delete this comment and its replies?
                        </span>
                        <button onClick={handleDelete}>
                            Delete
                        </button>
                        <button
                            onClick={() => setConfirmingDelete(false)}
                        >
                            Cancel
                        </button>
                    </>
                )}
            </div>

            {/* REPLIES — indented to the right */}
            {replies.length > 0 && (
                <div
                    style={{
                        marginLeft: "24px",
                        paddingLeft: "12px",
                        borderLeft: "2px solid rgba(255,255,255,.12)",
                    }}
                >
                    {replies.map((reply) => (
                        <CommentBlock
                            key={reply.id}
                            comment={reply}
                            userId={userId}
                            focusedId={focusedId}
                            onFocusComment={onFocusComment}
                            onChanged={onChanged}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}