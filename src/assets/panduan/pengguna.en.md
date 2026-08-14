# Users

Creating accounts, and setting access levels, divisions, and special
permissions.

This menu decides who can see and change what. Getting it wrong doesn't just
hide a screen — it can let someone open data they shouldn't see.

## Creating an account

| Field | Notes |
|---|---|
| Name | Full name |
| Email | Used to sign in, must be unique |
| Password | 6 characters minimum |
| Access level | Determines how far they may act |

The password entered here is only for the first sign-in. Afterwards the user
can change it themselves through **Settings → Security**, without going through
an administrator.

## Access levels

| Level | Title | Roughly what they may do |
|---|---|---|
| 1 | Staff | Read and create day-to-day documents |
| 2 | Supervisor | Adds the authority to change |
| 3 | Manager | Approve some documents |
| 4 | General Manager | Approve, delete, create master data |
| 5 | Directors & Owner | The whole system, without limit |

Levels are cumulative: a higher one includes everything below it. Each module
sets its own level requirement per action — reading projects needs only level
1, for example, while creating and changing them needs level 4.

## Divisions

Level decides **how far**; division decides **in which area**.

A user with a division sees only their division's modules, plus the general
modules everyone uses. A user with no division at all isn't restricted by area
— only by level.

Two things to watch:

**A division with no modules yet locks rather than opens.** Putting someone in
an empty division leaves them seeing only the home page and the calendar. The
screen marks such divisions; don't pick one unawares.

**Levels 5 and 4 are not given a division.** The owner genuinely needs to see
the whole system, and the General Manager's remit is the entire company rather
than one division. Giving either a division only looks like a restriction
without being one.

**Salary slips and employee records are the exception.** Both open only to the
HRD and FAT divisions, whatever the level. A General Manager cannot open them
on seniority alone.

If access is genuinely needed, grant it through the HRD division or a specific
permission. That leaves a decision recorded in the audit trail — whereas access
that opens by itself was never decided by anyone.

## Special permissions

Below the division sits **Special permissions** — per-module, per-action
exceptions for one person.

Use as few as possible. A special permission isn't visible from the level or
the division, so when someone else checks "why can they open this", the answer
isn't in the place they'd normally look. If the need keeps recurring for many
people, what should change is the division, not another one-off exception.

The **Result** and **Reason** columns show the final decision for that
module-and-action combination — useful for confirming that a newly added
exception really takes effect.

## Deactivate, don't delete

For someone who no longer works here, **deactivate** the account. Don't delete
it.

Documents they created still carry their name in the activity history. Deleting
the account makes that trail point at a user who doesn't exist, and the
question "who created this PO" stops having an answer.

## If someone can't see a particular menu

Check in this order:

1. **Is their level high enough?** Compare it against the module's requirement.
2. **Does their division cover that module?** Anyone with a division is
   restricted by area.
3. **Have they signed in again?** Permission changes are only picked up on the
   next sign-in.

If all three are right and the menu still doesn't appear, the module has
probably not been mapped to any division yet — that needs fixing on the system
side, not on this screen.
