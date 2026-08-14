# Purchases

How to record supplier invoices.

The **Purchases** menu is for recording bills you have **already received**
from a supplier — not for ordering goods. Ordering happens through Purchase
Orders, and that PO number is what gets referenced here.

## Before you start

Have these ready:

- The **PO number** the purchase is based on
- The **invoice** from the supplier (required, cannot be skipped)
- A **copy of the PO or contract** (required)
- Tax invoice and receipt, if any
- The supplier's account for payment

The supplier must already be registered. If not, register them through the
Suppliers menu first.

## The flow

The form runs in four steps, in order. **Next** only becomes available once the
current step is complete, so you can't skip ahead.

**Metadata → Value → Attachments → Payment details**

## Step 1: Metadata

Document identity and its link to the PO.

| Field | Required | Notes |
|---|---|---|
| Invoice name | Yes | The supplier's invoice number |
| Receipt name | No | Fill in if the receipt is separate |
| Tax invoice name | No | 17 characters maximum |
| Supplier | Yes | Pick from the list |
| Date | Yes | The invoice date |
| Due date | Yes | Used by the Due filter in the list |
| Purchase order name | Yes | Must match the format, see below |
| Project | Yes | **Filled automatically** from the PO number |
| Document type | Yes | Goods purchase / Other purchase |
| Document status | Yes | Ready / Pending |

### PO number format

The PO number can't be typed freely — the pattern is fixed:

```
0451-PO-BKS01-6.4.1
 |    |    |     +-- cost type
 |    |    +-------- project code (4-5 uppercase letters/digits)
 |    +------------- PO, SPK, or PKS
 +------------------ sequence number (3-4 digits)
```

Accepted cost types: `A` `B` `C` `D` `E` `F` `G` `H1` `H2` `5.1.1` `5.1.2`
`5.1.6` `5.1.7` `5.1.12` `6.3.1` `6.3.2` `6.4.1` `6.4.2` `6.5.1`

Once the number is correct, **Project and cost type fill themselves in** from
its segments. If both stay empty after typing, the format doesn't match yet —
check the digit count at the front, or the project code.

### Internal purchase

A switch at the bottom. Turn it on for internal purchases, meaning those not
for a client project. Only purchases marked internal can later be edited
through **Edit internal** in the list.

## Step 2: Value

| Field | Notes |
|---|---|
| DPP | Tax base, minimum 1 |
| VAT (%) | 0 to 11 |
| VAT (Rp.) | Calculated automatically from DPP |
| PBBKB | Enter 0 if not applicable |
| WHT code, WHT object name, WHT percentage | For purchases subject to withholding |
| Other value | Delivery, packing, or administration charges |
| Other value note | Explain what that other value is for |

The arithmetic:

**Total = DPP + VAT + PBBKB + Other value**

**Paid to supplier = Total − WHT**

Withholding is deducted from the amount transferred, so the figure in Step 4 is
genuinely smaller than the Total here. That's normal, not a miscalculation.

## Step 3: Attachments

Tick the documents you actually hold. **Two are required:**

- Invoice
- Copy of Purchase Order / Contract

The rest are optional: Receipt, Tax invoice, Proof of payment.

Don't tick documents you haven't received. If something is still missing, it's
better to save with status **Pending** — see the next section.

## Step 4: Payment details

The supplier's destination account: bank name, account name, account number,
and payment method (Bank Transfer or Virtual Account).

Two switches at the bottom:

- **Proxy payment** — when the payment is fronted through another party
- **Create payment slip** — produces a payment slip as soon as the purchase is
  saved, without going back in through the Payments menu

## Document status

There are two, and the choice determines what can be done afterwards.

**Ready** — the paperwork is complete, nothing missing.

**Pending** — some document or data is still outstanding. If you choose this,
the notes field is **required, 10–100 characters**: write down what's still
missing, because that's what other people read when chasing the paperwork.

The difference later on:

- A purchase marked **Pending** can be completed through **Update status** in
  the list.
- A purchase marked **Ready** cannot. The Update status menu is disabled, and
  opening the page directly is refused with a message saying the data is
  already complete.

So don't mark **Ready** before you're sure. Using Pending and completing it
later is safer than declaring Ready too early.

## Filtering the purchase list

The filter chips above the table can be combined:

**Due** - **Not due** - **Paid** - **Unpaid** - **Draft** - **Ready**

The search box looks through invoice number, receipt, PO, supplier name, and
tax invoice at once.

Click any row to see its details. The three-dot menu at the far right holds
Update status, payment creation, and Edit internal.

## If a button isn't there

If a menu described in this guide isn't visible, it most likely isn't part of
your access rights — the system isn't broken.

For example: payment creation only appears for those with Outgoing Payments
access, and **Edit internal** only for those permitted to change purchase data.

If you need extra access, contact the system administrator. Don't use someone
else's account — every change is logged in the activity history under the
account owner's name.
