import type { InvoiceData } from "./types";

interface InvoiceEditorProps {
    invoice: InvoiceData;
    onChange: (invoice: InvoiceData) => void;
}

export default function InvoiceEditor({
    invoice,
    onChange,
}: InvoiceEditorProps) {
    function updateBusiness(field: keyof InvoiceData["business"], value: string) {
        onChange({
            ...invoice,
            business: {
                ...invoice.business,
                [field]: value,
            },
        });
    }

    function updateCustomer(field: keyof InvoiceData["customer"], value: string) {
        onChange({
            ...invoice,
            customer: {
                ...invoice.customer,
                [field]: value,
            },
        });
    }

    function updateItem(
        itemId: string,
        field: "description" | "quantity" | "unitPrice",
        value: string
    ) {
        onChange({
            ...invoice,
            items: invoice.items.map((item) =>
                item.id === itemId
                    ? {
                          ...item,
                          [field]:
                              field === "description"
                                  ? value
                                  : Number(value),
                      }
                    : item
            ),
        });
    }

    function addItem() {
        onChange({
            ...invoice,
            items: [
                ...invoice.items,
                {
                    id: crypto.randomUUID(),
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                },
            ],
        });
    }

    function removeItem(itemId: string) {
        onChange({
            ...invoice,
            items: invoice.items.filter((item) => item.id !== itemId),
        });
    }

    return (
        <section className="invoice-editor">
            <div className="compose-form">
                <h2>Invoice</h2>

                {/* Person / Business */}
                <div className="editor-section">
                    <h3>Person / Business</h3>

                    <label>
                        Name
                        <input
                            type="text"
                            value={invoice.business.name}
                            onChange={(event) =>
                                updateBusiness("name", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        Address
                        <input
                            type="text"
                            value={invoice.business.address}
                            onChange={(event) =>
                                updateBusiness("address", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        City
                        <input
                            type="text"
                            value={invoice.business.city}
                            onChange={(event) =>
                                updateBusiness("city", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        Phone
                        <input
                            type="text"
                            value={invoice.business.number}
                            onChange={(event) =>
                                updateBusiness("number", event.target.value)
                            }
                        />
                    </label>
                </div>

                {/* Invoice */}
                <div className="editor-section">
                    <h3>Invoice Information</h3>

                    <label>
                        Invoice Number
                        <input
                            type="text"
                            value={invoice.invoiceNumber}
                            onChange={(event) =>
                                onChange({
                                    ...invoice,
                                    invoiceNumber: event.target.value,
                                })
                            }
                        />
                    </label>

                    <label>
                        Date
                        <input
                            type="date"
                            value={invoice.date}
                            onChange={(event) =>
                                onChange({
                                    ...invoice,
                                    date: event.target.value,
                                })
                            }
                        />
                    </label>
                </div>

                {/* Customer */}
                <div className="editor-section">
                    <h3>Customer</h3>

                    <label>
                        Name
                        <input
                            type="text"
                            value={invoice.customer.name}
                            onChange={(event) =>
                                updateCustomer("name", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        Address
                        <input
                            type="text"
                            value={invoice.customer.address}
                            onChange={(event) =>
                                updateCustomer("address", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        City
                        <input
                            type="text"
                            value={invoice.customer.city}
                            onChange={(event) =>
                                updateCustomer("city", event.target.value)
                            }
                        />
                    </label>
                    <label>
                        Phone
                        <input
                            type="text"
                            value={invoice.customer.number}
                            onChange={(event) =>
                                updateCustomer("number", event.target.value)
                            }
                        />
                    </label>
                </div>

                {/* Items */}
                <div className="editor-section">
                    <h3>Items</h3>

                    

                    {invoice.items.map((item) => (
                        <div className="item-row" key={item.id}>
                            <label>
                                Description
                            <input
                                type="text"
                                value={item.description}
                                placeholder="Description"
                                onChange={(event) =>
                                    updateItem(
                                        item.id,
                                        "description",
                                        event.target.value
                                    )
                                }
                            />
                            </label>

                            <label>
                                Quantity

                            <input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(event) =>
                                    updateItem(
                                        item.id,
                                        "quantity",
                                        event.target.value
                                    )
                                }
                            />
                             </label>

                            <label>
                                Unit Price

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(event) =>
                                    updateItem(
                                        item.id,
                                        "unitPrice",
                                        event.target.value
                                    )
                                }
                            />
                            </label>

                            <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                aria-label="Remove item"
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addItem}
                    >
                        Add Item
                    </button>
                </div>
            </div>
        </section>
    );
}