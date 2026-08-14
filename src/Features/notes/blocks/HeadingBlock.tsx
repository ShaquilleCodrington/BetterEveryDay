import { useEffect, useRef, useState } from "react";
import type { Block, BlockType } from "../types";
import SlashMenu from "../slash/SlashMenu";
import Tooltip from "../../../Components/Tooltip";

interface Props {
    block: Block;

    onUpdateBlock: (blockId: string, content: string) => void;

    onConvertBlock: (
        blockId: string,  type: BlockType,
        content: any   ) => void;
    onCreateBlockAfter?: (blockId: string) => void;
    onDeleteBlock?: (blockId: string) => void;

    focused?: boolean;
}

export default function HeadingBlock({
    block,
    onUpdateBlock,
    onConvertBlock,
    onCreateBlockAfter,
    onDeleteBlock,
    focused
}: Props) {

    if (block.type !== "heading") return null;

     const [value, setValue] = useState<string>(
                        block.type === "heading"
                            ? String(block.content ?? "")
                            : ""
                    );

    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashQuery, setSlashQuery] = useState("");

    // sync external updates
    useEffect(() => {
        if (typeof block.content === "string") {
            setValue(block.content);
        }
    }, [block.content]);
     
    // focus behavior
    useEffect(() => {
        if (focused && inputRef.current) {
            inputRef.current.focus();
        }
    }, [focused]);

    // auto resize
    useEffect(() => {
        autoResize();
    }, [value]);


    useEffect(() => {
    setShowSlashMenu(false);
    setSlashQuery("");
}, [block.type]);

    function autoResize() {
        if (!inputRef.current) return;

        inputRef.current.style.height = "0px";
        inputRef.current.style.height =
            `${inputRef.current.scrollHeight}px`;
    }

    function updateSlashMenu(input: string) {
        if (!input.startsWith("/")) {
            setShowSlashMenu(false);
            setSlashQuery("");
            return;
        }

        setShowSlashMenu(true);
        setSlashQuery(input.substring(1).toLowerCase());
    }

   // Text Changes
    function handleChange(
        event: React.ChangeEvent<HTMLTextAreaElement>
    ) {
        console.log("handleChange");
        const newValue = event.target.value;

        updateSlashMenu(newValue);

        setValue(newValue);
        autoResize();

        onUpdateBlock?.(
            block.id,
            newValue
        );
    }

    
    // ==================================================
    // Keyboard Controls
    // ==================================================

    function handleKeyDown(
        event: React.KeyboardEvent<HTMLTextAreaElement>
    ) {

        //create new blocks
        if (event.key === "Enter" &&  event.shiftKey) 
        {
            event.preventDefault();

            onCreateBlockAfter?.(
                block.id  );
        }

            //delete existing blocls
        if (
            event.key === "Backspace" && value === ""
        )
        {
            event.preventDefault();
            onDeleteBlock?.(   block.id );
        }

                 //  SLASH SYSTEM WILL GO HERE LATER
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
                onConvertBlock?.(block.id, "checklist", []);
                break;
        }

    }

    return (
            <div className="block">

            <div className="block-row">

                <Tooltip text="Insert or convert this into a different block type" side="right">
                    <button
                        className="block-action"
                        onClick={() => setShowSlashMenu(true)}
                    >
                        +
                    </button>
                </Tooltip>
            <textarea
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Heading..."
                className = "block-input block-heading-input"

              
            />
            </div>

            {showSlashMenu && (
                <SlashMenu
                    query={slashQuery}
                    onSelect={handleSlashCommand}
                />
            )}
        </div>
    );
}