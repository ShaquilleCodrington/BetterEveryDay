
import type { InvoiceTheme } from "./invoiceTheme";

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface InvoiceContact {
    name: string;
    address: string;
    city: string;
    number: string;
}



export interface InvoiceData {
    id: string;
    invoiceNumber: string;
    date: string;

    business: InvoiceContact;
    customer: InvoiceContact;

    items: InvoiceItem[];

    template: string;
    theme: InvoiceTheme;
    updatedAt?: string;
}
