# Projects

Project master data: code, client, schedule, and contract value.

The project code appears on nearly every document — purchase orders, purchases,
reimbursements, sales invoices. This menu is what gives those codes meaning:
what the job is called, who the client is, and what the contract is worth.

## The project code cannot be changed

This is the most important thing.

The code is the **only link** between a project and every document that
mentions it. Changing it severs every purchase, PO, and invoice referencing the
old code — with no error at all, just documents that suddenly have no parent.

That's why the code is locked once a project is created. Check the spelling
before saving. A project whose code is already wrong has to be deleted and
recreated, as long as no document is using it yet.

## Creating a project

| Field | Notes |
|---|---|
| Project code | 4–5 characters, uppercase, cannot be changed |
| Project name | The full name of the job |
| Client | The party commissioning it |
| Start & end date | The contract schedule |

Project creation is limited to level 4 and above, precisely because the code
can't be corrected afterwards.

## The three project states

| State | Meaning |
|---|---|
| **Running** | Work is still active |
| **Completed** | Work has finished |
| **Cancelled** | Work was cancelled before completion |

A cancelled project is **not deleted**. Costs already incurred against it stay
recorded in purchases and reimbursements; if the project were deleted, those
costs would be orphaned — counted in the company total with no project to
belong to.

Marking a project completed or cancelled also tidies the code picker: both
still appear as options, but sorted to the bottom and labelled.

## Contracts and addenda

The contract value is **not a single typed number** but the sum of the
documents on the project detail page.

Add one row for the original work order, then one more for each addendum. The
history of changes stays intact — and in an audit year, "why does the contract
value differ from the original work order" is a question that has to be
answerable with documents.

### Filling in one contract document

| Field | Notes |
|---|---|
| Document number | The work order or addendum number |
| Type | Work order or Addendum |
| DPP | Tax base, excluding VAT |
| VAT | Percentage |
| WHT | Optional, picked from the tax object list |
| Date | The document date |

Enter **DPP**, not the amount inclusive of VAT. The summary below the form
shows the VAT figure, the document value, and the amount received after
withholding — check all three before saving.

**An addendum that reduces the scope is entered as a negative.** The contract
value drops with it, and the trail of the reduction stays readable.

## Contract value in reports uses DPP

The Project Report calculates margin from **DPP**, not the gross amount. VAT is
money held for the state, not income — using the VAT-inclusive figure makes
every project's margin look about eleven per cent larger than it is.

That's enough to make a project that is actually running at a small loss appear
profitable.

## Two views in the Project Report

**Overview** answers *where the money went*: the cost composition per category,
and each category can be opened to see the breakdown per supplier.

The bar at the top shows how the contract value splits between cost and margin,
as percentages. Figures below eight per cent are deliberately hidden from the
bar — on a narrow segment the text is clipped and becomes unreadable anyway.
The rupiah values remain in the legend below.

If cost exceeds the contract value, the bar turns red and shows by how much it
is exceeded.

**Weekly flow** answers what Overview can't: *when* the money went out, and
whether billing is keeping up.

Weekly rather than monthly, because projects here generally run short — monthly
would produce only three or four bars and show nothing about the pace.

Things to note here:

- **Weeks start on Monday.** Site work and billing follow the working week;
  cutting on Sunday would split one working week into two bars.
- **Weeks with no transactions are still shown.** Skipping them makes a
  three-week gap look as tight as two consecutive weeks — and it's precisely
  that gap which signals work has stopped.
- **Cumulative cost** is compared against the contract value. If the line is
  already near the limit while the work is only half done, that shows up now
  rather than after it's exceeded.
