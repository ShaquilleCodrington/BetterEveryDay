// ======================================================
// feedbackSync.ts
// ------------------------------------------------------
// 11/05/2026 — Shares the feedback board through two global Firestore
// collections, separate from each user's personal Snapshot:
//
//   feedbackComments/{commentId}  — posted comments, from every user
//   feedbackLikes/{userId_commentId} — likes, from every user
//
// Each user only ever writes their own comments and likes. The one
// exception is a parent's childIds, which a new reply adds itself to
// (see the Firestore rules).
// ======================================================

import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";

import { database } from "../firebase/config";

import type { Comment, CommentLike } from "../../Features/feedback/types";
import {
    loadComments,
    saveComments,
    loadCommentLikes,
    saveCommentLikes,
    removeOrphanComments,
    removeOrphanLikes,
    rebuildChildIds,
} from "../../Features/feedback/storage/commentStorage";

import {
    emptyDeleted,
    normalizeDeleted,
    type DeletedItems,
} from "./snapshot";

const COMMENTS_COLLECTION = "feedbackComments";
const LIKES_COLLECTION = "feedbackLikes";

// 11/05/2026 — Fired on window after the shared board has been merged into
// local storage, so the feedback page can redraw with the newest data.
export const FEEDBACK_SYNCED_EVENT = "feedback-synced";


// 1. Remove this user's deleted comments and unliked likes from the
//    shared collections. The deleted record only ever holds this user's
//    own IDs, because their Snapshot only holds their own items.
async function removeDeletedFromShared(
    userId: string,
    deleted: DeletedItems
): Promise<void>
{
    for (const commentId of Object.keys(deleted.comments))
    {
        const reference =
            doc(database, COMMENTS_COLLECTION, commentId);

        const existing = await getDoc(reference);

        if (!existing.exists())
        {
            continue;
        }

        const data = existing.data() as Comment;

        if (data.userId !== userId)
        {
            continue;
        }

        // Tell the parent this child is gone. If the parent is already
        // gone too there is nothing to update.
        if (data.parentId)
        {
            try
            {
                await updateDoc(
                    doc(database, COMMENTS_COLLECTION, data.parentId),
                    { childIds: arrayRemove(commentId) }
                );
            }
            catch
            {
                // Parent no longer exists.
            }
        }

        await deleteDoc(reference);
    }

    for (const likeId of Object.keys(deleted.commentLikes))
    {
        await deleteDoc(
            doc(database, LIKES_COLLECTION, likeId)
        );
    }
}


export async function syncFeedback(
    userId: string,
    deletedRecord?: Partial<DeletedItems> | null
): Promise<void>
{
    const deleted =
        deletedRecord
            ? normalizeDeleted(deletedRecord)
            : emptyDeleted();

    // 1. Deletions first, so they are not pulled back down.
    await removeDeletedFromShared(userId, deleted);

    // 2. Read the shared board.
    const commentDocuments =
        await getDocs(
            query(
                collection(database, COMMENTS_COLLECTION),
                where("posted", "==", true)
            )
        );

    const sharedComments =
        commentDocuments.docs.map(
            (item) => item.data() as Comment
        );

    const likeDocuments =
        await getDocs(
            collection(database, LIKES_COLLECTION)
        );

    const sharedLikes =
        likeDocuments.docs.map(
            (item) => item.data() as CommentLike
        );

    const sharedCommentsById =
        new Map(
            sharedComments.map((comment) => [comment.id, comment] as const)
        );

    // 3. Push this user's posted comments that are new or newer.
    //    Oldest first, so a parent is pushed before its replies.
    const ownPostedComments =
        loadComments()
            .filter(
                (comment) =>
                    comment.userId === userId &&
                    comment.posted &&
                    deleted.comments[comment.id] === undefined
            )
            .sort((a, b) =>
                a.createdAt < b.createdAt ? -1 :
                a.createdAt > b.createdAt ? 1 : 0
            );

    const pushedIds = new Set<string>();

    for (const comment of ownPostedComments)
    {
        const shared = sharedCommentsById.get(comment.id);

        if (!shared || comment.updatedAt > shared.updatedAt)
        {
            // childIds is not sent: replies add themselves to it.
            const { childIds: _childIds, ...fields } = comment;

            await setDoc(
                doc(database, COMMENTS_COLLECTION, comment.id),
                fields,
                { merge: true }
            );

            pushedIds.add(comment.id);
        }

        // Tell the parent "I'm your kid" if it doesn't know yet.
        if (comment.parentId)
        {
            const parent = sharedCommentsById.get(comment.parentId);

            const parentExists =
                parent !== undefined ||
                pushedIds.has(comment.parentId);

            const parentKnowsChild =
                (parent?.childIds ?? []).includes(comment.id);

            if (parentExists && !parentKnowsChild)
            {
                try
                {
                    await updateDoc(
                        doc(database, COMMENTS_COLLECTION, comment.parentId),
                        { childIds: arrayUnion(comment.id) }
                    );
                }
                catch
                {
                    // Parent no longer exists.
                }
            }
        }
    }

    // 4. Push this user's likes that aren't on the board yet.
    const sharedLikeIds =
        new Set(sharedLikes.map((like) => like.id));

    const localLikes = loadCommentLikes();

    for (const like of localLikes)
    {
        if (
            like.userId === userId &&
            deleted.commentLikes[like.id] === undefined &&
            !sharedLikeIds.has(like.id)
        )
        {
            await setDoc(
                doc(database, LIKES_COLLECTION, like.id),
                like
            );
        }
    }

    // 5. Merge the shared board into local storage.
    //    Other people's comments: the shared board is the truth.
    //    This user's own comments: the newest copy wins, and unposted
    //    drafts only exist locally.
    const mergedComments = new Map<string, Comment>();

    for (const comment of sharedComments)
    {
        if (comment.userId !== userId)
        {
            mergedComments.set(comment.id, {
                ...comment,
                childIds: comment.childIds ?? [],
            });
        }
    }

    const ownComments = new Map<string, Comment>();

    for (const comment of loadComments())
    {
        if (
            comment.userId === userId &&
            deleted.comments[comment.id] === undefined
        )
        {
            ownComments.set(comment.id, comment);
        }
    }

    for (const comment of sharedComments)
    {
        if (
            comment.userId !== userId ||
            deleted.comments[comment.id] !== undefined
        )
        {
            continue;
        }

        const local = ownComments.get(comment.id);

        if (!local || comment.updatedAt > local.updatedAt)
        {
            ownComments.set(comment.id, {
                ...comment,
                childIds: comment.childIds ?? [],
            });
        }
    }

    for (const comment of ownComments.values())
    {
        mergedComments.set(comment.id, comment);
    }

    // 6. A reply whose parent is gone can't exist. Then each parent's
    //    childIds is recomputed from the replies that remain.
    const comments =
        rebuildChildIds(
            removeOrphanComments(
                [...mergedComments.values()]
            )
        );

    // Likes: other people's come from the shared board; this user's own
    // keep whatever is local or shared, minus anything they un-liked.
    const mergedLikes = new Map<string, CommentLike>();

    for (const like of sharedLikes)
    {
        if (like.userId !== userId)
        {
            mergedLikes.set(like.id, like);
        }
    }

    const ownLikes = new Map<string, CommentLike>();

    for (const like of localLikes)
    {
        if (
            like.userId === userId &&
            deleted.commentLikes[like.id] === undefined
        )
        {
            ownLikes.set(like.id, like);
        }
    }

    for (const like of sharedLikes)
    {
        if (
            like.userId === userId &&
            deleted.commentLikes[like.id] === undefined &&
            !ownLikes.has(like.id)
        )
        {
            ownLikes.set(like.id, like);
        }
    }

    for (const like of ownLikes.values())
    {
        mergedLikes.set(like.id, like);
    }

    const likes =
        removeOrphanLikes(
            [...mergedLikes.values()],
            comments
        );

    saveComments(comments);
    saveCommentLikes(likes);

    // 7. Tell the feedback page the newest data is in local storage.
    window.dispatchEvent(new Event(FEEDBACK_SYNCED_EVENT));
}