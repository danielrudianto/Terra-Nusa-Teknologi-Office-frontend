# Payment Calendar

Seeing the payment schedule by day, checking the balance covers it, then
approving in one go.

The calendar answers a question that's hard to answer from an ordinary list:
**which days are heavy, and does the account balance cover them all.**

## Monthly view

Each date shows three figures: **Outgoing**, **Incoming**, and **Balance**.
Useful for spotting a crowded day before promising a payment date to a
supplier.

Click a date to open that day's detail.

## Daily detail

Here the day's payments are grouped by bank account. Pick an account on the
left, and its payment list appears on the right.

Each payment can be ticked. The ticked ones are summed under **Total amount**,
and can be approved or rejected together.

### Opening balance, closing balance, and shortfall

The balance section shows:

| Line | Meaning |
|---|---|
| Opening balance | The account balance before that day's payments |
| Est. transfer fees | Estimated transfer charges |
| Closing balance | What's left after the selected payments and their fees |
| Short | Appears when the balance doesn't cover it |

**If "Short" appears, don't approve.** A transfer the bank rejects for
insufficient funds is still recorded as approved in the system while the money
never moves — and that gap only surfaces at reconciliation.

Reduce the selection, or move some of it to another date first.

### Estimated transfer fees

The banner above the list says how many transfers go to other banks and what
each costs. Transfers within the same bank are free.

The figure is an **estimate**, not the actual cost. Where a transfer's
destination bank hasn't been filled in, the system assumes it is chargeable —
better to overestimate than under, because the dangerous case is a balance that
turns out not to cover it.

## Moving a payment date

The **Move payment date** menu shifts a payment's due date to another day. Use
this rather than rejecting and recreating — the source document stays the same
and the trail isn't broken.

## Approving in bulk

Bulk approval asks you to tick a statement before the button becomes active.
That's deliberate: approving ten payments at once carries the same weight as
approving them one by one, and it's easier to overlook something.

Before approving, check three things:

1. The account is right — payments are grouped by account, and it's easy to mix
   up if you hold several accounts at the same bank
2. The balance covers it, with no "Short" marker
3. What's ticked is what you meant

Rejection **cannot be undone**. A payment once rejected has to be recreated
from its source document.

## Agenda: birthdays and reminders

Unlike the payment calendar, **Agenda** holds personal notes and colleagues'
birthdays. There's no money in it.

The Agenda card on the Dashboard shows only the next seven days. The calendar
button in the card's corner opens the full monthly view — what falls on which
date, and what next month looks like.

Click a date to see its detail, and the **Add on this date** button creates a
reminder with the date already filled in.

Reminders can be clicked to edit. Birthdays can't — that data comes from Master
Data Employees, so corrections go there.

**Birthdays of employees who are no longer active are not shown.** What decides
this is the last working date on the employee record: once it's filled in, the
birthday stops appearing.

Agenda isn't in the side menu. This page is personal, and the way in is through
the Dashboard card.

## What the calendar doesn't do

The calendar doesn't make transfers. Approval here marks that a payment may be
executed; the transfer itself is still done through the bank as usual.
