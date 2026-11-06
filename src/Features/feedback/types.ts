// ======================================================
// types.ts (feedback)
// ------------------------------------------------------
// 11/05/2026 — Types for the community feedback board.
// ======================================================

export interface Comment {
    id: string;

    // The only user who can edit or delete this comment.
    userId: string;

    // null = top-level comment. Replies point at the comment they answer.
    parentId: string | null;

    // The parent knows its children. A reply is added here when it is posted.
    childIds: string[];

    content: string;

    // false = draft that only the author sees. true = shared with everyone.
    posted: boolean;

    createdAt: string;
    updatedAt: string;
}

// One like by one user on one comment.
// id is `${userId}_${commentId}`, so a user can only ever have one per comment.
// A like is only ever added or removed, never edited.
export interface CommentLike {
    id: string;
    commentId: string;
    userId: string;

    createdAt: string;
    updatedAt: string;
}