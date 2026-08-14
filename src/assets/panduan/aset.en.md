# Assets

Registering company property and tracing its depreciation.

An asset is something of value used over several years — heavy equipment,
vehicles, large tools. Consumables and small supplies are not assets; those are
recorded as ordinary Purchases.

## When something counts as an asset

The test is not price but **useful life**. Something consumed within one
project is a cost. Something still in use on the next project is an asset.

Assets are usually bought through a **5.1.1 (Asset purchase)** PO. That PO
number is what you reference when registering the asset here.

## Registering an asset

Every field is required except the sale details.

| Field | Notes |
|---|---|
| Asset name | The name it's known by on site |
| Description | Enough detail to tell it apart from similar units |
| Brand | For example: XCMG, Komatsu |
| Asset type | Fixed asset / Equipment / Tools |
| Location | Where the item is kept |
| Depreciation | Useful-life group, see below |
| Purchase order name | The PO the purchase was made under |
| Purchase date | Date of acquisition |
| Value | Acquisition cost |

### Choosing a depreciation group

The options follow the useful-life groups used for tax:

| Option | For |
|---|---|
| 4 years (Group 1) | Tools, small equipment, office devices |
| 8 years (Group 2) | Vehicles, furniture, light heavy-equipment |
| 16 years (Group 3) | Heavy machinery, certain structures |
| 20 years (Group 4) | Buildings and similar |

This choice is more than a label. The wrong group makes every year's
depreciation charge wrong, and that carries all the way into the financial
statements. If you're unsure, ask accounting before saving — don't guess.

## Value and depreciation

The **Value** entered is the acquisition cost, not the current worth. That
figure doesn't change over time; what changes is the book value, and that is
calculated separately in the books.

Worth knowing: **TerraBot stores the depreciation group but does not yet
calculate the depreciation charge per period.** That calculation still happens
in the accounting system. So don't use the asset list here as a basis for book
value.

## Assets that have been sold

The **Sale** section below the form is optional. Fill in **Sale value** and
**Sale date** once the asset has actually been sold.

Don't delete an asset that has been sold. Its history is still needed — to
trace the PO it was bought under, and to work out the gain or loss on disposal.
Marking the sale is enough.

## Viewing and tracing

Click any row to open its details. The three-dot menu offers **Edit asset** and
**View purchase order** — the latter takes you straight to the buying PO, which
is useful when checking the acquisition cost against the original document.

The search box looks through name, brand, type, and PO number at once.
