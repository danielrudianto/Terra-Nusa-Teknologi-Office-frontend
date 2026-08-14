# Taxation

Pulling tax summaries from data already recorded in the system.

This menu **does not calculate tax payable** and does not replace the books.
What it does is gather figures that already exist in purchases, sales invoices,
and salary slips, then arrange them by month so they can simply be checked.

## How it is used

Choose the **period** — month and year — once on the Tax Centre page. That
period carries into every summary, so there's no need to select it again in
each report.

Then open whichever summary you need.

## The four summaries

| Summary | Source | For |
|---|---|---|
| **VAT** | Purchase data | Input VAT summary |
| **WHT (Purchase)** | Purchase data | Withholding tax deducted on purchases |
| **WHT (Salary)** | Salary slips | Article 21 withholding on employee salaries |
| **Monthly Report** | All modules | A full month across the board |

The **Monthly Report** covers more ground: accounts payable, accounts
receivable, bank movements, assets, loans, purchases, and sales. This is what
usually goes to the tax consultant.

## The figures are only as good as the documents

These summaries read what has already been recorded. If something is wrong
upstream, the summary is wrong too, with no warning at all.

The most common sources:

**Wrong VAT rate chosen.** Freight-forwarding services use 1.1%, everything
else 11%. Getting this wrong carries straight through to the VAT summary.

**WHT code left empty.** A purchase that should have withholding deducted but
whose tax object code was left blank will not appear in the WHT summary, and
the deduction looks as though it never happened.

**Tax invoice not numbered yet.** A sales invoice whose tax invoice number
hasn't been filled in is marked **Invoice not issued** — that isn't a system
error but a reminder that the document is genuinely incomplete.

## Tax status

Sales invoices carry a stage marker:

| Status | Meaning |
|---|---|
| **Invoice not issued** | Tax invoice number not yet filled in |
| **Awaiting payment** | Invoice issued, money not yet received |
| **Withholding slip missing** | Client deducted WHT, slip not yet received |
| **Complete** | All documents and payments in place |

A pile-up of **Withholding slip missing** needs chasing with the client.
Without the slip, the tax already deducted cannot be credited — the company
bears it twice.

## Before handing over to the consultant

Check the following for the period in question:

- No sales invoice still sitting at **Invoice not issued**
- No purchase still at **Pending** that should already be complete
- Withholding slips from clients entered through the Sales Invoices menu

Fixing documents now is easier than explaining the discrepancy later.

## What this menu does not do

It doesn't remit tax, doesn't calculate under- or over-payment, and doesn't
replace the tax return. The figures are raw material for all of that — the
preparation and filing are still done with the tax consultant.
