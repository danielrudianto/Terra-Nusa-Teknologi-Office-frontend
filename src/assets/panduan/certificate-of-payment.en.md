# Certificate of Payment (CoP)

A progress report against an SPK — the basis for billing work that is carried
out in stages.

A Certificate of Payment records the **volume of work completed** on an SPK
(work order), then calculates the amount billable against it. One SPK can have
many CoPs — one for each progress period (weekly, per term, and so on).

> Important: a CoP is only for an **SPK**, not for a goods purchase order.
> Goods are received once and billed once through the **Purchases** menu;
> weekly progress against them means nothing. Types **A** and **D** are also
> excluded — their billing is handled by another path.

<a id="alur-empat-tahap"></a>

## The four-stage flow

This is the most important part. A CoP passes through **four stages** with
**two approvals**, and each stage is handled by different hands — on purpose,
so that whoever records the progress is not the one who confirms it is valid,
nor the one who fills in its price, nor the one who issues its bill.

| Stage | Who | What they do |
|---|---|---|
| **1. BAP created** | Field (engineering **level 1**) | Fills in the work **volume**. Prices never reach here. |
| **2. Approve BAP** | **Level 4 and above** | Confirms the field progress. Only **after this** may prices be filled. |
| **3. CoP created** | Reviewer (engineering **level 2**+) | Fills in **prices & deductions** (down payment, retention, penalty, additions). |
| **4. Approve CoP** | **Level 4 and above** | Approves the final amount. After this it is **ready to bill**. |

The two approvals (BAP and CoP) **cannot be done by the same person**, and not
by its own creator. This is what preserves the "second pair of eyes" over each
document.

BAP and CoP are **two documents** in one file: the **BAP** states WHAT WAS
DONE (volume, taken to the field for inspection), the **CoP** states HOW MUCH
IS PAID. That is why each has its own "Created by" and "Approved by".

<a id="mengisi-volume"></a>

## Stage 1 — filling in volume (field)

The field worker opens an approved SPK and fills in the **volume** of each work
line for this period. Only volume and remaining budget are shown — the **unit
price is never sent to the field screen**, so no one there can read it.

Every line has a **budget (pagu)**: the line's contract volume minus what other
CoPs have already certified. Volume exceeding the remaining budget is
**rejected** — if the work genuinely grew, the SPK must be **amended** first
(an amendment is a separate document holding the difference, with its own
lines).

The work period (start–end date) is **required**. If it overlaps another CoP on
the same SPK, the system **warns** — but does not block, because re-certifying
after a correction sometimes does reuse the same range.

<a id="setujui-bap"></a>

## Stage 2 — Approve BAP

Once the volume is correct, **level 4 and above** presses **Approve BAP**. This
confirms the field progress really happened. Before this step:

- Prices and deductions **cannot** be filled at all.
- Volume **can still** be edited.

After the BAP is approved, the volume is locked (to change it, cancel the BAP
approval first).

<a id="buat-cop"></a>

## Stage 3 — Create CoP (fill prices & deductions)

This is where the **rupiah value first appears**. The reviewer (engineering
level 2 and above) opens the CoP sheet and fills in the **deductions** and
**additions**:

| Deduction | For |
|---|---|
| **Down payment** | Amortising the advance paid up front. |
| **Retention** | Held until the maintenance period ends. |
| **Penalty** | Lateness or quality. |
| **Other** | The unexpected (a note is required). |

Additions are for costs **outside the contract** (reimbursed freight,
unexpected mobilisation). Additions **may not** carry work volume — work that
grows still goes through an amendment.

> **WHT (PPh)** is deliberately **not** in the CoP deduction list. It is
> withheld once on the **Purchase**, not here. On the CoP sheet, WHT still
> **appears** as a note of the applicable rate, but is not summed into the
> deductions — so it is not withheld twice.

Down-payment and retention deductions have a **budget**: their total return may
not exceed what was actually paid/agreed. The system computes the suggested
amount proportionally.

<a id="setujui-cop"></a>

## Stage 4 — Approve CoP

**Level 4 and above** (not the one who approved the BAP) presses **Approve
CoP**. From here the CoP is **ready to bill**, and its deductions/additions are
locked — the approved value is the value that will be billed.

<a id="penomoran"></a>

## Numbering

The CoP number is built automatically with the pattern:

```
[sequence]-[vendor ID]-[project code]-[year]
```

For example **`002-042-R501-2026`** — the second CoP for vendor 42 on project
R501 in 2026. The sequence runs **per vendor + project**, and the vendor ID is
padded to three digits. This number prints as both **No. CoP** and **No. BAP**
on the file.

<a id="mencetak"></a>

## Printing

- The **BAP** can be downloaded **at any time**, even before processing — it
  states volume, not value, and that is exactly the sheet taken to the field
  for inspection.
- The **CoP** can only be downloaded **after it is created** (prices &
  deductions filled) — before that the numbers have not been reviewed by
  anyone, and a sheet that leaves the printer early cannot be told apart from a
  correct one.

Level 1 (field) cannot download the CoP sheet: it contains unit prices and the
contract value.

<a id="dari-ponsel"></a>

## Approving from the phone

Both approvals — **Approve BAP** and **Approve CoP** — can be done from the
mobile app via the **CoP Approval** menu. Whatever is awaiting a decision
appears with its stage marker ("Awaiting BAP approval" / "Awaiting CoP
approval"). Filling in prices stays on the office computer — a wide,
many-columned budget table cannot be filled correctly on the move.

<a id="menagihkan"></a>

## Billing a CoP

A CoP that is **approved and not yet billed** appears in the **Purchase** form
as a billing basis. One CoP may be the basis of only ONE active purchase —
deleting its purchase reopens the CoP by itself.
