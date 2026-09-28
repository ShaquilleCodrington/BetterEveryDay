import { FilePlus, ChevronLeft, ChevronRight } from "lucide-react";
import type { InvoiceData } from "./types";

interface InvoiceSidebarProps {
    invoices: InvoiceData[];
    currentInvoiceId: string;
    collapsed: boolean;
    onToggle: () => void;
    onCreateInvoice: () => void;
    onSelectInvoice: (invoice: InvoiceData) => void;
}

export default function InvoiceSidebar({
    invoices,
    currentInvoiceId,
    collapsed,
    onToggle,
    onCreateInvoice,
    onSelectInvoice,
}: InvoiceSidebarProps) {
    return (
        <aside className={`invoice-sidebar ${collapsed ? "collapsed" : ""}`}>
            <div className="invoice-sidebar-header">
                {!collapsed && <h2>Invoices</h2>}

                <button
                    type="button"
                    className="invoice-sidebar-toggle"
                    onClick={onToggle}
                    aria-label={
                        collapsed
                            ? "Expand invoice sidebar"
                            : "Collapse invoice sidebar"
                    }
                >
                    {collapsed ? (
                        <ChevronRight size={18} />
                    ) : (
                        <ChevronLeft size={18} />
                    )}
                </button>
            </div>

            <button
                type="button"
                className="invoice-create-button"
                onClick={onCreateInvoice}
            >
                <FilePlus size={18} />

                {!collapsed && (
                    <span>Create Invoice</span>
                )}
            </button>

            {!collapsed && (
                <div className="invoice-list">
                    {invoices.map((savedInvoice) => (
                        <button
                            type="button"
                            key={savedInvoice.id}
                            className={`invoice-list-item ${
                                savedInvoice.id === currentInvoiceId
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                onSelectInvoice(savedInvoice)
                            }
                        >
                            <span>
                                {savedInvoice.invoiceNumber}
                            </span>

                            <small>
                                {savedInvoice.customer.name ||
                                    "No customer"}
                            </small>
                        </button>
                    ))}
                </div>
            )}
        </aside>
    );
}