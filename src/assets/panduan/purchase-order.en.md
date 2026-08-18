# Purchase Orders

Ordering goods from a supplier, before the bill arrives.

A Purchase Order is the formal ordering document sent to a supplier. Once the
goods arrive and the invoice is issued, the bill is recorded through the
**Purchases** menu, referencing this PO number.

> Note: this guide covers eight PO types so far — **A, C, D, F, G, 5.1.1,
> 5.1.6, and 6.3.2**. The other types are still being developed and are
> deliberately undocumented so the guide doesn't mislead.

<a id="jenis-yang-sudah-tercakup"></a>

## Types covered here

This guide covers **eight of the sixteen** PO types. The rest — B, H, 5.1.1.2,
5.1.2, 6.4.1, 6.4.2, 6.5.1, 6.5.2 — are deliberately left out rather than
explained halfway; their forms follow the same pattern, and their specific
fields are labelled on screen.

The first five use the same form; what differs is only the extra fields at
the end. The last three have a different shape and are explained in their own
sections.

| Code | For | Extras |
|---|---|---|
| **G** | Project supporting equipment and supplies | None |
| **5.1.1** | Asset purchase | None |
| **5.1.6** | Office documents and stationery | None |
| **C** | Fuel | PBBKB, Article 22 WHT, fuel analysis report |
| **F** | Materials | Material type and quality testing |
| **A** | Delivery services | Transport mode, insurance, delivery rows |
| **D** | Manpower | Wage components and their payment schedules |
| **6.3.2** | Promotional merchandise | Sample approval, late penalty |

Because G, 5.1.1, and 5.1.6 have identical forms, what decides the choice is
the **cost account**, not the look of the form. Site supporting goods go under
G, assets recorded as property under 5.1.1, and office needs under 5.1.6.

<a id="bagian-yang-sama-di-semua-jenis"></a>

## Sections common to every type

### Supplier and project

Pick the supplier from the list; name, address, city, and tax ID fill in
automatically. Then enter the project code bearing this purchase.

### Delivery method

Two options, and this choice changes the address label below it:

- **Franco** — goods delivered to site. The field becomes *delivery address*
- **Loco** — goods collected. The field becomes *collection address*

Choosing wrong here makes the printed clause say the wrong thing about who
bears the freight cost.

### Contacts

Two pairs: **Supplier contact** and **Office contact**, each with a name and
phone number. These are what get printed and called when there's a delivery
problem, so don't enter someone who can't be reached.

### Payment terms

| Code | Meaning | Credit period | Prepaid |
|---|---|---|---|
| `CBD` | Cash before delivery | off | off |
| `COD` | Cash on delivery | off | off |
| `PPD` | Prepaid | on | on |
| `CR` | Credit | on | off |
| `CRD` | Credit with prepaid | on | on |

The **Credit period** and **Prepaid** fields switch themselves on or off
according to the term chosen. If one is locked and reads zero, that's how it
should be — it isn't a field someone forgot.

### Item list

Add one row per item: name, unit, quantity, and unit price. Subtotal and total
are calculated automatically.

### VAT

The **VAT 11%?** switch decides whether VAT is added.

The unit price you type is the **tax base** — VAT is calculated on top of it,
not included in it. If the supplier's price already includes VAT, work
backwards before typing, or the figure comes out 11% too high.

### Terms and additional points

The standard clauses print automatically according to the entries above —
delivery mode, terms, and PO type. There's no need to retype them.

The **Additional points** section is only for special agreements outside the
standard terms. Leave it empty if there are none.

<a id="khusus-c-bahan-bakar"></a>

## Type C — Fuel

Two extra fields in the value section:

- **PBBKB** — entered as a percentage, applied to the subtotal
- **Article 22 WHT** — entered as an amount, not a percentage

Note the difference: one is a percentage, the other is rupiah. Swapping them
throws the total far off.

There is also a **Require Fuel Analysis Report & Calibration Certificate**
tick. When ticked, two extra clauses print on the document. Untick it only if
it has genuinely been agreed as unnecessary.

<a id="khusus-f-material"></a>

## Type F — Materials

Choose the **Material type** first, because this choice determines which
agreement points are generated:

| Option | Document printed |
|---|---|
| Concrete (ready mix) | Purchase Order |
| Steel | Purchase Order |
| Other material | Purchase Order |
| Cylinder compression test | **Work Order (SPK)** |
| Steel tensile & bend test | **Work Order (SPK)** |
| Soil test | **Work Order (SPK)** |

**The last three are not purchases of goods but services.** Their document
prints as a **Work Order (SPK)**, and the number itself uses `SPK` rather than
`PO`. Don't be surprised that the title differs — that's intended.

Before issuing, the confirmation screen shows the **document type in capitals**
— for example `PURCHASE ORDER — Other material`. Read that line. Picking the
wrong material type means the vendor signs a document with the wrong title, and
that can only be corrected in the database.

Once the PO is saved, the **material type cards are locked**. Unselected cards
appear dimmed and cannot be pressed; the selected one stays readable so it is
clear which applies.

### Testing service fields

Number of specimens, price per specimen, and how many days until the report.

**Test types are chosen as pills**, not typed comma-separated — type, then pick
from the list; remove a wrong one via the cross on its pill.

**Specimen transfer** replaces Franco/Loco for testing services: whether the
laboratory *collects* the specimens or AKN *sends* them. A single address field
follows that choice.

The unit adjusts itself: **specimen** for concrete and steel tests, **sample**
for soil tests.

For concrete and steel supply there's a quality-testing tick. When enabled, the
clause "the seller replaces goods that fail quality testing" is printed. For
concrete specifically there's a **who bears the testing cost** option: buyer or
seller. Agree this up front, because it's hard to renegotiate once the PO is
issued.

There are also two optional dates: **deliver before** and **pay before**. Leave
them empty if no firm date was agreed.

<a id="tipe-a-jasa-pengiriman"></a>

## Type A — Delivery services

For paying a haulage service, not for buying the goods. What's billed is the
freight cost.

### Delivery rows

Unlike the other types, the main entry isn't a goods list but a **delivery
list** — one row per journey. Add as many as are being billed.

Each row holds the transport mode, delivery date, origin, destination, and
value. The remaining fields **change with the mode**:

| Mode | What's asked for |
|---|---|
| **Land** | Vehicle, plate number, driver's name and ID |
| **Sea** | Service provider, container number |
| **Air** | Service provider, AWB or waybill number |

The vehicle is only required for land transport. Choose sea or air and the
field releases itself — it isn't left behind as an empty requirement.

Volume and unit follow how the vendor bills. Air courier work is often billed
per kilogram rather than as a lump sum, so the unit can be changed per row.

### Insurance and risk

This is the section most often skipped, though it's what decides who bears
the loss if goods are damaged.

**Require insurance document** switches on the clause obliging the vendor to
hand over the policy. Turned off, the clause doesn't print at all — so don't
turn it off merely because the policy hasn't arrived when the PO is made.

**Delivery risk** and **unloading risk** are agreed up front. Once the PO is
issued, both are hard to renegotiate precisely when they're needed.

<a id="tipe-d-tenaga-kerja"></a>

## Type D — Manpower

One work order per **one worker**. If you're contracting several people,
create a separate work order for each — the names and wage components differ,
and a document covering both can't serve as the basis for paying either.

### Wage components

Wages aren't entered as a single figure. Add one row per component — daily
wage, meal allowance, allowances, overtime — each with its own amount and
payment schedule.

They're separated because the schedules often differ: the daily wage is paid
weekly while the allowance is monthly. Merged, one of them is certain to print
with a schedule nobody agreed to.

### The four payment schedules

| Schedule | Meaning |
|---|---|
| **Weekly** | Paid each week on a given day |
| **Same month** | Paid each month on day X, that same month |
| **Following month** | Paid each month on day X of the month after |
| **Twice monthly** | Cut-off on day X and at month end |

Each schedule has its own **cut-off** — the boundary of the work period being
counted. The next period starts automatically the day after, so no day is
counted twice or missed.

On the twice-monthly schedule the second cut-off is always **month end** —
that's what distinguishes it from an ordinary monthly schedule. The payment
date isn't written as a number, because it depends on which day the cut-off
falls.

### Clause switches

Several agreement points are switched on as agreed: transport home, home
leave, equipment escort, shift terms, and the Sunday policy.

Those switched off are **still printed, struck through** rather than removed.
That's deliberate: a reader can see the point was deliberately not used, not
merely forgotten.

<a id="tipe-632-merchandise-promosi"></a>

## Type 6.3.2 — Promotional merchandise

For procuring promotional goods — shirts, tumblers, umbrellas, and the like.
Different from 6.3.1, which covers advertising services.

Goods and services are **never mixed in one order**. The kind is chosen up
front and drives the whole shape of the line editor.

### Sample approval

**Require sample approval** switches on the point that mass production may
only begin once a sample has been approved.

Leave it on unless genuinely agreed otherwise. Without that point, a thousand
items already printed in the wrong colour have no basis for rejection.

### Late penalty

Off by default. If switched on, fill in both figures: **per mille per day**
and the **maximum cap** as a percentage.

The cap matters. Without one, a penalty that keeps running could in theory
exceed the order's own value — and a clause like that usually turns out to be
unenforceable.

### Delivery

Because merchandise is goods, the Franco/Loco clause, address, and both
parties' contacts apply — the same as any other goods procurement.

<a id="memeriksa-dokumen-sebelum-diterbitkan"></a>

## Suggested withholding-tax code

When choosing the withholding-tax code, the **code usually used for that PO
type appears at the top** of the list, along with the reason. It disappears as
soon as you start searching, so it never blocks someone looking for a different
code.

The suggestion is **not a ruling**. The correct code depends on the shape of
the transaction, not just the PO type — qualified construction services use
Article 4(2), while other services use Article 23. When unsure, ask FAT.

<a id="memeriksa-dokumen-sebelum-diterbitkan"></a>

## Checking the document before issuing

Two buttons below the form, and both show the same document.

**Preview** opens the document without saving anything. Its number still reads
*(DRAFT — NOT ISSUED)*, because the real number is only assigned on saving.
Open it as often as you like; the form doesn't change.

**Create Purchase Order** also shows the document first, but the issue button
stays locked until the statement *"I have read and checked the entire contents
of this document"* is ticked.

That lock is deliberate. Once a PO is issued its number is used and its
contents cannot be changed — the only fix is to cancel and reissue, and a copy
already sent to the supplier can't be pulled back. Reading one screen before
clicking is far cheaper than cancelling afterwards.

<a id="salah-pilih-jenis-po"></a>

## Picking the wrong PO type

The **Change type** button at the top reopens the type picker, without needing
the browser's back button.

If anything has already been typed, a confirmation appears first — changing
type means changing form, and existing entries aren't carried over.

<a id="kode-proyek-pada-tipe-g"></a>

## Project code on type G

Type G attaches to a specific project, so **PUSAT is not available** in its
picker. Office costs not tied to a project are recorded under a different type.

Older documents that already carry the PUSAT code still read correctly when
opened — only the suggestions are filtered, not the data.

<a id="setelah-po-terbit"></a>

## After the PO is issued

The issued PO number is used when recording its bill in the **Purchases** menu.
The format must match exactly, because Purchases validates the pattern and
fills in the project and cost type from the number's segments.

<a id="cap-draft-pada-dokumen-yang-belum-disetujui"></a>

## The DRAFT watermark

A purchase order that has not been approved can still be printed — and needs to
be, for checking before signature. Its pages carry a slanted **DRAFT**
watermark behind the content.

Without it, a draft sheet and an approved one are indistinguishable once they
leave the printer: identical in shape, signature block included. A single draft
reaching a vendor is enough to be treated as binding.

The watermark disappears on its own once the document is approved. Nothing
needs to be set.

<a id="adendum"></a>

## Addenda

A change to an approved purchase order is issued as an **addendum**, not by
editing the original.

The reason is simple: the original has already been signed by the vendor.
Changing its contents means the sheet the vendor holds no longer matches what
the system stores.

The **Create addendum** button appears in the purchase order view dialog, and
only on approved documents.

### What is locked

Supplier, project, and material type **cannot be changed**. All three determine
the document's shape and number; changing them makes it an entirely different
document, not an addendum.

Locked fields are shown disabled rather than hidden — so it is visible that
their values are inherited from the parent.

### Volume is the DIFFERENCE

The volume column is cleared, and its heading reads **Volume Added / Reduced**.

What goes in is the change, not the resulting volume. Adding 5 m³ is written
`5`, not the total after the addition. Reductions are written negative and may
not exceed the unused remainder.

### Numbering

An addendum uses its parent's number with an insert: `013-PO-BPBP-F` becomes
`013-ADD1-PO-BPBP-F`. The sequence is computed by the server, not typed.

### Printing an addendum

An addendum always prints **together with its parent and any earlier addenda**
in one file. An addendum holds a difference; read alone, it does not state the
state of the work.

Addenda issued **afterwards** are not included — a sheet already signed does
not change its contents.

<a id="unduh-hasil-rekap"></a>

## Download the recap

The **Download recap** button at the top right of the list produces a recap of
every purchase order in a project. The project is chosen inside the dialog, not
taken from whatever filter is active on screen.

Two formats are available, and they are **not copies of one another**:

| | Contents | For |
|---|---|---|
| **Excel** | Overview, per-item detail, per-document | Filtering, summing, processing |
| **PDF** | Overview and per-document | Reading and sending |

The PDF deliberately omits per-item detail: hundreds of item rows become pages
that help nobody read them.

The recap covers **every** document in that project, drafts included. Status is
marked on each row, and a draft is neither approved nor binding.

Equipment mobilisation and demobilisation appear as their own rows, exactly as
on the signed document. The row sum therefore matches the document value
exactly — should they ever differ, the **Check** column on the Per Document
sheet will flag it.
