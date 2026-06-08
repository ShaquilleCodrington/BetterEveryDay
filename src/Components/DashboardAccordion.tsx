import { useState } from "react";
import { Link } from "react-router-dom";

//created props
type DashboardAccordionProps = {
    title: string;
    preview: string;
    expandedView: string[];
    pagePath: string;
};

export default function DashboardAccordion({
    title,
    preview,
    expandedView,
    pagePath,
}: DashboardAccordionProps){
    const [isOpen, setIsOpen] = useState(false);



    return (
        <div  
        style={{border: "1px solid gray", padding: "10px",
        marginBottom: "10px"}}>

        <h3 onClick = { () => setIsOpen(!isOpen) }style ={{ cursor: "pointer"} }> 
            {title} </h3>

        {/*when closed*/}
        {!isOpen &&
        <p> { preview } </p>
        }

        
        {/*when open*/}
        {isOpen &&
        <>
        
        <p> { preview } </p>
        {expandedView.map((line, index) => (
            <p key = {index} > {line} </p>
        ))}

        <Link to = { pagePath } >
        <button>
            Open Activity
        </button>
        </Link>
        </>}

 </div>
    );
}