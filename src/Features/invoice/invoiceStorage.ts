import type { InvoiceData } from "./types";

const STORAGE_KEY = "bettereveryday:invoices";

export function getInvoices(): InvoiceData[] {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        return [];
    }

    return JSON.parse(stored) as InvoiceData[];
}

export function saveInvoice(invoice: InvoiceData): void {
    const invoices = getInvoices();

    const existingIndex = invoices.findIndex(
        (savedInvoice) => savedInvoice.id === invoice.id
    );

    if (existingIndex >= 0) {
        invoices[existingIndex] = invoice;
    } else {
        invoices.push(invoice);
    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(invoices)
    );
}

export function deleteInvoice(invoiceId: string): void {
    const invoices = getInvoices().filter(
        (invoice) => invoice.id !== invoiceId
    );

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(invoices)
    );
}