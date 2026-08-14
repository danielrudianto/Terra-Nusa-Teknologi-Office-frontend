# Activity

A record of who changed what, when, and from where.

Every creation, change, approval, rejection, and deletion in TerraBot is
recorded here. The entries are written automatically and cannot be edited or
removed by anyone — including whoever created them.

## When to use this menu

Not for daily reading. You open it when a question can't be answered from the
document itself:

- "This PO's value changed — who changed it?"
- "Who approved this payment?"
- "This record is gone; when was it deleted?"

## Reading a row

| Column | Meaning |
|---|---|
| Actor | Who did it |
| Action | Created, Updated, Approved, Rejected, Deleted, and so on |
| Module | What kind of document |
| IP address | From which device |

Click a row to see the **field changes**: field name, value before, value
after.

For **Created** and **Deleted** actions, the changes panel is usually empty —
there is no "before" at creation, and deletion doesn't alter any value. That's
normal, not a broken entry.

## Filtering

Module and date-range filters are available. To trace one specific document
it's usually faster to open that document and look at its **Change history**
section — same content, already filtered.

## What is deliberately not recorded

Passwords and tokens **never** enter this log. Fields like those are replaced
with `(hidden)` before the entry is saved.

The reason: activity records can be read by anyone with access to this menu,
and a password recorded there is a password leaked.

## The limits of what it tells you

This log records **what changed**, not **why**. The Note column is filled by
the system for only some actions.

If a change needs its reason explained, explain it in the document's own
description — don't expect the activity log to answer that on its own.

Access to this menu is restricted because it covers salary and payment changes.
