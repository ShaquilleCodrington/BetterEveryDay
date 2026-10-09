import type { InvoiceData } from "./types";

const STORAGE_KEY = "bettereveryday:invoices";

export function getInvoices(): InvoiceData[] {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        return [];
    }

    return JSON.parse(stored) as InvoiceData[];
}

// 10/09/2026 — Whole-collection write, used by the sync restore step.
export function saveInvoices(invoices: InvoiceData[]): void {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(invoices)
    );
}

export function saveInvoice(invoice: InvoiceData): void {
    const invoices = getInvoices();

    // 10/09/2026 — Stamp every save so sync can detect edits.
    const stamped: InvoiceData = {
        ...invoice,
        updatedAt: new Date().toISOString(),
    };

    const existingIndex = invoices.findIndex(
        (savedInvoice) => savedInvoice.id === invoice.id
    );

    if (existingIndex >= 0) {
        invoices[existingIndex] = stamped;
    } else {
        invoices.push(stamped);
    }

    saveInvoices(invoices);
}

export function deleteInvoice(invoiceId: string): void {
    const invoices = getInvoices().filter(
        (invoice) => invoice.id !== invoiceId
    );

    saveInvoices(invoices);
}
