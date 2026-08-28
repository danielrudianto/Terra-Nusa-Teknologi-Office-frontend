# Expenses

Recording spending that isn't the purchase of goods for a project.

Expenses cover operating costs: rent, utilities, fuel, salary-related items,
fines, bank charges, and the like. If what you bought is goods for a project
with a PO number, that belongs in **Purchases**, not here.

## The flow

Three steps in order, shorter than Purchases because expenses have no required
attachments.

**Metadata → Value → Payment details**

## Step 1: Metadata

| Field | Required | Notes |
|---|---|---|
| Invoice name | No | Fill in if there's a formal invoice |
| Receipt name | No | Fill in if the proof is a receipt |
| Description | Yes | Explain what the expense is for |
| Expense type | Yes | Determines the accounting bucket |
| Counterparty | No | The party receiving payment |
| Date | Yes | Pre-filled with today |
| Due date | Yes | Pre-filled with today |

Invoice name and receipt name are both optional, but don't leave both empty
when proof exists — those numbers are what people search for in the list.

### Choosing an expense type

The expense type decides which account this lands in, so a wrong choice carries
through to the reports. The options include:

Administration · Advertising · Asset maintenance · Asset purchase ·
Employee costs · Equipment rental · Fuel · Health · Interest ·
Logistics · Fines · Social & community · Prepaid rent ·
Utilities · Software · Rounding · Transport · Social media ·
Recruitment · Training · Labour · Materials · Other

Avoid **Other** when a more precise type exists. Expenses piling up under Other
make the reports unreadable.

## Step 2: Value

| Field | Notes |
|---|---|
| DPP | Required, at least 0.01 |
| PBBKB | Enter 0 if not applicable |
| WHT code, WHT object name, WHT percentage | For expenses subject to withholding |
| Total | Calculated automatically |

If the expense is subject to withholding tax, the amount transferred will be
smaller than the Total — the same as in Purchases.

## Step 3: Payment details

Destination account: bank name, account name, account number, and payment
method (Bank transfer, Virtual Account, or Cheque).

The **Create payment slip** switch produces a slip as soon as the expense is
saved, without going back in through the Payments menu.

## Add administration expense (quick)

The **Add administration expense** button at the top of the Expenses page is a
shortcut for recording a **bank administration fee** — the charge that appears
whenever there is an outgoing transfer to a different bank. Its fields are
short: date, amount, and **origin account**.

Pick the origin account from the list — BRI, Mandiri, or any registered
account. The bank name, account name, and number follow the chosen account
automatically, so the fee is recorded against the correct account.

> The calendar helps remind you: on a day with an interbank transfer, the
> banner in the Payment Calendar shows the estimated admin fee together with a
> reminder to record it here.

## After saving

From the Expenses list, click any row to see its details — value breakdown,
payment history, and destination account.

The three-dot menu at the far right offers **View expense** and **Create
payment**. Creating a payment only appears for those with Outgoing Payments
access.

The list can be filtered by date range, and the search box looks through
invoice number, receipt, PO, counterparty, and tax invoice at once.
