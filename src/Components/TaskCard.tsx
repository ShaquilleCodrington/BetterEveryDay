import { useState } from "react";

type TaskCardProps = {
    id: number;
    title: string;
    notes: string;
    completed: boolean;
    focus: string;
    priority: string;
    dueDate: string;
    updatedAt: string;
};

export default function TaskCard({
    id,
    title,
    notes,
    completed,
    focus,
    priority,
    dueDate,
    updatedAt,
}: TaskCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    const lines = notes.split("\n");
    const preview = lines.slice(0, 2);

    return (
        <div 
         style={{
        border: "1px solid gray",
        padding: "10px",
        marginBottom: "10px",
        cursor: "pointer",
      }}
      >
        {/* Header Row */}
        <div onClick = { () => setIsOpen(!isOpen)} 
        style = {{ display : "flex",
            gap: "10px",
            cursor: "pointer",
            fontWeight: 500, }}>

            <strong> { dueDate }</strong>
            <span> { title }</span>
            <span> { completed ? "Done" : "Active" }</span>
            <span> {  focus }</span>
            <span> {  priority }</span>
        </div>

        {/* Notes Preview / Expanded*/}
        {!isOpen &&
        preview.map((line, index) => 
        <p key = {index} > { line }</p>)}

        {isOpen &&
        lines.map((line, index ) => 
        <p key = { index } > { line }</p>)}

{/* updated At */}
{isOpen && (
    <div style = {{ marginTop: "10px", fontSize: "12px", opacity: 0.7}} >
        Updated: { updatedAt}
    </div>

    )}

      </div>
    );
}