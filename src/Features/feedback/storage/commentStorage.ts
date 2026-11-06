// ======================================================
// commentStorage.ts
// ------------------------------------------------------
// Handles saving and loading feedback board data.
//
// This is the only file that should directly interact
// with localStorage for comments and likes.
//
// Local storage holds every comment and like this device knows
// about: the user's own plus the community ones pulled down by
// feedbackSync.ts.
//
// 11/05/2026 — Created.
// ======================================================

import type { Comment, CommentLike } from "../types";

    //storage keys
const COMMENTS_KEY = "feedback.comments";
const COMMENT_LIKES_KEY = "feedback.commentLikes";


function repairComment(
    comment: Comment
): Comment
{
    const now = new Date().toISOString();

    return {
        ...comment,

        parentId: comment.parentId ?? null,

        childIds: comment.childIds ?? [],

        posted: comment.posted ?? false,

        createdAt:
            comment.createdAt ?? now,

        updatedAt:
            comment.updatedAt ?? now,
    };
}


function repairCommentLike(
    like: CommentLike
): CommentLike
{
    const now = new Date().toISOString();

    return {
        ...like,

        createdAt:
            like.createdAt ?? now,

        updatedAt:
            like.updatedAt ?? like.createdAt ?? now,
    };
}


    //comment storage
export function loadComments(): Comment[]
{
    const data = localStorage.getItem(COMMENTS_KEY);

    if (!data)
    {
        return [];
    }

    const comments: Comment[] =
        JSON.parse(data);

    let needsRepair = false;

    const repairedComments =
        comments.map((comment) =>
        {
            if (
                comment.parentId === undefined ||
                comment.childIds === undefined ||
                comment.posted === undefined ||
                comment.createdAt === undefined ||
                comment.updatedAt === undefined
            )
            {
                needsRepair = true;

                return repairComment(comment);
            }

            return comment;
        });

    if (needsRepair)
    {
        saveComments(repairedComments);
    }

    return repairedComments;
}

export function saveComments(comments: Comment[]): void{
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
}


    //comment like storage
export function loadCommentLikes(): CommentLike[]
{
    const data = localStorage.getItem(COMMENT_LIKES_KEY);

    if (!data)
    {
        return [];
    }

    const likes: CommentLike[] =
        JSON.parse(data);

    let needsRepair = false;

    const repairedLikes =
        likes.map((like) =>
        {
            if (
                like.createdAt === undefined ||
                like.updatedAt === undefined
            )
            {
                needsRepair = true;

                return repairCommentLike(like);
            }

            return like;
        });

    if (needsRepair)
    {
        saveCommentLikes(repairedLikes);
    }

    return repairedLikes;
}

export function saveCommentLikes(likes: CommentLike[]): void{
    localStorage.setItem(COMMENT_LIKES_KEY, JSON.stringify(likes));
}


// ======================================================
// Creating, editing, posting, deleting
// ======================================================

// "Leave a new comment" / reply: creates an empty draft block
// owned by the user. parentId null = top-level comment.
export function createComment(
    userId: string,
    parentId: string | null = null
): Comment
{
    const now = new Date().toISOString();

    const comment: Comment = {
        id: crypto.randomUUID(),
        userId,
        parentId,
        childIds: [],
        content: "",
        posted: false,
        createdAt: now,
        updatedAt: now,
    };

    saveComments([...loadComments(), comment]);

    return comment;
}

// Only the author can edit their own comment.
export function updateComment(
    commentId: string,
    userId: string,
    content: string
): void
{
    saveComments(
        loadComments().map((comment) =>
            comment.id === commentId && comment.userId === userId
                ? {
                    ...comment,
                    content,
                    updatedAt: new Date().toISOString(),
                }
                : comment
        )
    );
}

// Only the author can post their own comment. If it is a reply, it also
// tells its parent "I'm your kid" by adding its id to the parent's
// childIds. The parent's content and updatedAt are never touched.
export function postComment(
    commentId: string,
    userId: string
): void
{
    const comments = loadComments();

    const target = comments.find(
        (comment) => comment.id === commentId
    );

    if (!target || target.userId !== userId)
    {
        return;
    }

    const now = new Date().toISOString();

    saveComments(
        comments.map((comment) =>
        {
            if (comment.id === commentId)
            {
                return {
                    ...comment,
                    posted: true,
                    updatedAt: now,
                };
            }

            if (
                comment.id === target.parentId &&
                !comment.childIds.includes(commentId)
            )
            {
                return {
                    ...comment,
                    childIds: [...comment.childIds, commentId],
                };
            }

            return comment;
        })
    );
}

// Only the author can delete their own comment. Deleting a comment also
// deletes every reply under it, no matter who wrote the reply, because a
// reply can't exist without its parent. Deleting a reply never deletes
// its parent. Likes on the deleted comments go with them.
export function deleteComment(
    commentId: string,
    userId: string
): void
{
    const comments = loadComments();

    const target = comments.find(
        (comment) => comment.id === commentId
    );

    if (!target || target.userId !== userId)
    {
        return;
    }

    const idsToDelete = new Set<string>([commentId]);
    let found = true;

    while (found)
    {
        found = false;

        for (const comment of comments)
        {
            if (
                comment.parentId !== null &&
                idsToDelete.has(comment.parentId) &&
                !idsToDelete.has(comment.id)
            )
            {
                idsToDelete.add(comment.id);
                found = true;
            }
        }
    }

    saveComments(
        comments
            .filter(
                (comment) => !idsToDelete.has(comment.id)
            )
            .map((comment) =>
                comment.childIds.some((id) => idsToDelete.has(id))
                    ? {
                        ...comment,
                        childIds: comment.childIds.filter(
                            (id) => !idsToDelete.has(id)
                        ),
                    }
                    : comment
            )
    );

    saveCommentLikes(
        loadCommentLikes().filter(
            (like) => !idsToDelete.has(like.commentId)
        )
    );
}

// Drops every comment whose parent no longer exists, including
// replies of replies. Used after pulling community comments down, so a
// reply disappears on every device once its parent was deleted.
export function removeOrphanComments(
    comments: Comment[]
): Comment[]
{
    let remaining = comments;
    let changed = true;

    while (changed)
    {
        const ids = new Set(
            remaining.map((comment) => comment.id)
        );

        const next = remaining.filter(
            (comment) =>
                comment.parentId === null ||
                ids.has(comment.parentId)
        );

        changed = next.length !== remaining.length;
        remaining = next;
    }

    return remaining;
}

// Drops every like whose comment no longer exists.
export function removeOrphanLikes(
    likes: CommentLike[],
    comments: Comment[]
): CommentLike[]
{
    const commentIds = new Set(
        comments.map((comment) => comment.id)
    );

    return likes.filter(
        (like) => commentIds.has(like.commentId)
    );
}

// Recomputes every parent's childIds from the replies that actually
// exist, oldest first. Only posted replies count.
export function rebuildChildIds(
    comments: Comment[]
): Comment[]
{
    const childrenByParent = new Map<string, string[]>();

    const oldestFirst = [...comments].sort((a, b) =>
        a.createdAt < b.createdAt ? -1 :
        a.createdAt > b.createdAt ? 1 : 0
    );

    for (const comment of oldestFirst)
    {
        if (comment.parentId !== null && comment.posted)
        {
            const siblings =
                childrenByParent.get(comment.parentId) ?? [];

            siblings.push(comment.id);

            childrenByParent.set(comment.parentId, siblings);
        }
    }

    return comments.map((comment) => ({
        ...comment,
        childIds: childrenByParent.get(comment.id) ?? [],
    }));
}


// ======================================================
// Replies
// ======================================================

// The parent knows its children through childIds. Each child is also
// checked against its own parentId. The viewer also sees their own
// unposted reply drafts.
export function getReplies(
    commentId: string,
    viewerId: string
): Comment[]
{
    const comments = loadComments();

    const byId = new Map(
        comments.map((comment) => [comment.id, comment] as const)
    );

    const parent = byId.get(commentId);

    if (!parent)
    {
        return [];
    }

    const postedReplies =
        parent.childIds
            .map((id) => byId.get(id))
            .filter(
                (comment): comment is Comment =>
                    comment !== undefined &&
                    comment.parentId === commentId
            );

    const ownDrafts =
        comments.filter(
            (comment) =>
                comment.parentId === commentId &&
                !comment.posted &&
                comment.userId === viewerId
        );

    return [...postedReplies, ...ownDrafts];
}


// ======================================================
// Likes
// ======================================================

// One like per user per comment, so the like's ID is built from both.
export function getCommentLikeId(
    userId: string,
    commentId: string
): string
{
    return `${userId}_${commentId}`;
}

// Heart click: adds this user's like, or removes it if already there.
// Only this user's own like is ever added or removed.
export function toggleCommentLike(
    commentId: string,
    userId: string
): void
{
    const likeId = getCommentLikeId(userId, commentId);
    const likes = loadCommentLikes();

    if (likes.some((like) => like.id === likeId))
    {
        saveCommentLikes(
            likes.filter((like) => like.id !== likeId)
        );

        return;
    }

    const now = new Date().toISOString();

    saveCommentLikes([
        ...likes,
        {
            id: likeId,
            commentId,
            userId,
            createdAt: now,
            updatedAt: now,
        },
    ]);
}

// The comment finds its likes by commentId.
export function getLikesForComment(
    commentId: string
): CommentLike[]
{
    return loadCommentLikes().filter(
        (like) => like.commentId === commentId
    );
}

// The like counter. One per user, so it counts unique users.
export function getLikeCount(
    commentId: string
): number
{
    return new Set(
        getLikesForComment(commentId).map((like) => like.userId)
    ).size;
}

export function hasUserLiked(
    commentId: string,
    userId: string
): boolean
{
    return getLikesForComment(commentId).some(
        (like) => like.userId === userId
    );
}