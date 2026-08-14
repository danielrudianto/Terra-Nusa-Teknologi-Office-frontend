# Loans

Recording the company's debt to a creditor, and repaying it in stages.

This menu is for money that **comes in as debt** — a bank loan, a shareholder
loan, or a financing facility. Incoming money that isn't debt is recorded
through Other Income or Sales Invoices.

## Debt and received are two different figures

This is the most common mix-up, and the form asks for both.

| Field | Meaning |
|---|---|
| **Debt** | The total that must be returned to the creditor |
| **Received** | The money that actually reached the company account |

The two are often not the same. Provision fees, administration charges, or
interest taken up front are usually deducted at source, so a Rp 100 million
loan may land as Rp 97 million. What must be repaid is still Rp 100 million.

Enter **Received** as it appears on the bank statement, not as it appears in
the agreement. If it's set equal to Debt when there were deductions, the
difference is never recorded anywhere.

## Recording a new loan

Three sections on one page.

### Creditor

| Field | Required |
|---|---|
| Creditor name | Yes |
| Creditor address | Yes |
| Creditor tax ID | No |

### Loan details

Date, description, then **Debt** and **Received**. The description should name
the underlying agreement, because that's what people search for when tracing it
later.

### Receiving account

The **company** account the loan funds land in — not the creditor's account.
Choose the bank, then the account name and number.

## Changing it after saving

The **Edit** menu allows corrections to creditor data, description, account,
and **the debt and received amounts**.

The debt figure can't be changed freely: it **must not fall below the amount
already paid**. A debt of Rp 100 million already repaid to the tune of Rp 80
million, then changed to Rp 50 million, means the loan has been overpaid — and
nowhere in the system records the excess, so Rp 30 million vanishes without
trace. Such a change is therefore refused, along with a statement of how much
has been paid.

The hint below the debt field shows the amount already paid, so the lower bound
is visible before saving.

**The paid status is recalculated whenever the value changes.** Lowering the
debt until it equals what has been paid marks the loan settled; raising it
again reverses that. There's no need to set the paid status yourself — and no
way to, because that status is a conclusion drawn from the figures, not a
field.

The loan date remains locked.

The Edit menu only appears for those permitted to change loans.

## Recording a payment

From the list, choose **Create payment**. The fields: payment date (required),
account, and amount.

The amount is pre-filled with the outstanding balance, and a **Pay in full**
button returns it to that figure. For a partial payment, change the number —
but it can't exceed the balance.

This menu is disabled for loans already marked **Settled**.

## Why the balance doesn't drop straight away

A newly recorded payment doesn't necessarily reduce the balance on the detail
page. Only payments that have been **approved** reduce it.

The reason: a payment still awaiting approval may not happen. Counting it
towards settlement makes the debt look smaller than it is — and that's the kind
of error nobody spots, because the figure still looks plausible.

This produces one discrepancy worth knowing about:

- The **balance** on the detail page counts **approved** payments only.
- The **maximum** on the payment form counts **all** payments not yet deleted,
  including those still awaiting approval.

So this can happen: the balance still reads Rp 10 million, but the form refuses
anything above Rp 4 million — because Rp 6 million has already been submitted
and not yet approved. That isn't a miscalculation; the limit deliberately
prevents submitting the same bill twice.

## Viewing details

Click any row to open its details: loan value, outstanding balance, percentage
repaid, creditor data, account, and payment history.

There's also a copy-for-WhatsApp button summarising total debt, amount paid,
balance, and status — useful for answering a creditor's question without both
sides needing the app open.
