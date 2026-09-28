import type { InvoiceData } from "./types";

interface InvoicePreviewProps {
    invoice: InvoiceData;
}

export default function InvoicePreview({
    invoice,
}: InvoicePreviewProps) {
    const total = invoice.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
    );

    return (
        <article className="invoice-preview">
            {/* Header */}
            <header className="invoice-header">
                <div className="invoice-person">
                    <div>{invoice.business.name}</div>
                    <div>{invoice.business.address}</div>
                    <div>{invoice.business.city}</div>
                    <div>{invoice.business.number}</div>
                </div>

                <div className="invoice-information">
                    <h1>INVOICE</h1>

                    <div>
                        Invoice #{invoice.invoiceNumber}
                    </div>

                    <div>
                        {invoice.date}
                    </div>
                </div>
            </header>

            {/* Receiver */}
            <section className="invoice-receiver">
                <div className="invoice-section-label">
                    TO:
                </div>

                <div>{invoice.customer.name}</div>
                <div>{invoice.customer.address}</div>
                <div>{invoice.customer.city}</div>
                <div>{invoice.customer.number}</div>
            </section>

            {/* Items */}
            <table className="invoice-items">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Amount</th>
                    </tr>
                </thead>

                <tbody>
                    {invoice.items.map((item) => (
                        <tr key={item.id}>
                            <td>{item.description}</td>
                            <td>{item.quantity}</td>
                            <td>{item.unitPrice.toFixed(2)}</td>
                            <td>
                                {(item.quantity * item.unitPrice).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>

                <tfoot>
                    <tr>
                         <td colSpan={3}>Total</td>
                        <td>{total.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </article>
    );
}