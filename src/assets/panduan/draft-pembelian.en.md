# Purchase Drafts

Capturing purchase data early, before the paperwork is complete.

A draft is used when a purchase is certain to happen but not everything the
Purchases module requires is available yet — the due date isn't agreed, say, or
the supplier hasn't sent their account details. Enter what you have here, and
complete the rest later through conversion.

## When to use a draft, when to go straight to Purchases

Use **Purchases** directly if the invoice, PO copy, and payment details are all
already in hand.

Use **Purchase Drafts** if they aren't. A draft doesn't demand a due date or
account details, so the data doesn't sit in someone's private notes while the
paperwork catches up.

## Filling in a draft

The fields are fewer than in Purchases:

| Field | Required | Notes |
|---|---|---|
| Description | Yes | A short note on what the purchase covers |
| Tax invoice name | No | 17 characters maximum |
| Supplier | Yes | Pick from the list |
| Date | Yes | Invoice date or date agreed |
| Purchase order name | Yes | Same format as in Purchases |
| Project | Yes | Filled automatically from the PO number |
| DPP, VAT, PBBKB | Yes | Provisional figures are fine; editable at conversion |

The PO number format is exactly the same as in Purchases — sequence number,
document type, project code, then cost type. Project and cost type fill
themselves in as soon as the number matches.

Note: a draft does **not** ask for a due date, attachments, or destination
account. All three are requested only at conversion.

## Converting into a purchase

Once the paperwork is complete, open the draft and choose **Convert to
purchase**.

What happens: the existing data is carried over, and the system then asks for
the parts that were never filled in — due date, attachments, and payment
details. DPP, VAT, and the other figures can still be corrected at this stage,
so provisional numbers in the draft are not a problem.

After conversion the record lives on as an ordinary Purchase and follows every
rule in the Purchases guide — including the Ready status, which cannot be
undone.

## Deleting drafts

A draft for a purchase that fell through is better deleted than left to pile
up. Drafts left hanging for a long time make the list hard to read and easy to
confuse with the ones genuinely waiting on paperwork.
