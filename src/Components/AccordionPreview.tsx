import { useState } from "react";

//created props
type AccordianPreviewProps = {
    title: string;
    content: string;
    previewMode: "first" | "last";
};

export default function AccordionPreview({
    title,
    content,
    previewMode,
}: AccordianPreviewProps){
    const [isOpen, setIsOpen] = useState(false);

    const lines = content.split("\n");

    const previewLines =
    previewMode == "first"
    ? lines.slice(0, 3) : lines.slice(-3);

    return (
        <div onClick = { () => setIsOpen(!isOpen)} 
        style={{border: "1px solid gray", padding: "10px",
        marginBottom: "10px", cursor: "pointer"}}>

        <h3> {title} </h3>

        {!isOpen &&
        previewLines.map((line,index) =>
            ( <p key = {index}> {line} </p>
        ))}

        {isOpen &&
        lines.map((line, index) => (
            <p key = {index} > {line} </p>
        ))}

 </div>
    );
}

