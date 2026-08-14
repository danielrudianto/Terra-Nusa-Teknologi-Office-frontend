# Bank Accounts

Register company accounts and trace their movements.

The accounts registered here are the ones offered as choices when you record a
payment, log incoming money, or move funds between accounts. If an account
doesn't appear in a picker, it usually hasn't been registered yet.

## Registering an account

Three fields, all required:

| Field | Notes |
|---|---|
| Bank name | Pick from the list |
| Account name | Owner's name exactly as the bank has it |
| Account number | Digits only, no spaces or hyphens |

Enter the **account name** exactly as the bank shows it, not an internal
shorthand. That name is printed on payment documents, and banks reject
transfers whose names don't match.

Accounts here are **company accounts**. Supplier accounts and the employee
accounts that receive reimbursements are not registered here — both are
entered directly on their own documents.

## Viewing movements

The three-dot menu on each row has **View movements**. It shows, per period:
date, counterparty, document, amount, and running balance.

These movements are **assembled from documents recorded in TerraBot**, not
pulled from the bank. They cover outgoing payments, incoming money, and
transfers between accounts that have already been entered into the system.

Because of that, the movements here **will not match your bank statement
exactly** while documents remain unrecorded. That gap is useful in itself: it
shows which transactions haven't reached the system yet.

## Downloading movements

The **Download** button on the movements screen asks for a month and year, then
produces a file with that period's transactions and running balances. Useful
when reconciling against a bank statement or handing data to a consultant.

## Deleting an account

An account that is no longer used is better left alone than deleted, as long as
old documents still point to it. Payment documents store the account name and
number on themselves, but the trail back to the parent account is broken.

Delete only accounts that were registered by mistake and never used.
