import { useState, useEffect, useRef } from "react";
import type { Block, BlockType } from "../types";
import SlashMenu from "../slash/SlashMenu";
import Tooltip from "../../../Components/Tooltip";



interface EmptyBlockProps {
    block: Block;
    onUpdateBlock?: (blockId: string, content: string) => void;

    onCreateBlockAfter?: ( blockId: string  ) => void;
    onDeleteBlock?: (  blockId: string  ) => void;
    onConvertBlock: (  blockId: string, type: BlockType,
                        content: any  ) => void;
    focused?: boolean;
}


export default function EmptyBlock({
    block,
    onUpdateBlock,
    onCreateBlockAfter,
    onDeleteBlock,
    onConvertBlock,
    focused,

}: EmptyBlockProps) {


     const [value, setValue] = useState<string>(
        block.type === "empty"
            ? String(block.content ?? "") : ""
    );

     const [showSlashMenu, setShowSlashMenu] =
        useState(false);

    const [, setSlashQuery] =
        useState("");


    const ref = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        setValue(typeof block.content === "string" ? block.content : "");
    }, [block.content]);

    useEffect(() => {
        if (focused) ref.current?.focus();
    }, [focused]);

    function resize() {
        if (!ref.current) return;
        ref.current.style.height = "0px";
        ref.current.style.height = ref.current.scrollHeight + "px";
    }

        useEffect(() => {
        resize();
    }, [value]);


    function change(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setValue(e.target.value);
        resize();
        onUpdateBlock?.(block.id, e.target.value);
    }

    function keyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            onCreateBlockAfter?.(block.id);
        }

        if (e.key === "Backspace" && value === "") {
            e.preventDefault();
            onDeleteBlock?.(block.id);
        }
    }

  
     function handleSlashCommand(command: string) {
        
        setShowSlashMenu(false);
        setSlashQuery("");
        
        switch (command) {
            case "divider":
                onConvertBlock(block.id, "divider", null);
                break;

            case "list":
                onConvertBlock(block.id, "list", null);
                break;

            case "text":
                onConvertBlock(block.id, "text", null);
                break;

                case "heading":
                onConvertBlock(block.id, "heading", null);
                break;

                case "checklist":
                onConvertBlock(block.id, "checklist", []);
                break;
        }

    }


    return (
        <div style={{ width: "100%", padding: "8px 0" }}>

            <div style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                    }}
            >
                <Tooltip text="Insert or convert this into a different block type" side="right">
                    <button
                        onClick={() => setShowSlashMenu(true)}
                    >
                        +
                    </button>
                </Tooltip>
                    <textarea
                        ref={ref}
                        value={value}
                        onChange={change}
                        onKeyDown={keyDown}
                        style={{
                            width: "100%",
                            minHeight: 30, 
                            overflow: "hidden",
                            border: "none",
                            outline: "none",
                            resize: "none",
                            fontSize: "1rem",
                            background: "transparent",
                        }}
                        placeholder="Click here to start writing..."
                    />

                    {showSlashMenu && (
                        <SlashMenu
                            query=""
                            onSelect={handleSlashCommand}
                        />
                    )}
            </div>
        </div>
    );
}
