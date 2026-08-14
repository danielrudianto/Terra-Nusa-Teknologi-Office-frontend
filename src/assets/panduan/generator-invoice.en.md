# Invoice Generator

Producing invoices and receipts for workers who have no letterhead of their
own.

This menu is the opposite of Sales Invoices. A Sales Invoice is the company
billing **a client**. The Invoice Generator produces billing documents **from
an individual supplier to the company** — usually a foreman or tradesman who
genuinely has no invoice format of their own.

The resulting document still belongs to the supplier; the company only provides
the format so it comes out tidy and consistent.

## Filling it in

### Information

| Field | Notes |
|---|---|
| Supplier | The individual supplier doing the billing |
| Project code | The project being charged |
| City | Where the document is issued |
| Cut-off date | The last day of work being billed |
| Invoice date | The date on the document |
| Document number | The invoice number |

The **cut-off date** is not the invoice date. Cut-off marks how far the work is
counted; the invoice date is when the document was written. The two often
differ by a few days, and it's the cut-off that defines the work period.

### Work details

One row per type of work: volume, unit, unit price, and total.

Write the work description as it was agreed on site. These rows are what the
supplier reads when checking their own bill — if they don't recognise it,
they'll ask, and that slows the payment down.

### Account

The supplier's account number and name are filled in automatically from the
account they **last used**. Check them again rather than trusting them —
suppliers change accounts, and a transfer to the old one will not come back on
its own.

## Withholding tax

Choose the tax object code, and the system shows three figures:

| Line | Meaning |
|---|---|
| DPP | Tax base |
| WHT deducted | The deduction at the chosen code's rate |
| Payable | What the supplier actually receives |

Tell the supplier the **Payable** figure, not the DPP. The gap caused by
withholding is the single most common question after a transfer arrives.

## Record it as a purchase at the same time

There's a **"Also record as a purchase"** switch. When it's on, the system
records a purchase with the **same invoice number** as soon as the document is
produced, and asks for the PO number.

Use it. Producing the document without recording the purchase means the bill
exists in the supplier's hands but not in the system — and that usually
surfaces only when the supplier chases a payment that was never queued.

If the switch is off, record the purchase manually through the Purchases menu
using exactly the same invoice number.

## After it's produced

The **Download** button produces a PDF containing the invoice and the receipt.
Hand it to the supplier for signature, then attach it back to the purchase as
proof.
