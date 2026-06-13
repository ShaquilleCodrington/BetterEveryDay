import { useState } from "react";

type AccordianPreviewProps = {
  title: string;
  content: string;
  previewMode: "first" | "last";
};

export default function AccordionPreview({
  title,
  content,
  previewMode,
}: AccordianPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lines = content.split("\n");
  const previewLines =
    previewMode === "first" ? lines.slice(0, 3) : lines.slice(-3);

  return (
    <div
      className="glass-panel accordion-card"
      onClick={() => setIsOpen(!isOpen)}
    >
      <h3>{title}</h3>
      {!isOpen &&
        previewLines.map((line, index) => (
          <p key={index} className="expanded-line">{line}</p>
        ))}
      {isOpen &&
        lines.map((line, index) => (
          <p key={index} className="expanded-line">{line}</p>
        ))}
    </div>
  );
}
