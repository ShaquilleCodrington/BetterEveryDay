import type { Block, BlockType } from "../types";
import CheckList from "../../../Components/Checklist";
import { useState } from "react";
import SlashMenu from "../slash/SlashMenu";
import Tooltip from "../../../Components/Tooltip";

interface Props {
    block: Block;

    onUpdateBlock: (blockId: string, content: any,
            upadatedAt: string
    ) => void;
    onConvertBlock: (  blockId: string,  type: BlockType,
                         content: any  ) => void;

    onCreateBlockAfter?: (  blockId: string  ) => void;
    onDeleteBlock?: (  blockId: string  ) => void;

    focused?: boolean;
}


export default function CheckBlock(
    { block, onUpdateBlock,
      onCreateBlockAfter, onConvertBlock, 
      onDeleteBlock, focused,
     }: Props) {

    if (block.type !== "checklist") return null;

const items = block.content;


const [showSlashMenu, setShowSlashMenu] =
    useState(false);

const [slashQuery, setSlashQuery] =
    useState("");

// function updateSlashMenu(input: string)
// {
//     if (!input.startsWith("/"))
//     {
//         setShowSlashMenu(false);
//         setSlashQuery("");
//         return;
//     }

//     setShowSlashMenu(true);

//     setSlashQuery(
//         input.substring(1).toLowerCase()
//     );
// }

function handleSlashCommand(command: string)
{
    setShowSlashMenu(false);
    setSlashQuery("");

    switch (command)
    {
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

function handleWrapperKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>
)
{
    if (event.key !== "Backspace")
    {
        return;
    }

    const isSingleEmptyItem =
        items.length === 1 &&
        items[0].text === "";

    if (!isSingleEmptyItem)
    {
        return;
    }

    onDeleteBlock?.(
        block.id
    );
}


    function handleItemsChange(
        updatedItems: typeof items
    ): void {
        const updatedAt =
            new Date().toISOString();

        onUpdateBlock(
            block.id,
            updatedItems,
            updatedAt
        );
    }

  return (
    <div
        onKeyDown={handleWrapperKeyDown}
        style={{
            position: "relative",
            padding: "6px 0",
        }}
    >
        <div
            style={{
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

        <div
            style={{
                flex: 1,
            }}
        >
            <CheckList
                items={block.content}
                onItemsChange={handleItemsChange}
                onExit={() =>
                    onCreateBlockAfter?.(block.id)
                }
                focused={focused}
            />
        </div>
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