# Sales Invoices

Billing clients for project work.

A Sales Invoice is the formal billing document sent to a client for work
already carried out. Income outside project billing — interest, royalties,
rounding — is recorded through Other Income, not here.

## The flow

Three steps in order.

**General → Value → Payment**

## Step 1: General

Two sections: client data and invoice details.

| Field | Notes |
|---|---|
| Client name | Pick from the client list |
| Client address | Filled in from the client |
| Client tax ID | Needed for the tax invoice |
| Invoice number | Format is fixed, see below |
| Date | The invoice date |
| Project name | The project being billed |
| Description | What work is being billed |
| Work order number | The work order it rests on |

### Invoice number format

```
000-INV-XXXX-MONTH(roman)-YEAR
```

The month is in Roman numerals, not ordinary digits. For August: `VIII`.

## Step 2: Value

| Field | Notes |
|---|---|
| DPP | Tax base |
| VAT and VAT (Rp.) | The rupiah figure is calculated automatically |
| WHT code, WHT object name, WHT (%) | If the client withholds tax |
| BPJS (Rp.) | If there is a BPJS deduction |
| Retention | The portion of the bill held back by the client |
| Total (Rp.) | Calculated automatically |

**Retention** is the part of the value the client holds until the maintenance
period ends. It is still recorded as part of the bill but has not been received
— so don't subtract it from DPP yourself.

There is also a **Print separately?** option controlling whether the document
prints as a separate file.

## Step 3: Payment

Choose the AKN account that will receive payment, then enter the payment total.
Finally, **Submit & preview** shows the result before it is actually saved.

## What happens after the invoice is created

A newly created invoice can't be billed for payment yet. The order is:

1. The invoice is created
2. **Confirm invoice** — check the data, enter the tax invoice number, then
   approve. Only for those permitted to approve sales invoices
3. **Create payment** — only becomes available after confirmation

The Confirm menu is disabled once the invoice has been confirmed or deleted.
The Create payment menu is disabled while the invoice is unconfirmed.

## Withholding slips

If the client withholds tax, the slip is recorded through the **Enter
withholding slip** menu.

That menu is only active for invoices whose status is genuinely awaiting a
slip. If it's disabled, either no tax was withheld on that invoice or the slip
has already been entered.

The search box in the list looks through invoice number, description, project,
and client name at once.
