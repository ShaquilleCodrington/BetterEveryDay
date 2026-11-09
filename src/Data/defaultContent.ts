// ======================================================
// ★★★★★ CHANGED 11/09/2026 ★★★★★ — NEW FILE.
// defaultContent.ts
// ------------------------------------------------------
// All default starter content lives here.
//
// Each default has its own persistent flag in localStorage, kept per
// user. A flag is set only after the content is confirmed in storage.
// If creation fails part way the flag stays unset and the next load
// tries again; fixed IDs and "add only what's missing" saves mean a
// retry never creates a duplicate.
//
// After creation these are ordinary BetterEveryDay objects: the user can
// edit or delete them and they are never recreated.
//
// Defaults are stamped with an old updatedAt on purpose. The same default
// gets created on every device with the same fixed ID, and a sync keeps
// whichever copy has the newer updatedAt. With an old stamp, a real edit
// always wins over a freshly created default.
// ======================================================
import { addTask, loadTasks } from "./taskStorage";
import type { Task } from "./tasks";
import type { ChecklistItem } from "../Components/Checklist";
import { createCalendarDate } from "../Features/Calendar/calendar";
import {
    createNotebook,
    createPage,
} from "../Features/notes/utils/NotesFactory";
import {
    loadNotebookFolders,
    saveNotebookFolders,
    loadNotebooks,
    saveNotebooks,
    loadPages,
    savePages,
    loadBlocks,
    saveBlocks,
} from "../Features/notes/storage/notebookStorage";
import type {
    Block,
    DividerBlock,
    HeadingBlock,
    ListBlock,
    Notebook,
    NotebookFolder,
    Page,
    TaskBlock,
    TextBlock,
} from "../Features/notes/types";
// ★★★★★ CHANGED 11/09/2026 ★★★★★ — NEW IMPORTS: Journey defaults.
import type { Journey } from "../Features/journey/types";
import { createJourney } from "../Features/journey/Utils/JourneyFactory";
import {
    loadJourneys,
    saveJourneys,
} from "../Features/journey/Storage/journeyStorage";
import {
    getPlanByJourneyId,
    setPlan,
} from "../Features/journey/Plan/journeyPlan";
import type { JourneyPlan } from "../Features/journey/Plan/journeyPlan";

// ------------------------------------------------------
// Values to confirm against the rest of the app.
// ------------------------------------------------------
const RECHARGE_MOOD = "Recharge";
const FOCUS_MOOD = "Focus";
const NEW_TASK_STATUS = "Not Started";
const DEFAULT_PRIORITY = "Medium";

// Old on purpose (see the note at the top of the file).
const DEFAULT_UPDATED_AT = "2026-01-01T00:00:00.000Z";

// ======================================================
// Shared helpers
// ======================================================

function getUserKey(userId: string | null): string {
    return userId ?? "guest";
}

function getFlagKey(
    userId: string | null,
    defaultName: string
): string {
    return `defaultInitialized:${getUserKey(userId)}:${defaultName}`;
}

// Default tasks are due tomorrow, so they show up on the calendar the
// next day instead of on the day they were created. If they are not
// worked on, the existing carry-forward moves them along.
function getTomorrowCalendarDate(): string {
    const tomorrow = new Date();

    tomorrow.setDate(tomorrow.getDate() + 1);

    return createCalendarDate(tomorrow);
}

// Saves only the items that are not already in storage.
// Items that exist (edited or not) are never overwritten.
function saveMissingBy<T>(
    load: () => T[],
    save: (items: T[]) => void,
    additions: T[],
    getId: (item: T) => string
): void {
    const existing = load();
    const haveIds = new Set(existing.map(getId));

    const fresh = additions.filter(item => !haveIds.has(getId(item)));

    if (fresh.length > 0) {
        save([...existing, ...fresh]);
    }
}

function saveMissing<T extends { id: string }>(
    load: () => T[],
    save: (items: T[]) => void,
    additions: T[]
): void {
    saveMissingBy(load, save, additions, item => item.id);
}

// ======================================================
// Default task cards: creator and initializer
// ======================================================

interface DefaultTaskSpec {
    id: string;
    title: string;
    notes: string;
    mood: string;
    checklistItems: string[];
}

function createChecklistItem(text: string): ChecklistItem {
    return {
        id: crypto.randomUUID(),
        text,
        checked: false,
    };
}

function createDefaultTask(
    userId: string | null,
    spec: DefaultTaskSpec
): Task {
    return {
        id: spec.id,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: DEFAULT_UPDATED_AT,
        completedAt: null,

        title: spec.title,
        notes: spec.notes,
        completed: false,
        mood: spec.mood,
        status: NEW_TASK_STATUS,
        priority: DEFAULT_PRIORITY,
        dueDate: getTomorrowCalendarDate(),

        checklist: spec.checklistItems.map(createChecklistItem),
    };
}

// Creates one default task once per user.
// Never throws, so a problem here can't stop the app from loading.
function initializeDefaultTask(
    userId: string | null,
    flagName: string,
    spec: DefaultTaskSpec
): void {
    const flagKey =
        getFlagKey(userId, flagName);

    if (localStorage.getItem(flagKey) === "true") {
        return;
    }

    try {
        // The task may already exist if an earlier run was interrupted
        // after saving but before setting the flag.
        if (!loadTasks().some(task => task.id === spec.id)) {
            addTask(
                createDefaultTask(userId, spec)
            );
        }

        // Confirm it is really in storage before marking success.
        if (!loadTasks().some(task => task.id === spec.id)) {
            throw new Error("Default task was not found after saving.");
        }

        localStorage.setItem(flagKey, "true");
    } catch (error) {
        console.error(
            `[defaults] Default task "${flagName}" failed, will retry on the next load:`,
            error
        );
    }
}

// ======================================================
// Default notebook content: creators
// ------------------------------------------------------
// Generic on purpose, so any experience can reuse them.
// ======================================================

// There is no folder factory in NotesFactory, so it is built here.
export function createDefaultFolder(
    id: string,
    title: string,
    userId: string | null
): NotebookFolder {
    return {
        id,
        title,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: DEFAULT_UPDATED_AT,
    };
}

// folderId is optional: a Journey's notebook does not live in a folder.
export function createDefaultNotebook(
    id: string,
    title: string,
    userId: string | null,
    folderId: string | undefined,
    pageIds: string[]
): Notebook {
    const notebook =
        createNotebook(title, userId);

    return {
        ...notebook,
        id,
        ...(folderId !== undefined ? { folderId } : {}),
        pageIds,
        updatedAt: DEFAULT_UPDATED_AT,
    };
}

// createPage also makes an empty starter block. The default page lists its
// own blocks instead, so that one is discarded.
export function createDefaultPage(
    id: string,
    notebookId: string,
    title: string,
    blockIds: string[]
): Page {
    const { page } =
        createPage(notebookId, title);

    return {
        ...page,
        id,
        blockIds,
        updatedAt: DEFAULT_UPDATED_AT,
    };
}

export function createDefaultHeadingBlock(
    id: string,
    pageId: string,
    content: string
): HeadingBlock {
    return {
        id,
        pageId,
        type: "heading",
        content,
        createdAt: new Date().toISOString(),
        updatedAt: DEFAULT_UPDATED_AT,
    };
}

export function createDefaultTextBlock(
    id: string,
    pageId: string,
    content: string
): TextBlock {
    return {
        id,
        pageId,
        type: "text",
        content,
        createdAt: new Date().toISOString(),
        updatedAt: DEFAULT_UPDATED_AT,
    };
}

// ★★★★★ CHANGED 11/09/2026 ★★★★★ — NEW: one list block, one bullet per
// line. No trailing line break, which would add an empty extra bullet.
// Keep items short: a wrapped item throws the bullet column out of line.
export function createDefaultListBlock(
    id: string,
    pageId: string,
    items: string[]
): ListBlock {
    return {
        id,
        pageId,
        type: "list",
        content: items.join("\n"),
        createdAt: new Date().toISOString(),
        updatedAt: DEFAULT_UPDATED_AT,
    };
}

export function createDefaultDividerBlock(
    id: string,
    pageId: string
): DividerBlock {
    return {
        id,
        pageId,
        type: "divider",
        content: null,
        createdAt: new Date().toISOString(),
        updatedAt: DEFAULT_UPDATED_AT,
    };
}

// A task block only points at a task; the task itself lives with the
// other tasks and shows up on the page through this link.
export function createDefaultTaskBlock(
    id: string,
    pageId: string,
    taskId: string
): TaskBlock {
    return {
        id,
        pageId,
        type: "task",
        content: { taskId },
        createdAt: new Date().toISOString(),
        updatedAt: DEFAULT_UPDATED_AT,
    };
}

// ======================================================
// Default notebook content: one notebook > page, optionally in a folder
// ======================================================

interface NotebookExperience {
    // Journey notebooks have no folder.
    folder?: { id: string; title: string };
    notebookId: string;
    notebookTitle: string;
    pageId: string;
    pageTitle: string;
    // Already carries its fixed IDs and its pageId.
    blocks: Block[];
}

type BlockMaker = (id: string, pageId: string) => Block;

// Gives each block a stable ID from its position on the page.
function buildBlocks(
    pageId: string,
    makers: BlockMaker[]
): Block[] {
    return makers.map((make, index) =>
        make(`${pageId}-block-${index + 1}`, pageId)
    );
}

// True only when the folder (if any), notebook, page and every block the
// page lists are really in storage.
function isExperienceInStorage(
    experience: NotebookExperience
): boolean {
    const folder = experience.folder;

    const hasFolder =
        folder === undefined ||
        loadNotebookFolders().some(item => item.id === folder.id);

    const notebook =
        loadNotebooks().find(
            item => item.id === experience.notebookId
        );

    const page =
        loadPages().find(
            item => item.id === experience.pageId
        );

    const storedBlocks = loadBlocks();

    return (
        hasFolder &&
        notebook !== undefined &&
        notebook.pageIds.includes(experience.pageId) &&
        page !== undefined &&
        experience.blocks.every(block =>
            storedBlocks.some(stored => stored.id === block.id)
        )
    );
}

// Saves the folder (if any), notebook, page and blocks. Only what is
// missing is added.
function saveNotebookExperience(
    userId: string | null,
    experience: NotebookExperience
): void {
    if (experience.folder) {
        saveMissing(
            loadNotebookFolders,
            saveNotebookFolders,
            [
                createDefaultFolder(
                    experience.folder.id,
                    experience.folder.title,
                    userId
                ),
            ]
        );
    }

    // The notebook already lists the page, so a notebook is never saved
    // without it, even if a later step is interrupted.
    saveMissing(
        loadNotebooks,
        saveNotebooks,
        [
            createDefaultNotebook(
                experience.notebookId,
                experience.notebookTitle,
                userId,
                experience.folder?.id,
                [experience.pageId]
            ),
        ]
    );

    saveMissing(
        loadPages,
        savePages,
        [
            createDefaultPage(
                experience.pageId,
                experience.notebookId,
                experience.pageTitle,
                experience.blocks.map(block => block.id)
            ),
        ]
    );

    saveMissing(
        loadBlocks,
        saveBlocks,
        experience.blocks
    );
}

// Creates one notebook experience once per user.
// Never throws, so a problem here can't stop the app from loading.
function initializeNotebookExperience(
    userId: string | null,
    flagName: string,
    experience: NotebookExperience
): void {
    const flagKey =
        getFlagKey(userId, flagName);

    if (localStorage.getItem(flagKey) === "true") {
        return;
    }

    try {
        saveNotebookExperience(userId, experience);

        // Confirm everything is really in storage before marking success.
        if (!isExperienceInStorage(experience)) {
            throw new Error(
                `Default "${flagName}" notebook was not found after saving.`
            );
        }

        localStorage.setItem(flagKey, "true");
    } catch (error) {
        console.error(
            `[defaults] Default notebook "${flagName}" failed, will retry on the next load:`,
            error
        );
    }
}

// ======================================================
// Default 1 — Recharge > Learning a Hobby > Piano
// ======================================================

// Exported so the Piano page's task block can point at it.
export function getDefaultPianoDayOneTaskId(
    userId: string | null
): string {
    return `default-recharge-piano-day-one-${getUserKey(userId)}`;
}

export function initializeDefaultRecharge(
    userId: string | null
): void {
    initializeDefaultTask(
        userId,
        "recharge",
        {
            id: getDefaultPianoDayOneTaskId(userId),
            title: "Piano — Day 1: Getting Started",
            notes: "Your first day learning the piano. Check each item off as you go.",
            mood: RECHARGE_MOOD,
            checklistItems: [
                "Learn the keys on the keyboard",
                "Practice your scales",
                "Practice proper fingering",
            ],
        }
    );
}

function createPianoExperience(
    userId: string | null
): NotebookExperience {
    const user = getUserKey(userId);
    const pageId = `default-hobby-piano-day-one-page-${user}`;

    return {
        folder: {
            id: `default-hobby-folder-${user}`,
            title: "Learning a Hobby",
        },
        notebookId: `default-hobby-piano-notebook-${user}`,
        notebookTitle: "Piano",
        pageId,
        pageTitle: "First Day — Piano Basics",
        blocks: buildBlocks(pageId, [
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Day 1 — Getting Started"
                ),
            (id, page) =>
                createDefaultTaskBlock(
                    id,
                    page,
                    getDefaultPianoDayOneTaskId(userId)
                ),
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Notes & Practice"
                ),
            (id, page) =>
                createDefaultTextBlock(
                    id,
                    page,
                    "Write down what you learned, what felt difficult, what you enjoyed, and what you want to practice next."
                ),
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Thoughts Before Leaving"
                ),
            (id, page) =>
                createDefaultTextBlock(
                    id,
                    page,
                    "Reflect on today's session. How did it feel? What did you enjoy? What would you like to improve?"
                ),
        ]),
    };
}

export function initializeDefaultHobbyNotebook(
    userId: string | null
): void {
    initializeNotebookExperience(
        userId,
        "hobby-notebook",
        createPianoExperience(userId)
    );
}

// ======================================================
// Default 2 — Focus > Completing an Assignment > Creating Your Content
// ======================================================

// Exported so the First Video page's task block can point at it.
export function getDefaultFirstVideoTaskId(
    userId: string | null
): string {
    return `default-focus-first-video-${getUserKey(userId)}`;
}

export function initializeDefaultFocus(
    userId: string | null
): void {
    initializeDefaultTask(
        userId,
        "focus",
        {
            id: getDefaultFirstVideoTaskId(userId),
            title: "Create Your First Video",
            notes: "Research content creation, explore available tools, learn the fundamentals, create your first video, and publish it.",
            mood: FOCUS_MOOD,
            checklistItems: [
                "Watch YouTube videos about content creation and explore styles you enjoy.",
                "Research the best free video creation and editing software.",
                "Learn the basics of your chosen software.",
                "Create your first video.",
                "Publish your video and write a caption.",
            ],
        }
    );
}

// ★★★★★ CHANGED 11/09/2026 ★★★★★ — The page layout changed (the
// "Consider:" questions are now a list block), 
// An earlier copy that was deleted can't interfere with this one, because
// a deleted ID is never brought back by a sync.
function createFirstVideoExperience(
    userId: string | null
): NotebookExperience {
    const user = getUserKey(userId);
    const pageId = `default-focus-first-video-page-${user}`;

    return {
        folder: {
            id: `default-focus-assignment-folder-${user}`,
            title: "Completing an Assignment",
        },
        notebookId: `default-focus-content-notebook-${user}`,
        notebookTitle: "Creating Your Content",
        pageId,
        pageTitle: "First Video — Content Creation Basics",
        blocks: buildBlocks(pageId, [
            // 1
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Today's Objective"
                ),
            // 2
            (id, page) =>
                createDefaultTextBlock(
                    id,
                    page,
                    "Learn how to create and publish your first video using accessible, free tools.\n\nExplore content styles, research available software, and develop the skills necessary to produce your first piece of content."
                ),
            // 3
            (id, page) =>
                createDefaultTaskBlock(
                    id,
                    page,
                    getDefaultFirstVideoTaskId(userId)
                ),
            // 4
            (id, page) =>
                createDefaultDividerBlock(id, page),
            // 5
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Research & Content Discovery"
                ),
            // 6
            (id, page) =>
                createDefaultTextBlock(
                    id,
                    page,
                    "Use this section to explore the content creation process.\n\nConsider:"
                ),
            // 7 — one list block, one bullet per line.
            (id, page) =>
                createDefaultListBlock(
                    id,
                    page,
                    [
                        "Types of videos you enjoy watching",
                        "What makes certain creators interesting",
                        "Free software for recording and editing",
                        "Tools you can use without a subscription",
                        "Equipment you already have available",
                    ]
                ),
            // 8
            (id, page) =>
                createDefaultTextBlock(
                    id,
                    page,
                    "The goal is to research before committing to a particular tool or workflow."
                ),
            // 9
            (id, page) =>
                createDefaultDividerBlock(id, page),
            // 10
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Notes & What You Learned"
                ),
            // 11
            (id, page) =>
                createDefaultTextBlock(
                    id,
                    page,
                    "What content styles interested you the most?\n\nWhat software did you discover, and what makes it useful?\n\nWhat techniques or skills did you learn that you can apply?\n"
                ),
            // 12
            (id, page) =>
                createDefaultDividerBlock(id, page),
            // 13
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Thoughts Before Leaving"
                ),
            // 14
            (id, page) =>
                createDefaultTextBlock(
                    id,
                    page,
                    "What did you accomplish today?\n\nWhat challenged you or surprised you?\n\nWhat do you want to accomplish in your next session?\n"
                ),
        ]),
    };
}

export function initializeDefaultAssignmentNotebook(
    userId: string | null
): void {
    initializeNotebookExperience(
        userId,
        "assignment-notebook",
        createFirstVideoExperience(userId)
    );
}

// ======================================================
// ★★★★★ CHANGED 11/09/2026 ★★★★★ — NEW.
// Default 3 — Journey: Learn Content Creation
// ------------------------------------------------------
// A Journey owns exactly one notebook (see createJourney). The plan holds
// the purpose and the sessions per week. The two-session structure and
// the long-term progression live on a Roadmap page in the Journey's
// notebook, because the plan has no place for them.
// ======================================================

function getContentJourneyIds(userId: string | null) {
    const user = getUserKey(userId);

    return {
        journeyId: `default-focus-content-journey-${user}`,
        notebookId: `default-focus-content-journey-notebook-${user}`,
        pageId: `default-focus-content-journey-roadmap-${user}`,
    };
}

function createContentJourneyExperience(
    userId: string | null
): NotebookExperience {
    const ids = getContentJourneyIds(userId);

    return {
        notebookId: ids.notebookId,
        notebookTitle: "Learn Content Creation",
        pageId: ids.pageId,
        pageTitle: "Journey Roadmap",
        blocks: buildBlocks(ids.pageId, [
            // 1
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Journey Roadmap"
                ),
            // 2
            (id, page) =>
                createDefaultTextBlock(
                    id,
                    page,
                    "Work on this journey twice each week. Use one session to learn and one to create, and let each session build on the last."
                ),
            // 3
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Session 1 — Learn & Explore"
                ),
            // 4
            (id, page) =>
                createDefaultListBlock(
                    id,
                    page,
                    [
                        "Research content creation techniques",
                        "Study examples from creators",
                        "Explore available software",
                        "Learn new skills",
                        "Record your discoveries",
                    ]
                ),
            // 5
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Session 2 — Create & Apply"
                ),
            // 6
            (id, page) =>
                createDefaultListBlock(
                    id,
                    page,
                    [
                        "Apply what you learned",
                        "Practice using the software",
                        "Create or improve content",
                        "Publish when ready",
                        "Reflect on the results",
                    ]
                ),
            // 7
            (id, page) =>
                createDefaultDividerBlock(id, page),
            // 8
            (id, page) =>
                createDefaultHeadingBlock(
                    id,
                    page,
                    "Long-Term Progression"
                ),
            // 9
            (id, page) =>
                createDefaultListBlock(
                    id,
                    page,
                    [
                        "Understanding content creation",
                        "Learning video editing software",
                        "Developing scripting and storytelling",
                        "Producing videos consistently",
                        "Improving presentation and quality",
                        "Analyzing feedback and engagement",
                        "Building a repeatable creation workflow",
                    ]
                ),
        ]),
    };
}

// The Journey object comes from createJourney so it has the same shape as
// one the user creates. The notebook that createJourney makes is not used;
// the default notebook is built by saveNotebookExperience instead.
function createDefaultJourneyObject(
    userId: string | null
): Journey {
    const ids = getContentJourneyIds(userId);
    const { journey } = createJourney(userId);

    return {
        ...journey,
        journeyId: ids.journeyId,
        notebookId: ids.notebookId,
        updatedAt: DEFAULT_UPDATED_AT,
    };
}

function createDefaultJourneyPlan(
    userId: string | null
): JourneyPlan {
    return {
        journeyId: getContentJourneyIds(userId).journeyId,
        purpose: "Develop the ability to plan, create, edit, and publish engaging content independently.",
        sessionsPerWeek: 2,
        createdAt: new Date().toISOString(),
    };
}

// True only when the notebook experience, the Journey and its plan are
// all really in storage.
function isContentJourneyInStorage(
    userId: string | null
): boolean {
    const ids = getContentJourneyIds(userId);

    return (
        isExperienceInStorage(createContentJourneyExperience(userId)) &&
        loadJourneys().some(
            journey => journey.journeyId === ids.journeyId
        ) &&
        getPlanByJourneyId(ids.journeyId) !== null
    );
}

// Creates the Learn Content Creation Journey once per user.
// Never throws, so a problem here can't stop the app from loading.
export function initializeDefaultContentJourney(
    userId: string | null
): void {
    const flagKey =
        getFlagKey(userId, "content-journey");

    if (localStorage.getItem(flagKey) === "true") {
        return;
    }

    try {
        const ids = getContentJourneyIds(userId);

        saveNotebookExperience(
            userId,
            createContentJourneyExperience(userId)
        );

        saveMissingBy(
            loadJourneys,
            saveJourneys,
            [createDefaultJourneyObject(userId)],
            journey => journey.journeyId
        );

        // setPlan replaces an existing plan, so only create one if there
        // is none: a plan the user has edited must never be overwritten.
        if (getPlanByJourneyId(ids.journeyId) === null) {
            setPlan(createDefaultJourneyPlan(userId));
        }

        // Confirm everything is really in storage before marking success.
        if (!isContentJourneyInStorage(userId)) {
            throw new Error("Default Journey was not found after saving.");
        }

        localStorage.setItem(flagKey, "true");
    } catch (error) {
        console.error(
            "[defaults] Default Journey failed, will retry on the next load:",
            error
        );
    }
}

// ======================================================
// Run every default. Call once, before the app reads its data.
// ======================================================
export function initializeDefaults(
    userId: string | null
): void {
    initializeDefaultRecharge(userId);
    initializeDefaultHobbyNotebook(userId);
    initializeDefaultFocus(userId);
    initializeDefaultAssignmentNotebook(userId);

    // ★★★★★ CHANGED 11/09/2026 ★★★★★ — NEW: Journey default.
    initializeDefaultContentJourney(userId);
}