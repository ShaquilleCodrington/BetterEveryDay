
export type Task = {

    id: number;
    title: string;
    notes: string;
    completed: boolean;
    mood: string;
    status: string;
    priority: string;
    dueDate: string;
    updatedAt: string;
};

export const defaultTask: Task[] = [
    {
       id: 1,
            title: "Build TaskCard",
            notes: `Design from sketch Implement accordion
            Test preview lines Works great`,
            completed: false,
            mood: "Focused",
            status: "In Progress",
            priority: "High",
            dueDate: "May 20",
            updatedAt: "2026-05-18",
        },
        {
            id: 2,
            title: "Refactor Layout System",
            notes: `Convert components to modular structure
            Improve spacing system
            Clean up styles`,
            completed: true,
            mood: "Deep Work",
            status: "In Progress",
            priority: "Medium",
            dueDate: "May 22",
            updatedAt: "2026-05-17",
        },
    ];




