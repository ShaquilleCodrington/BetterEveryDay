import type { InvoiceData } from "./types";
import { getDefaultTheme } from "./invoiceTheme";


export function defaultInvoice(): InvoiceData {
    return {
        id: crypto.randomUUID(),
        invoiceNumber: "INV-0001",
        date: new Date().toISOString().split("T")[0],

        business: {
            name: "",
            address: "",
            city: "",
            number: "",
        },

        customer: {
            name: "",
            address: "",
            city: "",
            number:"",
        },

        items: [
            {
                id: crypto.randomUUID(),
                description: "",
                quantity: 1,
                unitPrice: 0,
            },
        ],

        template: "classic",
        theme: getDefaultTheme(),
    };
}