import { useState } from "react";
import InvoiceEditor from "../Features/invoice/invoiceEditor";
import InvoicePreview from "../Features/invoice/invoicePreview";
import { defaultInvoice } from "../Features/invoice/defaults";
import type { InvoiceData } from "../Features/invoice/types";
import InvoiceSidebar from "../Features/invoice/invoiceSidebar";
import { getInvoices, saveInvoice as saveInvoiceToStorage, } from "../Features/invoice/invoiceStorage";
import { ChevronRight } from "lucide-react";
import "../Features/invoice/invoice.css";

export default function InvoicePage() {
    const [invoice, setInvoice] = useState<InvoiceData>(
        defaultInvoice()
    );
     const [invoices, setInvoices] = useState<InvoiceData[]>(
        getInvoices()
    );

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    function createInvoice() {
        setInvoice(defaultInvoice());
    }

    function selectInvoice(savedInvoice: InvoiceData) {
        setInvoice(savedInvoice);
    }

    function saveInvoice() {
        saveInvoiceToStorage(invoice);
    setInvoices(getInvoices());
    }

    return (

         <div className="invoice-page">
            <InvoiceSidebar
                invoices={invoices}
                currentInvoiceId={invoice.id}
                collapsed={sidebarCollapsed}
                onToggle={() =>
                    setSidebarCollapsed(!sidebarCollapsed)
                }
                onCreateInvoice={createInvoice}
                onSelectInvoice={selectInvoice}
            />

        <main className="invoice-workspace">
            {sidebarCollapsed && (
                <div className="invoice-workspace-sidebar-control">
                    <button
                        type="button"
                        className="invoice-workspace-sidebar-toggle"
                        onClick={() => setSidebarCollapsed(false)}
                        aria-label="Expand invoice sidebar"
                    >
                        <ChevronRight size={18} />
                    </button>
                    </div>
                )}

            <div className="invoice-editor-area">
            <InvoiceEditor
                invoice={invoice}
                onChange={setInvoice}
            />
            </div>
                        
            <div className="invoice-preview-area">
                <div className="invoice-actions">
             <button
                    type="button"
                    className="invoice-save-button"
                     onClick={saveInvoice}
                >
                    Save Invoice
                </button>

                </div>
            <InvoicePreview
                invoice={invoice}
            />
            
         </div>
        </main>
     </div>
    );
}