import { useState } from "react";
import { Link } from "react-router-dom";

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
}: DashboardAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-panel accordion-card">
      <h3 onClick={() => setIsOpen(!isOpen)}>{title}</h3>
      <p>{preview}</p>

      {isOpen && (
        <>
          {expandedView.map((line, index) => (
            <p key={index} className="expanded-line">{line}</p>
          ))}
          <Link to={pagePath}>
            <button className="open-btn">Open Activity</button>
          </Link>
        </>
      )}
    </div>
  );
}
